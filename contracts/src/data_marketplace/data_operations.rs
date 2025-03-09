use anchor_lang::prelude::*;
use crate::errors::BodyDfiError;
use crate::data_marketplace::data_state::*;
use crate::data_marketplace::provider_operations::update_provider_reputation;

/// Data submission rate limit in seconds (5 minutes)
const DATA_SUBMISSION_RATE_LIMIT: i64 = 300;

/// Submit data from wearable device
pub fn submit_data(
    ctx: Context<SubmitData>,
    data_hash: String,
    data_type: u8,
    timestamp: i64,
    metadata: String,
) -> Result<()> {
    // Validate data type
    require!(
        data_type <= DATA_TYPE_MEDICAL,
        BodyDfiError::InvalidDataType
    );
    
    // Validate timestamp
    let current_time = ctx.accounts.clock.unix_timestamp;
    require!(
        timestamp <= current_time,
        BodyDfiError::InvalidTimestamp
    );
    
    // Check rate limiting
    let data_provider = &mut ctx.accounts.data_provider;
    require!(
        current_time - data_provider.last_submission >= DATA_SUBMISSION_RATE_LIMIT,
        BodyDfiError::DataSubmissionRateLimitExceeded
    );
    
    // Initialize data submission
    let data_submission = &mut ctx.accounts.data_submission;
    data_submission.provider = data_provider.authority;
    data_submission.data_hash = data_hash;
    data_submission.data_type = data_type;
    data_submission.timestamp = timestamp;
    data_submission.metadata = metadata;
    data_submission.quality_score = 0; // Will be set by validators later
    data_submission.is_validated = false;
    
    // Update provider stats
    data_provider.submission_count = data_provider.submission_count.checked_add(1).unwrap();
    data_provider.last_submission = current_time;
    
    // Update reputation with initial quality score (may be updated later by validators)
    let initial_quality_score = 2; // Medium quality by default until validated
    update_provider_reputation(data_provider, initial_quality_score)?;
    
    // Emit event
    emit!(DataSubmittedEvent {
        provider: data_provider.authority,
        data_hash: data_submission.data_hash.clone(),
        data_type,
        timestamp,
    });
    
    Ok(())
}

/// Validate submitted data (called by trusted validators)
pub fn validate_data(
    data_submission: &mut Account<DataSubmission>,
    data_provider: &mut Account<DataProvider>,
    quality_score: u8,
) -> Result<()> {
    // Validate quality score
    require!(
        quality_score < 5,
        BodyDfiError::InvalidDataQualityScore
    );
    
    // Update data submission
    data_submission.quality_score = quality_score;
    data_submission.is_validated = true;
    
    // Update provider reputation
    update_provider_reputation(data_provider, quality_score)?;
    
    Ok(())
}

/// Event emitted when data is submitted
#[event]
pub struct DataSubmittedEvent {
    pub provider: Pubkey,
    pub data_hash: String,
    pub data_type: u8,
    pub timestamp: i64,
} 