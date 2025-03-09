use anchor_lang::prelude::*;
use crate::errors::BodyDfiError;
use crate::governance::governance_state::*;

/// Create a new governance proposal
pub fn create_proposal(
    ctx: Context<CreateProposal>,
    title: String,
    description: String,
    proposal_type: u8,
    voting_period: u64,
) -> Result<()> {
    // Validate proposal type
    require!(
        proposal_type <= PROPOSAL_TYPE_NEW_FEATURE,
        BodyDfiError::InvalidProposal
    );
    
    let proposal = &mut ctx.accounts.proposal;
    let proposer = &ctx.accounts.proposer;
    let current_time = ctx.accounts.clock.unix_timestamp;
    
    // Use provided voting period or default if zero
    let actual_voting_period = if voting_period > 0 {
        voting_period
    } else {
        DEFAULT_VOTING_PERIOD
    };
    
    // Initialize proposal
    let proposal_id = next_proposal_id();
    proposal.id = proposal_id;
    proposal.proposer = proposer.key();
    proposal.title = title;
    proposal.description = description;
    proposal.proposal_type = proposal_type;
    proposal.created_at = current_time;
    proposal.voting_end_time = current_time + actual_voting_period as i64;
    proposal.yes_votes = 0;
    proposal.no_votes = 0;
    proposal.status = ProposalStatus::Active as u8;
    proposal.is_executed = false;
    
    // Emit event
    emit!(ProposalCreatedEvent {
        proposal_id,
        proposer: proposer.key(),
        title: proposal.title.clone(),
        proposal_type,
        voting_end_time: proposal.voting_end_time,
    });
    
    Ok(())
}

/// Cast a vote on a governance proposal
pub fn cast_vote(
    ctx: Context<CastVote>,
    proposal_id: u64,
    vote_for: bool,
) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    let vote = &mut ctx.accounts.vote;
    let voter = &ctx.accounts.voter;
    let voter_token_account = &ctx.accounts.voter_token_account;
    let current_time = ctx.accounts.clock.unix_timestamp;
    
    // Check if voting period is still active
    require!(
        current_time <= proposal.voting_end_time,
        BodyDfiError::VotingPeriodEnded
    );
    
    // Calculate voting weight based on token holdings
    // In this simple implementation, 1 token = 1 vote
    let voting_weight = voter_token_account.amount;
    
    // Initialize vote
    vote.voter = voter.key();
    vote.proposal_id = proposal_id;
    vote.vote = vote_for;
    vote.weight = voting_weight;
    vote.cast_at = current_time;
    
    // Update proposal vote counts
    if vote_for {
        proposal.yes_votes = proposal.yes_votes.checked_add(voting_weight).unwrap();
    } else {
        proposal.no_votes = proposal.no_votes.checked_add(voting_weight).unwrap();
    }
    
    // Check if voting period has ended and finalize if needed
    if current_time >= proposal.voting_end_time {
        finalize_proposal(proposal)?;
    }
    
    // Emit event
    emit!(VoteCastEvent {
        proposal_id,
        voter: voter.key(),
        vote_for,
        weight: voting_weight,
    });
    
    Ok(())
}

/// Finalize a proposal after voting period ends
pub fn finalize_proposal(proposal: &mut Account<Proposal>) -> Result<()> {
    // Determine outcome
    if proposal.yes_votes > proposal.no_votes {
        proposal.status = ProposalStatus::Passed as u8;
    } else {
        proposal.status = ProposalStatus::Rejected as u8;
    }
    
    // Emit event
    emit!(ProposalFinalizedEvent {
        proposal_id: proposal.id,
        yes_votes: proposal.yes_votes,
        no_votes: proposal.no_votes,
        passed: proposal.status == ProposalStatus::Passed as u8,
    });
    
    Ok(())
}

/// Execute a passed proposal
pub fn execute_proposal(proposal: &mut Account<Proposal>) -> Result<()> {
    // Check if proposal can be executed
    require!(
        proposal.status == ProposalStatus::Passed as u8,
        BodyDfiError::InvalidProposal
    );
    require!(!proposal.is_executed, BodyDfiError::InvalidProposal);
    
    // Mark as executed
    proposal.is_executed = true;
    proposal.status = ProposalStatus::Executed as u8;
    
    // Emit event
    emit!(ProposalExecutedEvent {
        proposal_id: proposal.id,
        executed_at: Clock::get().unwrap().unix_timestamp,
    });
    
    Ok(())
}

/// Event emitted when a new proposal is created
#[event]
pub struct ProposalCreatedEvent {
    pub proposal_id: u64,
    pub proposer: Pubkey,
    pub title: String,
    pub proposal_type: u8,
    pub voting_end_time: i64,
}

/// Event emitted when a vote is cast
#[event]
pub struct VoteCastEvent {
    pub proposal_id: u64,
    pub voter: Pubkey,
    pub vote_for: bool,
    pub weight: u64,
}

/// Event emitted when a proposal is finalized
#[event]
pub struct ProposalFinalizedEvent {
    pub proposal_id: u64,
    pub yes_votes: u64,
    pub no_votes: u64,
    pub passed: bool,
}

/// Event emitted when a proposal is executed
#[event]
pub struct ProposalExecutedEvent {
    pub proposal_id: u64,
    pub executed_at: i64,
} 