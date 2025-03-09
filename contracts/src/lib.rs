use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use solana_program::{
    program_error::ProgramError,
    pubkey::Pubkey,
};

// Import project modules
pub mod token;
pub mod data_marketplace;
pub mod governance;
pub mod errors;

// Re-export key components
pub use errors::*;
pub use token::*;
pub use data_marketplace::*;
pub use governance::*;

declare_id!("BDFiC3XMQn4DCf3gFJJG9oKxVTXWE79MHBd6rZCvw2xk");

/// Main program module for BodyDFi platform
#[program]
pub mod bodydfi {
    use super::*;
    
    /// Initialize the MOVE token (utility token)
    pub fn initialize_move_token(
        ctx: Context<InitializeToken>,
        name: String,
        symbol: String,
        uri: String,
        decimals: u8,
    ) -> Result<()> {
        token::token_operations::initialize_move_token(ctx, name, symbol, uri, decimals)
    }
    
    /// Initialize the BodyDFi token (governance token)
    pub fn initialize_bodydfi_token(
        ctx: Context<InitializeToken>,
        name: String,
        symbol: String,
        uri: String,
        decimals: u8,
        total_supply: u64,
    ) -> Result<()> {
        token::token_operations::initialize_bodydfi_token(ctx, name, symbol, uri, decimals, total_supply)
    }
    
    /// Register a new data provider (user with wearable device)
    pub fn register_data_provider(
        ctx: Context<RegisterDataProvider>,
        user_id: String,
        device_type: u8,
    ) -> Result<()> {
        data_marketplace::provider_operations::register_data_provider(ctx, user_id, device_type)
    }
    
    /// Submit data from wearable device
    pub fn submit_data(
        ctx: Context<SubmitData>,
        data_hash: String,
        data_type: u8,
        timestamp: i64,
        metadata: String,
    ) -> Result<()> {
        data_marketplace::data_operations::submit_data(ctx, data_hash, data_type, timestamp, metadata)
    }
    
    /// Create a data marketplace listing
    pub fn create_data_listing(
        ctx: Context<CreateDataListing>,
        listing_id: String,
        data_types: Vec<u8>,
        price_per_access: u64,
        access_period: u64,
        description: String,
    ) -> Result<()> {
        data_marketplace::marketplace_operations::create_data_listing(
            ctx, listing_id, data_types, price_per_access, access_period, description
        )
    }
    
    /// Purchase data access
    pub fn purchase_data_access(
        ctx: Context<PurchaseDataAccess>,
        listing_id: String,
    ) -> Result<()> {
        data_marketplace::marketplace_operations::purchase_data_access(ctx, listing_id)
    }
    
    /// Create governance proposal
    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        title: String,
        description: String,
        proposal_type: u8,
        voting_period: u64,
    ) -> Result<()> {
        governance::governance_operations::create_proposal(ctx, title, description, proposal_type, voting_period)
    }
    
    /// Cast vote on governance proposal
    pub fn cast_vote(
        ctx: Context<CastVote>,
        proposal_id: u64,
        vote: bool,
    ) -> Result<()> {
        governance::governance_operations::cast_vote(ctx, proposal_id, vote)
    }
    
    /// Reward data provider with MOVE tokens
    pub fn reward_data_provider(
        ctx: Context<RewardDataProvider>,
        provider: Pubkey,
        amount: u64,
        data_quality_score: u8,
    ) -> Result<()> {
        token::reward_operations::reward_data_provider(ctx, provider, amount, data_quality_score)
    }
} 