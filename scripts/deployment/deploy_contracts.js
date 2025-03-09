const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');
const dotenv = require('dotenv');
const { Keypair } = require('@solana/web3.js');
const { readFileSync, writeFileSync } = require('fs');

// Load environment variables
dotenv.config();

// Setup readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Define paths
const BASE_PATH = process.cwd();
const CONFIG_PATH = path.join(BASE_PATH, 'scripts', 'deployment', 'config.json');
const CONTRACT_PATH = path.join(BASE_PATH, 'contracts');
const KEYPAIR_PATH = path.join(BASE_PATH, 'scripts', 'deployment', 'keypair.json');

// Load or create config
let config = {};
if (fs.existsSync(CONFIG_PATH)) {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
} else {
  config = {
    network: 'devnet',
    programId: '',
    deploymentTimestamp: 0,
    deployed: false
  };
}

/**
 * Ask a question and get user input
 * @param {string} question - The question to ask
 * @returns {Promise<string>} - User input
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Run a command and return its output
 * @param {string} command - The command to run
 * @param {array} args - Command arguments
 * @param {object} options - Spawn options
 * @returns {Promise<string>} - Command output
 */
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      ...options,
      shell: true
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log(output);
    });
    
    proc.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.error(output);
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });
  });
}

/**
 * Generate or load a Solana keypair
 * @returns {Keypair} - Solana keypair
 */
function getOrCreateKeypair() {
  if (fs.existsSync(KEYPAIR_PATH)) {
    const keypairData = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf8'));
    return Keypair.fromSecretKey(Uint8Array.from(keypairData));
  } else {
    const keypair = Keypair.generate();
    const keypairData = Array.from(keypair.secretKey);
    fs.mkdirSync(path.dirname(KEYPAIR_PATH), { recursive: true });
    fs.writeFileSync(KEYPAIR_PATH, JSON.stringify(keypairData));
    return keypair;
  }
}

/**
 * Get the balance of a Solana account
 * @param {string} publicKey - Account public key
 * @returns {Promise<number>} - Account balance in SOL
 */
async function getBalance(publicKey) {
  try {
    const output = await runCommand('solana', ['balance', publicKey, '--url', config.network]);
    const balance = parseFloat(output.trim().split(' ')[0]);
    return balance;
  } catch (error) {
    console.error('Error checking balance:', error);
    return 0;
  }
}

/**
 * Request an airdrop of SOL on devnet
 * @param {string} publicKey - Account public key
 * @returns {Promise<boolean>} - Success status
 */
async function requestAirdrop(publicKey) {
  try {
    await runCommand('solana', ['airdrop', '2', publicKey, '--url', config.network]);
    return true;
  } catch (error) {
    console.error('Error requesting airdrop:', error);
    return false;
  }
}

/**
 * Build the Anchor program
 * @returns {Promise<boolean>} - Success status
 */
async function buildProgram() {
  try {
    console.log('\n🔨 Building Anchor program...');
    await runCommand('anchor', ['build'], { cwd: CONTRACT_PATH });
    return true;
  } catch (error) {
    console.error('Error building program:', error);
    return false;
  }
}

/**
 * Deploy the program to the Solana network
 * @param {Keypair} keypair - Deployment keypair
 * @returns {Promise<string>} - Program ID
 */
async function deployProgram(keypair) {
  try {
    console.log('\n🚀 Deploying program to', config.network, '...');
    
    // Deploy with anchor
    const output = await runCommand(
      'anchor',
      ['deploy', '--provider.wallet', KEYPAIR_PATH, '--provider.cluster', config.network],
      { cwd: CONTRACT_PATH }
    );
    
    // Extract program ID from output
    const programIdMatch = output.match(/Program Id: ([a-zA-Z0-9]{32,44})/);
    if (programIdMatch && programIdMatch[1]) {
      return programIdMatch[1];
    } else {
      throw new Error('Could not extract program ID from deployment output');
    }
  } catch (error) {
    console.error('Error deploying program:', error);
    throw error;
  }
}

/**
 * Update the program ID in Anchor.toml
 * @param {string} programId - The new program ID
 * @returns {Promise<boolean>} - Success status
 */
