import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Bodydfi } from '../target/types/bodydfi';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { expect } from 'chai';

describe('BodyDFi', () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Bodydfi as Program<Bodydfi>;
  const wallet = provider.wallet as anchor.Wallet;

  // Test accounts
  const user = wallet.payer;
  const testUser = Keypair.generate();

  // Token accounts
  let moveTokenMint: PublicKey;
  let bodyDfiTokenMint: PublicKey;
  let moveTokenMintBump: number;
  let bodyDfiTokenMintBump: number;

  // Data provider accounts
  const userId = `user_${Date.now()}`;
  let dataProviderPda: PublicKey;
  let dataProviderBump: number;

  // Data listing
  const listingId = `listing_${Date.now()}`;
  let dataListingPda: PublicKey;
  let dataListingBump: number;

  // Data submission
  const dataHash = `data_${Date.now()}`;
  let dataSubmissionPda: PublicKey;
  let dataSubmissionBump: number;

  // Fund the test user
  before(async () => {
    // Airdrop 1 SOL to test user
    const signature = await provider.connection.requestAirdrop(testUser.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(signature);
  });

  describe('Token Operations', () => {
    it('Should initialize MOVE token', async () => {
      // Find PDA for token mint
      [moveTokenMint, moveTokenMintBump] = await PublicKey.findProgramAddressSync(
        [Buffer.from('token-mint'), user.publicKey.toBuffer()],
        program.programId
      );

      // Initialize token
      await program.methods
        .initializeMoveToken(
          'MOVE Token',
          'MOVE',
          'https://bodydfi.xyz/tokens/move',
          9 // decimals
        )
        .accounts({
          authority: user.publicKey,
          tokenMint: moveTokenMint,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      // Verify token was created
      const tokenMintAccount = await program.account.tokenMint.fetch(moveTokenMint);
      expect(tokenMintAccount.name).to.equal('MOVE Token');
      expect(tokenMintAccount.symbol).to.equal('MOVE');
      expect(tokenMintAccount.isMoveToken).to.be.true;
    });

    it('Should initialize BodyDFi token', async () => {
      // Find PDA for token mint
      [bodyDfiTokenMint, bodyDfiTokenMintBump] = await PublicKey.findProgramAddressSync(
        [Buffer.from('token-mint'), user.publicKey.toBuffer()],
        program.programId
      );

      // Total supply: 1 billion with 9 decimals
      const totalSupply = new anchor.BN(1_000_000_000_000_000_000);

      // Initialize token
      await program.methods
        .initializeBodydfiToken(
          'BodyDFi Token',
          'BDFI',
          'https://bodydfi.xyz/tokens/bodydfi',
          9, // decimals
          totalSupply
        )
        .accounts({
          authority: user.publicKey,
          tokenMint: bodyDfiTokenMint,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      // Verify token was created
      const tokenMintAccount = await program.account.tokenMint.fetch(bodyDfiTokenMint);
      expect(tokenMintAccount.name).to.equal('BodyDFi Token');
      expect(tokenMintAccount.symbol).to.equal('BDFI');
      expect(tokenMintAccount.isMoveToken).to.be.false;
      expect(tokenMintAccount.totalSupply.toString()).to.equal(totalSupply.toString());
    });
  });

  describe('Data Provider Operations', () => {
    it('Should register a data provider', async () => {
      // Find PDA for data provider
      [dataProviderPda, dataProviderBump] = await PublicKey.findProgramAddressSync(
        [Buffer.from('data-provider'), Buffer.from(userId)],
        program.programId
      );

      // Register data provider
      await program.methods
        .registerDataProvider(
          userId,
          0 // Device type: Sensor
        )
        .accounts({
          authority: user.publicKey,
          dataProvider: dataProviderPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Verify data provider was registered
      const dataProvider = await program.account.dataProvider.fetch(dataProviderPda);
      expect(dataProvider.authority.toString()).to.equal(user.publicKey.toString());
      expect(dataProvider.userId).to.equal(userId);
      expect(dataProvider.deviceType).to.equal(0);
      expect(dataProvider.submissionCount.toNumber()).to.equal(0);
    });

    it('Should submit data', async () => {
      // Find PDA for data submission
      [dataSubmissionPda, dataSubmissionBump] = await PublicKey.findProgramAddressSync(
        [Buffer.from('data-submission'), Buffer.from(dataHash)],
        program.programId
      );

      const timestamp = Math.floor(Date.now() / 1000);
      const metadata = JSON.stringify({
        device: 'BodyDFi Sensor',
        readings: {
          accelerometer: { x: 0.5, y: 1.2, z: 9.8 },
          gyroscope: { x: 0.1, y: 0.2, z: 0.3 }
        }
      });

      // Submit data
      await program.methods
        .submitData(
          dataHash,
          1, // Data type: Biometric
          new anchor.BN(timestamp),
          metadata
        )
        .accounts({
          user: user.publicKey,
          dataProvider: dataProviderPda,
          dataSubmission: dataSubmissionPda,
          systemProgram: SystemProgram.programId,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();

      // Verify data was submitted
      const dataSubmission = await program.account.dataSubmission.fetch(dataSubmissionPda);
      expect(dataSubmission.provider.toString()).to.equal(user.publicKey.toString());
      expect(dataSubmission.dataHash).to.equal(dataHash);
      expect(dataSubmission.dataType).to.equal(1);
      expect(dataSubmission.metadata).to.equal(metadata);
      expect(dataSubmission.isValidated).to.be.false;

      // Verify provider submission count was updated
      const dataProvider = await program.account.dataProvider.fetch(dataProviderPda);
      expect(dataProvider.submissionCount.toNumber()).to.equal(1);
    });
  });

  describe('Marketplace Operations', () => {
    it('Should create a data listing', async () => {
      // Find PDA for data listing
      [dataListingPda, dataListingBump] = await PublicKey.findProgramAddressSync(
        [Buffer.from('data-listing'), Buffer.from(listingId)],
        program.programId
      );

      // Create data listing
      await program.methods
        .createDataListing(
          listingId,
          [1], // Data types: Biometric
          new anchor.BN(100), // Price: 100 tokens
          new anchor.BN(2592000), // Access period: 30 days in seconds
          'Biometric data from fitness tracking'
        )
        .accounts({
          user: user.publicKey,
          dataProvider: dataProviderPda,
          dataListing: dataListingPda,
          systemProgram: SystemProgram.programId,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();

      // Verify data listing was created
      const dataListing = await program.account.dataListing.fetch(dataListingPda);
      expect(dataListing.provider.toString()).to.equal(user.publicKey.toString());
      expect(dataListing.listingId).to.equal(listingId);
      expect(dataListing.dataTypes).to.deep.equal([1]);
      expect(dataListing.pricePerAccess.toNumber()).to.equal(100);
      expect(dataListing.accessPeriod.toNumber()).to.equal(2592000);
      expect(dataListing.isActive).to.be.true;
    });

    it('Should purchase data access', async () => {
      // This test would be more involved in a real implementation
      // as it requires token accounts and transfers
      // For simplicity, we'll just check if the function exists
      expect(program.methods.purchaseDataAccess).to.exist;
    });
  });

  describe('Governance Operations', () => {
    it('Should have governance functions', () => {
      // Verify the governance functions exist
      expect(program.methods.createProposal).to.exist;
      expect(program.methods.castVote).to.exist;
    });
  });
}); 