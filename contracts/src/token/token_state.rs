use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

/// Token initialization account context
#[derive(Accounts)]
pub struct InitializeToken<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        seeds = [b"token-mint", authority.key().as_ref()],
        bump,
        space = 8 + TokenMint::LEN
    )]
    pub token_mint: Account<'info, TokenMint>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, anchor_spl::token::Token>,
    pub rent: Sysvar<'info, Rent>,
}

/// TokenMint account structure
#[account]
pub struct TokenMint {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub decimals: u8,
    pub total_supply: u64,
    pub circulating_supply: u64,
    pub is_move_token: bool,
    pub last_mint_timestamp: i64,
    pub mint_cooldown: i64,
    pub mint_cap: u64,
}

impl TokenMint {
    pub const LEN: usize = 32 + 32 + 64 + 16 + 200 + 1 + 8 + 8 + 1 + 8 + 8 + 8;
}

/// Reward data provider account context
#[derive(Accounts)]
pub struct RewardDataProvider<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// Data provider receiving the reward
    /// CHECK: Validated in the handler
    pub provider: AccountInfo<'info>,
    
    /// Move token mint account
    #[account(
        mut,
        constraint = token_mint.is_move_token @ BodyDfiError::InvalidMint,
        constraint = token_mint.authority == authority.key() @ BodyDfiError::InvalidAuthority
    )]
    pub token_mint: Account<'info, TokenMint>,
    
    /// Provider's token account
    #[account(mut)]
    pub provider_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, anchor_spl::token::Token>,
    pub clock: Sysvar<'info, Clock>,
}

// Import error code
use crate::errors::BodyDfiError; 