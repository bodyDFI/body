const { Connection, PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Solana connection
const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  'confirmed'
);

// Program ID for BodyDFi contract
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID || 'BDFiC3XMQn4DCf3gFJJG9oKxVTXWE79MHBd6rZCvw2xk');

/**
 * Blockchain service for interacting with Solana
 */
class BlockchainService {
  /**
   * Get account information
   * @param {string} publicKey - Solana account public key
   * @returns {Promise<Object>} Account info
   */
  async getAccountInfo(publicKey) {
    try {
      const pubKey = new PublicKey(publicKey);
      const accountInfo = await connection.getAccountInfo(pubKey);
      return accountInfo;
    } catch (error) {
      console.error('Error getting account info:', error);
      throw new Error('Failed to get account information');
    }
  }

  /**
   * Get balance for a Solana account
   * @param {string} publicKey - Solana account public key
   * @returns {Promise<number>} Balance in SOL
   */
  async getBalance(publicKey) {
    try {
      const pubKey = new PublicKey(publicKey);
      const balance = await connection.getBalance(pubKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('Error getting balance:', error);
      throw new Error('Failed to get account balance');
    }
  }

  /**
   * Get transaction details
   * @param {string} signature - Transaction signature
   * @returns {Promise<Object>} Transaction details
   */
  async getTransaction(signature) {
    try {
      const transaction = await connection.getTransaction(signature);
      return transaction;
    } catch (error) {
      console.error('Error getting transaction:', error);
      throw new Error('Failed to get transaction details');
    }
  }

  /**
   * Find all PDA accounts for data providers
   * @returns {Promise<Array>} Array of data provider accounts
   */
  async findAllDataProviders() {
    try {
      const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          {
            memcmp: {
              offset: 0, // Offset to locate the account discriminator
              bytes: Buffer.from('data-provider').toString('base64')
            }
          }
        ]
      });
      
      return accounts.map(({ pubkey, account }) => ({
        publicKey: pubkey.toString(),
        data: account.data
      }));
    } catch (error) {
      console.error('Error finding data providers:', error);
      throw new Error('Failed to find data provider accounts');
    }
  }

  /**
   * Find data provider by public key
   * @param {string} authority - Authority public key
   * @returns {Promise<Object|null>} Data provider info or null if not found
   */
  async findDataProvider(authority) {
    try {
      const authorityPubkey = new PublicKey(authority);
      const [dataProviderPda] = await PublicKey.findProgramAddressSync(
        [Buffer.from('data-provider'), authorityPubkey.toBuffer()],
        PROGRAM_ID
      );
      
      const accountInfo = await connection.getAccountInfo(dataProviderPda);
      
      if (!accountInfo) {
        return null;
      }
      
      return {
        publicKey: dataProviderPda.toString(),
        data: accountInfo.data
      };
    } catch (error) {
      console.error('Error finding data provider:', error);
      throw new Error('Failed to find data provider account');
    }
  }

  /**
   * Find all data listings
   * @returns {Promise<Array>} Array of data listing accounts
   */
  async findAllDataListings() {
    try {
      const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          {
            memcmp: {
              offset: 0,
              bytes: Buffer.from('data-listing').toString('base64')
            }
          }
        ]
      });
      
      return accounts.map(({ pubkey, account }) => ({
        publicKey: pubkey.toString(),
        data: account.data
      }));
    } catch (error) {
      console.error('Error finding data listings:', error);
      throw new Error('Failed to find data listing accounts');
    }
  }

  /**
   * Find data listing by ID
   * @param {string} listingId - Listing ID
   * @returns {Promise<Object|null>} Data listing info or null if not found
   */
  async findDataListing(listingId) {
    try {
      const [dataListingPda] = await PublicKey.findProgramAddressSync(
        [Buffer.from('data-listing'), Buffer.from(listingId)],
        PROGRAM_ID
      );
      
      const accountInfo = await connection.getAccountInfo(dataListingPda);
      
      if (!accountInfo) {
        return null;
      }
      
      return {
        publicKey: dataListingPda.toString(),
        data: accountInfo.data
      };
    } catch (error) {
      console.error('Error finding data listing:', error);
      throw new Error('Failed to find data listing account');
    }
  }

  /**
   * Create transaction instruction for submitting data
   * @param {Object} params - Transaction parameters
   * @returns {Object} Transaction instructions
   */
  createSubmitDataInstruction(params) {
    // This would construct the actual transaction instruction
    // Simplified for demo purposes
    return {
      transaction: 'submit_data_instruction_placeholder',
      message: 'Submit data instruction created'
    };
  }

  /**
   * Create transaction instruction for purchasing data access
   * @param {Object} params - Transaction parameters
   * @returns {Object} Transaction instructions
   */
  createPurchaseDataAccessInstruction(params) {
    // This would construct the actual transaction instruction
    // Simplified for demo purposes
    return {
      transaction: 'purchase_data_instruction_placeholder',
      message: 'Purchase data instruction created'
    };
  }
}

module.exports = new BlockchainService(); 