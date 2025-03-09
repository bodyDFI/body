use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo};
use crate::errors::BodyDfiError;
use crate::token::token_state::*;

/// Quality score multipliers for rewards
const BASE_REWARD_MULTIPLIER: u64 = 100;
const QUALITY_SCORE_MULTIPLIERS: [u64; 5] = [80, 90, 100, 110, 120]; // 0.8x to 1.2x

/// Reward a data provider with MOVE tokens
pub fn reward_data_provider(
    ctx: Context<RewardDataProvider>,
    provider: Pubkey,
    amount: u64,
    data_quality_score: u8,
) -> Result<()> {
    // Validate inputs
    require!(amount > 0, BodyDfiError::InvalidRewardAmount);
    require!(data_quality_score < 5, BodyDfiError::InvalidDataQualityScore);
    
    let token_mint = &mut ctx.accounts.token_mint;
    let current_time = ctx.accounts.clock.unix_timestamp;
    
    // Check cooldown period
    require!(
        current_time - token_mint.last_mint_timestamp >= token_mint.mint_cooldown,
        BodyDfiError::CooldownPeriodActive
    );
    
    // Apply quality score multiplier to reward amount
    let quality_multiplier = QUALITY_SCORE_MULTIPLIERS[data_quality_score as usize];
    let adjusted_amount = amount.checked_mul(quality_multiplier)
        .unwrap()
        .checked_div(BASE_REWARD_MULTIPLIER)
        .unwrap();
    
    // Update token mint state
    token_mint.circulating_supply = token_mint.circulating_supply.checked_add(adjusted_amount)
        .ok_or(BodyDfiError::MintingCapExceeded)?;
    
    token_mint.last_mint_timestamp = current_time;
    
    // Create the mint to instruction
    let cpi_accounts = MintTo {
        mint: ctx.accounts.token_mint.to_account_info(),
        to: ctx.accounts.provider_token_account.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    // Mint tokens to the provider
    token::mint_to(cpi_ctx, adjusted_amount)?;
    
    // Emit event
    emit!(RewardEvent {
        provider,
        amount: adjusted_amount,
        data_quality_score,
        timestamp: current_time,
    });
    
    Ok(())
}

/// Event emitted when a provider is rewarded
#[event]
pub struct RewardEvent {
    pub provider: Pubkey,
    pub amount: u64,
    pub data_quality_score: u8,
    pub timestamp: i64,
} 