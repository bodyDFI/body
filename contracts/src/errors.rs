use anchor_lang::prelude::*;

/// Error codes for the BodyDFi program
#[error_code]
pub enum BodyDfiError {
    #[msg("Invalid authority")]
    InvalidAuthority,
    
    #[msg("Invalid token account")]
    InvalidTokenAccount,
    
    #[msg("Invalid mint")]
    InvalidMint,
    
    #[msg("Invalid data provider")]
    InvalidDataProvider,
    
    #[msg("Data provider not registered")]
    DataProviderNotRegistered,
    
    #[msg("Invalid device type")]
    InvalidDeviceType,
    
    #[msg("Data hash already exists")]
    DataHashAlreadyExists,
    
    #[msg("Invalid data type")]
    InvalidDataType,
    
    #[msg("Invalid timestamp")]
    InvalidTimestamp,
    
    #[msg("Data submission rate limit exceeded")]
    DataSubmissionRateLimitExceeded,
    
    #[msg("Invalid data listing")]
    InvalidDataListing,
    
    #[msg("Data listing already exists")]
    DataListingAlreadyExists,
    
    #[msg("Insufficient funds")]
    InsufficientFunds,
    
    #[msg("Access already purchased")]
    AccessAlreadyPurchased,
    
    #[msg("Access expired")]
    AccessExpired,
    
    #[msg("Invalid proposal")]
    InvalidProposal,
    
    #[msg("Proposal already exists")]
    ProposalAlreadyExists,
    
    #[msg("Voting period ended")]
    VotingPeriodEnded,
    
    #[msg("Already voted")]
    AlreadyVoted,
    
    #[msg("Insufficient token balance for voting")]
    InsufficientVotingBalance,
    
    #[msg("Invalid reward amount")]
    InvalidRewardAmount,
    
    #[msg("Invalid data quality score")]
    InvalidDataQualityScore,
    
    #[msg("Minting cap exceeded")]
    MintingCapExceeded,
    
    #[msg("Cooldown period active")]
    CooldownPeriodActive,
} 