async function updateProgramId(programId) {
  try {
    const anchorTomlPath = path.join(CONTRACT_PATH, 'Anchor.toml');
    let anchorToml = fs.readFileSync(anchorTomlPath, 'utf8');
    
    // Update the program ID in the Anchor.toml file
    anchorToml = anchorToml.replace(
      /bodydfi = "[a-zA-Z0-9]{32,44}"/,
      `bodydfi = "${programId}"`
    );
    
    fs.writeFileSync(anchorTomlPath, anchorToml);
    return true;
  } catch (error) {
    console.error('Error updating program ID:', error);
    return false;
  }
}

/**
 * Update the program ID in lib.rs
 * @param {string} programId - The new program ID
 * @returns {Promise<boolean>} - Success status
 */
async function updateLibRs(programId) {
  try {
    const libRsPath = path.join(CONTRACT_PATH, 'src', 'lib.rs');
    let libRs = fs.readFileSync(libRsPath, 'utf8');
    
    // Update the declare_id! macro
    libRs = libRs.replace(
      /declare_id!\("[a-zA-Z0-9]{32,44}"\);/,
      `declare_id!("${programId}");`
    );
    
    fs.writeFileSync(libRsPath, libRs);
    return true;
  } catch (error) {
    console.error('Error updating lib.rs:', error);
    return false;
  }
}

/**
 * Save the deployment configuration
 * @param {object} config - Configuration object
 * @returns {Promise<boolean>} - Success status
 */
async function saveConfig(config) {
  try {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

/**
 * Main deployment function
 */
async function main() {
  try {
    console.log('🟢 BodyDFi Contract Deployment Tool');
    console.log('====================================');
    
    // Select network
    const networkInput = await askQuestion('Select network (devnet, testnet, mainnet-beta) [default: devnet]: ');
    config.network = networkInput.trim() || 'devnet';
    
    // Get or create keypair
    const keypair = getOrCreateKeypair();
    console.log('\n🔑 Using keypair with public key:', keypair.publicKey.toString());
    
    // Check balance
    const balance = await getBalance(keypair.publicKey.toString());
    console.log('💰 Current balance:', balance, 'SOL');
    
    // Request airdrop if needed and on devnet
    if (balance < 1 && config.network === 'devnet') {
      console.log('\n🚰 Requesting airdrop...');
      await requestAirdrop(keypair.publicKey.toString());
      
      // Verify airdrop
      const newBalance = await getBalance(keypair.publicKey.toString());
      console.log('💰 New balance:', newBalance, 'SOL');
      
      if (newBalance <= balance) {
        console.log('⚠️ Airdrop may not have succeeded. Consider funding this account manually.');
        const proceed = await askQuestion('Continue anyway? (y/n): ');
        if (proceed.toLowerCase() !== 'y') {
          rl.close();
          return;
        }
      }
    } else if (balance < 1) {
      console.log('\n⚠️ Low balance detected. Please fund this account before deploying.');
      const proceed = await askQuestion('Continue anyway? (y/n): ');
      if (proceed.toLowerCase() !== 'y') {
        rl.close();
        return;
      }
    }
    
    // Build program
    const buildSuccess = await buildProgram();
    if (!buildSuccess) {
      throw new Error('Build failed');
    }
    
    // Confirm deployment
    const confirmDeploy = await askQuestion(`\n🚀 Deploy to ${config.network}? (y/n): `);
    if (confirmDeploy.toLowerCase() !== 'y') {
      rl.close();
      return;
    }
    
    // Deploy program
    const programId = await deployProgram(keypair);
    console.log('\n✅ Program deployed successfully!');
    console.log('📝 Program ID:', programId);
    
    // Update config
    config.programId = programId;
    config.deploymentTimestamp = Date.now();
    config.deployed = true;
    
    // Save config
    await saveConfig(config);
    
    // Update program ID in files
    await updateProgramId(programId);
    await updateLibRs(programId);
    
    console.log('\n🎉 Deployment completed successfully!');
    console.log('====================================');
    console.log('Network:', config.network);
    console.log('Program ID:', config.programId);
    console.log('Timestamp:', new Date(config.deploymentTimestamp).toLocaleString());
    
    rl.close();
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    rl.close();
  }
}

// Run the script
main(); 