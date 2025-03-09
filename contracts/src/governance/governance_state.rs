use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

/// Proposal types
pub const PROPOSAL_TYPE_PARAMETER_CHANGE: u8 = 0;
pub const PROPOSAL_TYPE_FUND_ALLOCATION: u8 = 1;
pub const PROPOSAL_TYPE_DATA_STANDARDS: u8 = 2;
pub const PROPOSAL_TYPE_NEW_FEATURE: u8 = 3;

/// Create proposal account context
#[derive(Accounts)]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub proposer: Signer<'info>,
    
    #[account(
        mut,
        constraint = proposer_token_account.owner == proposer.key() @ BodyDfiError::InvalidAuthority,
        constraint = proposer_token_account.amount >= MIN_TOKENS_TO_PROPOSE @ BodyDfiError::InsufficientVotingBalance
    )]
    pub proposer_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = proposer,
        seeds = [b"proposal", &next_proposal_id().to_le_bytes()],
        bump,
        space = 8 + Proposal::LEN
    )]
    pub proposal: Account<'info, Proposal>,
    
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

/// Cast vote account context
#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"proposal", &proposal_id.to_le_bytes()],
        bump,
        constraint = proposal.status == ProposalStatus::Active as u8 @ BodyDfiError::InvalidProposal
    )]
    pub proposal: Account<'info, Proposal>,
    
    #[account(
        mut,
        constraint = voter_token_account.owner == voter.key() @ BodyDfiError::InvalidAuthority,
        constraint = voter_token_account.amount > 0 @ BodyDfiError::InsufficientVotingBalance
    )]
    pub voter_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = voter,
        seeds = [b"vote", voter.key().as_ref(), &proposal_id.to_le_bytes()],
        bump,
        space = 8 + Vote::LEN
    )]
    pub vote: Account<'info, Vote>,
    
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

/// Proposal account
#[account]
pub struct Proposal {
    /// Unique proposal ID
    pub id: u64,
    
    /// User who created the proposal
    pub proposer: Pubkey,
    
    /// Proposal title
    pub title: String,
    
    /// Proposal description
    pub description: String,
    
    /// Proposal type
    pub proposal_type: u8,
    
    /// Timestamp when proposal was created
    pub created_at: i64,
    
    /// Timestamp when voting period ends
    pub voting_end_time: i64,
    
    /// Number of yes votes
    pub yes_votes: u64,
    
    /// Number of no votes
    pub no_votes: u64,
    
    /// Status of the proposal
    pub status: u8,
    
    /// Whether the proposal has been executed
    pub is_executed: bool,
}

impl Proposal {
    pub const LEN: usize = 8 + 32 + 100 + 1000 + 1 + 8 + 8 + 8 + 8 + 1 + 1;
}

/// Vote account
#[account]
pub struct Vote {
    /// Voter public key
    pub voter: Pubkey,
    
    /// Proposal ID
    pub proposal_id: u64,
    
    /// Vote (true = yes, false = no)
    pub vote: bool,
    
    /// Voting weight (based on token holdings)
    pub weight: u64,
    
    /// Timestamp when vote was cast
    pub cast_at: i64,
}

impl Vote {
    pub const LEN: usize = 32 + 8 + 1 + 8 + 8;
}

/// Proposal status enum
pub enum ProposalStatus {
    Active = 0,
    Passed = 1,
    Rejected = 2,
    Executed = 3,
}

/// Governance configuration constants
pub const MIN_TOKENS_TO_PROPOSE: u64 = 1_000_000_000; // 1,000 tokens with 6 decimals
pub const DEFAULT_VOTING_PERIOD: u64 = 259_200; // 3 days in seconds

/// Get the next proposal ID
pub fn next_proposal_id() -> u64 {
    // For simplicity, we're returning a timestamp-based ID
    // In a production system, this would be stored and incremented
    Clock::get().unwrap().unix_timestamp as u64
}

// Import error code
use crate::errors::BodyDfiError; 