use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

/// Device types
pub const DEVICE_TYPE_SENSOR: u8 = 0;
pub const DEVICE_TYPE_PRO: u8 = 1;
pub const DEVICE_TYPE_MEDICAL: u8 = 2;

/// Data types
pub const DATA_TYPE_MOTION: u8 = 0;
pub const DATA_TYPE_BIOMETRIC: u8 = 1;
pub const DATA_TYPE_PRESSURE: u8 = 2;
pub const DATA_TYPE_MUSCLE: u8 = 3;
pub const DATA_TYPE_MEDICAL: u8 = 4;

/// Register data provider account context
#[derive(Accounts)]
pub struct RegisterDataProvider<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        seeds = [b"data-provider", user_id.as_bytes()],
        bump,
        space = 8 + DataProvider::LEN
    )]
    pub data_provider: Account<'info, DataProvider>,
    
    pub system_program: Program<'info, System>,
}

/// Submit data account context
#[derive(Accounts)]
pub struct SubmitData<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"data-provider", data_provider.user_id.as_bytes()],
        bump,
        constraint = data_provider.authority == user.key() @ BodyDfiError::InvalidAuthority
    )]
    pub data_provider: Account<'info, DataProvider>,
    
    #[account(
        init,
        payer = user,
        seeds = [b"data-submission", data_hash.as_bytes()],
        bump,
        space = 8 + DataSubmission::LEN
    )]
    pub data_submission: Account<'info, DataSubmission>,
    
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

/// Create data listing account context
#[derive(Accounts)]
pub struct CreateDataListing<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"data-provider", data_provider.user_id.as_bytes()],
        bump,
        constraint = data_provider.authority == user.key() @ BodyDfiError::InvalidAuthority
    )]
    pub data_provider: Account<'info, DataProvider>,
    
    #[account(
        init,
        payer = user,
        seeds = [b"data-listing", listing_id.as_bytes()],
        bump,
        space = 8 + DataListing::LEN
    )]
    pub data_listing: Account<'info, DataListing>,
    
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

/// Purchase data access account context
#[derive(Accounts)]
pub struct PurchaseDataAccess<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"data-listing", data_listing.listing_id.as_bytes()],
        bump
    )]
    pub data_listing: Account<'info, DataListing>,
    
    #[account(
        mut,
        seeds = [b"data-provider", data_provider.user_id.as_bytes()],
        bump
    )]
    pub data_provider: Account<'info, DataProvider>,
    
    #[account(
        init,
        payer = buyer,
        seeds = [b"data-access", buyer.key().as_ref(), data_listing.listing_id.as_bytes()],
        bump,
        space = 8 + DataAccess::LEN
    )]
    pub data_access: Account<'info, DataAccess>,
    
    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub provider_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, anchor_spl::token::Token>,
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

/// Data provider account
#[account]
pub struct DataProvider {
    /// Authority (owner) of this data provider
    pub authority: Pubkey,
    
    /// Unique user ID
    pub user_id: String,
    
    /// Device type (0: Sensor, 1: Pro, 2: Medical)
    pub device_type: u8,
    
    /// Number of data submissions
    pub submission_count: u64,
    
    /// Last submission timestamp
    pub last_submission: i64,
    
    /// Total rewards earned
    pub total_rewards: u64,
    
    /// Average data quality score (0-4)
    pub avg_quality_score: u8,
    
    /// Reputation score (calculated from quality and consistency)
    pub reputation_score: u16,
}

impl DataProvider {
    pub const LEN: usize = 32 + 64 + 1 + 8 + 8 + 8 + 1 + 2;
}

/// Data submission account
#[account]
pub struct DataSubmission {
    /// Data provider that submitted this data
    pub provider: Pubkey,
    
    /// Hash of the data (stored off-chain)
    pub data_hash: String,
    
    /// Type of data
    pub data_type: u8,
    
    /// Timestamp of data collection
    pub timestamp: i64,
    
    /// Additional metadata
    pub metadata: String,
    
    /// Quality score (assigned by validators)
    pub quality_score: u8,
    
    /// Whether this data has been validated
    pub is_validated: bool,
}

impl DataSubmission {
    pub const LEN: usize = 32 + 64 + 1 + 8 + 128 + 1 + 1;
}

/// Data listing account
#[account]
pub struct DataListing {
    /// Data provider that created this listing
    pub provider: Pubkey,
    
    /// Unique listing ID
    pub listing_id: String,
    
    /// Array of data types included in this listing
    pub data_types: Vec<u8>,
    
    /// Price per access in tokens
    pub price_per_access: u64,
    
    /// Access period in seconds
    pub access_period: u64,
    
    /// Description of the data being sold
    pub description: String,
    
    /// Number of times this listing has been purchased
    pub purchase_count: u64,
    
    /// Created timestamp
    pub created_at: i64,
    
    /// Whether this listing is active
    pub is_active: bool,
}

impl DataListing {
    pub const LEN: usize = 32 + 64 + 32 + 8 + 8 + 256 + 8 + 8 + 1;
}

/// Data access account
#[account]
pub struct DataAccess {
    /// Buyer who purchased access
    pub buyer: Pubkey,
    
    /// Data listing that was purchased
    pub listing_id: String,
    
    /// Timestamp when access was purchased
    pub purchased_at: i64,
    
    /// Timestamp when access expires
    pub expires_at: i64,
    
    /// Amount paid for access
    pub amount_paid: u64,
    
    /// Whether access is still valid
    pub is_valid: bool,
}

impl DataAccess {
    pub const LEN: usize = 32 + 64 + 8 + 8 + 8 + 1;
}

// Import error code
use crate::errors::BodyDfiError; 