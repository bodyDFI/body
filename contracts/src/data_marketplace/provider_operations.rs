use anchor_lang::prelude::*;
use crate::errors::BodyDfiError;
use crate::data_marketplace::data_state::*;

/// Register a new data provider
pub fn register_data_provider(
    ctx: Context<RegisterDataProvider>,
    user_id: String,
    device_type: u8,
) -> Result<()> {
    // Validate device type
    require!(
        device_type <= DEVICE_TYPE_MEDICAL,
        BodyDfiError::InvalidDeviceType
    );
    
    let data_provider = &mut ctx.accounts.data_provider;
    let authority = &ctx.accounts.authority;
    
    // Initialize data provider
    data_provider.authority = authority.key();
    data_provider.user_id = user_id;
    data_provider.device_type = device_type;
    data_provider.submission_count = 0;
    data_provider.last_submission = 0;
    data_provider.total_rewards = 0;
    data_provider.avg_quality_score = 0;
    data_provider.reputation_score = 100; // Base reputation score
    
    // Emit event
    emit!(ProviderRegisteredEvent {
        authority: authority.key(),
        user_id: data_provider.user_id.clone(),
        device_type,
    });
    
    Ok(())
}

/// Update data provider reputation
pub fn update_provider_reputation(data_provider: &mut Account<DataProvider>, quality_score: u8) -> Result<()> {
    // Calculate new average quality score based on submission count
    let prev_avg = data_provider.avg_quality_score as u64;
    let count = data_provider.submission_count;
    
    if count > 0 {
        // Weighted average formula: ((prev_avg * count) + new_score) / (count + 1)
        let new_avg = ((prev_avg * count) + quality_score as u64) / (count + 1);
        data_provider.avg_quality_score = new_avg as u8;
    } else {
        // First submission
        data_provider.avg_quality_score = quality_score;
    }
    
    // Update reputation score based on quality and consistency
    // Consistency factor: higher submission count improves reputation
    let consistency_factor = if count < 10 {
        count * 2 // Early submissions have bigger impact
    } else if count < 100 {
        20 + (count - 10) / 2 // Medium impact
    } else {
        65 + (count - 100) / 10 // Smaller incremental impact
    };
    
    // Quality factor: scale 0-4 to 80-120 points
    let quality_factor = 80 + (data_provider.avg_quality_score as u16) * 10;
    
    // Calculate reputation (capped at 1000)
    let reputation = std::cmp::min(consistency_factor as u16 + quality_factor, 1000);
    data_provider.reputation_score = reputation;
    
    Ok(())
}

/// Event emitted when a new provider is registered
#[event]
pub struct ProviderRegisteredEvent {
    pub authority: Pubkey,
    pub user_id: String,
    pub device_type: u8,
} 