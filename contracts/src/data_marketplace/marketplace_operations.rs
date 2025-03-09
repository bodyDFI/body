use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};
use crate::errors::BodyDfiError;
use crate::data_marketplace::data_state::*;

/// Platform fee percentage (15%)
const PLATFORM_FEE_PERCENTAGE: u64 = 15;
const TOKEN_HOLDER_FEE_PERCENTAGE: u64 = 15;
const PROVIDER_FEE_PERCENTAGE: u64 = 70;
const PERCENTAGE_DENOMINATOR: u64 = 100;

/// Create a data marketplace listing
pub fn create_data_listing(
    ctx: Context<CreateDataListing>,
    listing_id: String,
    data_types: Vec<u8>,
    price_per_access: u64,
    access_period: u64,
    description: String,
) -> Result<()> {
    // Validate input
    require!(!data_types.is_empty(), BodyDfiError::InvalidDataType);
    require!(price_per_access > 0, BodyDfiError::InvalidDataListing);
    require!(access_period > 0, BodyDfiError::InvalidDataListing);
    
    // Validate all data types
    for data_type in data_types.iter() {
        require!(
            *data_type <= DATA_TYPE_MEDICAL,
            BodyDfiError::InvalidDataType
        );
    }
    
    let data_listing = &mut ctx.accounts.data_listing;
    let data_provider = &ctx.accounts.data_provider;
    let current_time = ctx.accounts.clock.unix_timestamp;
    
    // Initialize data listing
    data_listing.provider = data_provider.authority;
    data_listing.listing_id = listing_id;
    data_listing.data_types = data_types;
    data_listing.price_per_access = price_per_access;
    data_listing.access_period = access_period;
    data_listing.description = description;
    data_listing.purchase_count = 0;
    data_listing.created_at = current_time;
    data_listing.is_active = true;
    
    // Emit event
    emit!(DataListingCreatedEvent {
        provider: data_provider.authority,
        listing_id: data_listing.listing_id.clone(),
        price_per_access,
        access_period,
    });
    
    Ok(())
}

/// Purchase data access
pub fn purchase_data_access(
    ctx: Context<PurchaseDataAccess>,
    listing_id: String,
) -> Result<()> {
    let buyer = &ctx.accounts.buyer;
    let data_listing = &mut ctx.accounts.data_listing;
    let data_provider = &mut ctx.accounts.data_provider;
    let data_access = &mut ctx.accounts.data_access;
    let current_time = ctx.accounts.clock.unix_timestamp;
    
    // Validate listing is active
    require!(data_listing.is_active, BodyDfiError::InvalidDataListing);
    
    // Calculate fee splits
    let total_amount = data_listing.price_per_access;
    let platform_fee = total_amount
        .checked_mul(PLATFORM_FEE_PERCENTAGE)
        .unwrap()
        .checked_div(PERCENTAGE_DENOMINATOR)
        .unwrap();
    let token_holder_fee = total_amount
        .checked_mul(TOKEN_HOLDER_FEE_PERCENTAGE)
        .unwrap()
        .checked_div(PERCENTAGE_DENOMINATOR)
        .unwrap();
    let provider_amount = total_amount
        .checked_mul(PROVIDER_FEE_PERCENTAGE)
        .unwrap()
        .checked_div(PERCENTAGE_DENOMINATOR)
        .unwrap();
    
    // Transfer tokens from buyer to provider
    let cpi_accounts = Transfer {
        from: ctx.accounts.buyer_token_account.to_account_info(),
        to: ctx.accounts.provider_token_account.to_account_info(),
        authority: buyer.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    // For simplicity in this example, we're transferring directly to the provider
    // In a production system, we would handle platform fees and token holder fees
    token::transfer(cpi_ctx, provider_amount)?;
    
    // Initialize data access
    data_access.buyer = buyer.key();
    data_access.listing_id = listing_id;
    data_access.purchased_at = current_time;
    data_access.expires_at = current_time + data_listing.access_period as i64;
    data_access.amount_paid = total_amount;
    data_access.is_valid = true;
    
    // Update listing stats
    data_listing.purchase_count = data_listing.purchase_count.checked_add(1).unwrap();
    
    // Update provider stats
    data_provider.total_rewards = data_provider.total_rewards.checked_add(provider_amount).unwrap();
    
    // Emit event
    emit!(DataAccessPurchasedEvent {
        buyer: buyer.key(),
        provider: data_provider.authority,
        listing_id: data_listing.listing_id.clone(),
        amount_paid: total_amount,
        expires_at: data_access.expires_at,
    });
    
    Ok(())
}

/// Event emitted when a new data listing is created
#[event]
pub struct DataListingCreatedEvent {
    pub provider: Pubkey,
    pub listing_id: String,
    pub price_per_access: u64,
    pub access_period: u64,
}

/// Event emitted when data access is purchased
#[event]
pub struct DataAccessPurchasedEvent {
    pub buyer: Pubkey,
    pub provider: Pubkey,
    pub listing_id: String,
    pub amount_paid: u64,
    pub expires_at: i64,
} 