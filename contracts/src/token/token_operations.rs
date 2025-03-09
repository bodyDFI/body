use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, MintTo};
use crate::errors::BodyDfiError;
use crate::token::token_state::*;

/// Token configuration constants
const MOVE_TOKEN_MINT_COOLDOWN: i64 = 3600; // 1 hour in seconds
const MOVE_TOKEN_DECIMALS: u8 = 9;
const BODYDFI_TOKEN_DECIMALS: u8 = 9;
const BODYDFI_TOTAL_SUPPLY: u64 = 1_000_000_000_000_000_000; // 1 billion with 9 decimals

/// Initialize the MOVE token
pub fn initialize_move_token(
    ctx: Context<InitializeToken>,
    name: String,
    symbol: String,
    uri: String,
    decimals: u8,
) -> Result<()> {
    let token_mint = &mut ctx.accounts.token_mint;
    let authority = &ctx.accounts.authority;
    
    // Set up the MOVE token parameters
    token_mint.authority = authority.key();
    token_mint.name = name;
    token_mint.symbol = symbol;
    token_mint.uri = uri;
    token_mint.decimals = decimals;
    token_mint.total_supply = 0; // Dynamic supply for utility token
    token_mint.circulating_supply = 0;
    token_mint.is_move_token = true;
    token_mint.last_mint_timestamp = 0;
    token_mint.mint_cooldown = MOVE_TOKEN_MINT_COOLDOWN;
    token_mint.mint_cap = 0; // No cap for utility token, controlled by rate limiting
    
    // Create the token mint using SPL token program
    let cpi_accounts = token::MintTo {
        mint: ctx.accounts.token_mint.to_account_info(),
        to: authority.to_account_info(),
        authority: authority.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    // Initialize the mint
    token::mint_to(cpi_ctx, 0)?;
    
    Ok(())
}

/// Initialize the BodyDFi token
pub fn initialize_bodydfi_token(
    ctx: Context<InitializeToken>,
    name: String,
    symbol: String,
    uri: String,
    decimals: u8,
    total_supply: u64,
) -> Result<()> {
    let token_mint = &mut ctx.accounts.token_mint;
    let authority = &ctx.accounts.authority;
    
    // Set up the BodyDFi token parameters
    token_mint.authority = authority.key();
    token_mint.name = name;
    token_mint.symbol = symbol;
    token_mint.uri = uri;
    token_mint.decimals = decimals;
    token_mint.total_supply = total_supply;
    token_mint.circulating_supply = total_supply; // Mint full supply at initialization
    token_mint.is_move_token = false;
    token_mint.last_mint_timestamp = 0;
    token_mint.mint_cooldown = 0; // No cooldown for governance token
    token_mint.mint_cap = total_supply; // Cap at total supply
    
    // Create the token mint using SPL token program
    let cpi_accounts = token::MintTo {
        mint: ctx.accounts.token_mint.to_account_info(),
        to: authority.to_account_info(),
        authority: authority.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    // Mint the full supply to the authority
    token::mint_to(cpi_ctx, total_supply)?;
    
    Ok(())
} 