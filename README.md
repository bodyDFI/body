# bodyDFI - Blockchain Fitness Data Platform

<div align="center">
  <img src="https://raw.githubusercontent.com/bodyDFI/body/master/assets/logos/bodydfi_logo.svg" width="500" height="500" alt="bodyDFI Logo">

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Website](https://img.shields.io/badge/Website-bodydfi.com-blue)](https://bodydfi.com)
  [![Twitter](https://img.shields.io/badge/Twitter-@bodydfi-blue)](https://x.com/bodydfi)
</div>

bodyDFI is a blockchain-powered platform that revolutionizes how fitness and health data is collected, analyzed, and monetized. It combines wearable sensor technology, mobile applications, and Solana blockchain to create a secure, transparent, and incentivized ecosystem for fitness data.

## Project Overview

bodyDFI connects users, developers, fitness professionals, and researchers through a token-based economic model that rewards data contributions and ensures privacy controls.

### Current Development Stage

| Component | Status | Progress |
|-----------|--------|----------|
| Hardware Sensors | Beta Testing | 80% |
| Mobile Application | Beta | 85% |
| Web Dashboard | Beta | 75% |
| Backend Services | Beta | 90% |
| Blockchain Integration | Beta | 65% |
| Data Marketplace | Alpha | 50% |
| Token Economy | Alpha | 40% |

**Current Release**: bodyDFI beta V1.06 - Code organization and internationalization

### Key Features

- **Hardware Sensors**: Custom fitness sensors for collecting motion and biometric data
- **Mobile Application**: User-friendly interface for data visualization and device management
- **Data Marketplace**: Platform for sharing and monetizing fitness data
- **Blockchain Integration**: Solana-based token rewards and transaction verification
- **Privacy Controls**: Granular user control over data sharing and anonymization
- **Token Economy**: Reward system for data contributions and platform participation
- **Internationalization**: Multi-language support throughout the platform
- **Comprehensive Testing**: Automated unit and integration tests

## Core Technical Architecture

bodyDFI follows a comprehensive architecture divided into several components:

<div align="center">
  <img src="https://raw.githubusercontent.com/bodyDFI/body/master/assets/logos/core-architecture.svg" width="800" height="600" alt="bodyDFI Core Architecture">
</div>

The architecture is built on three main principles:
1. **Decentralized Data Ownership**: Users maintain ownership and control of their fitness data
2. **Incentivized Participation**: Token rewards for contributing valuable fitness data
3. **Privacy-Preserving Analysis**: Data can be analyzed while preserving user privacy

### System Components

<div align="center">
  <img src="https://raw.githubusercontent.com/bodyDFI/body/master/assets/logos/architecture-diagram.svg" width="800" height="600" alt="bodyDFI Architecture">
</div>

#### Hardware Layer

- **Sensors**: Multiple sensor types (consumer, professional, medical) with various capabilities
- **Firmware**: ESP32-based firmware for data collection and transmission
- **Connectivity**: BLE for device communication

#### Application Layer

- **Mobile App**: React Native application for user interaction
- **Web Dashboard**: React-based web interface for advanced analytics
- **Backend Services**: Node.js/Express services handling business logic

#### Blockchain Layer

- **Solana Program**: Custom on-chain program for token management and data verification
- **Token Economy**: BDFI tokens for incentivizing participation and data contributions
- **Smart Contracts**: Automated data marketplace and rewards distribution

### Implementation Path

Our technical implementation follows these phases:

1. **Phase 1 (Completed)**: Hardware sensor development and firmware implementation
2. **Phase 2 (Current)**: Mobile application and backend services development
3. **Phase 3 (In Progress)**: Blockchain integration and initial token economy
4. **Phase 4 (Planned)**: Data marketplace and advanced analytics
5. **Phase 5 (Future)**: Ecosystem expansion and third-party integrations

### Data Flow

1. **Collection**: Sensors collect motion and biometric data
2. **Transmission**: Data is securely transferred to mobile application via BLE
3. **Processing**: Backend services process and analyze raw data
4. **Storage**: Processed data is stored in MongoDB with privacy controls
5. **Marketplace**: Data can be shared or sold through the marketplace
6. **Verification**: Blockchain verifies transactions and issues token rewards

## Core Code Showcase

Below are key code examples demonstrating some of bodyDFI's core functionalities:

### 1. Sensor Data Collection (ESP32/C++)

```cpp
// From hardware/firmware/main/bodydfi_sensors.c
void bodydfi_sensor_init(void) {
    // Initialize I2C for sensor communication
    i2c_config_t conf;
    conf.mode = I2C_MODE_MASTER;
    conf.sda_io_num = SENSOR_SDA_PIN;
    conf.sda_pullup_en = GPIO_PULLUP_ENABLE;
    conf.scl_io_num = SENSOR_SCL_PIN;
    conf.scl_pullup_en = GPIO_PULLUP_ENABLE;
    conf.master.clk_speed = 400000;
    
    i2c_param_config(I2C_MASTER_NUM, &conf);
    i2c_driver_install(I2C_MASTER_NUM, conf.mode, 0, 0, 0);
    
    // Initialize MPU6050
    mpu6050_init();
    
    // Initialize BLE service for data transmission
    bodydfi_ble_init();
    
    ESP_LOGI(TAG, "bodyDFI sensors initialized successfully");
}

void bodydfi_read_sensor_data(sensor_data_t *data) {
    // Read accelerometer and gyroscope data
    mpu6050_read_accel(&data->accel_x, &data->accel_y, &data->accel_z);
    mpu6050_read_gyro(&data->gyro_x, &data->gyro_y, &data->gyro_z);
    
    // Read additional sensors if available
    if (bodydfi_config.has_heart_rate) {
        data->heart_rate = read_heart_rate_sensor();
    }
    
    // Apply calibration and filtering
    apply_sensor_calibration(data);
    apply_digital_filter(data);
    
    // Set timestamp
    data->timestamp = esp_timer_get_time();
}
```

### 2. Mobile App Device Connection (React Native)

```javascript
// From mobile/src/contexts/DeviceContext.js
export const DeviceContext = createContext();

export const DeviceProvider = ({ children }) => {
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState([]);
  const [sensorData, setSensorData] = useState([]);

  // Start scanning for bodyDFI devices
  const startScan = async () => {
    try {
      setIsScanning(true);
      
      // Request permissions
      const granted = await requestPermissions();
      if (!granted) {
        throw new Error('Bluetooth permissions not granted');
      }
      
      // Start BLE scan with bodyDFI service UUID filter
      BleManager.startDeviceScan(
        [BODYDFI_SERVICE_UUID], 
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            console.error('Scan error:', error);
            setIsScanning(false);
            return;
          }
          
          // Add device to list if not already present
          setDevices(prevDevices => {
            if (!prevDevices.find(d => d.id === device.id)) {
              return [...prevDevices, device];
            }
            return prevDevices;
          });
        }
      );
      
      // Stop scan after 10 seconds
      setTimeout(() => {
        BleManager.stopDeviceScan();
        setIsScanning(false);
      }, 10000);
      
    } catch (error) {
      console.error('Error starting scan:', error);
      setIsScanning(false);
    }
  };

  // Connect to a bodyDFI device
  const connectToDevice = async (device) => {
    try {
      await BleManager.connectToDevice(device.id);
      await BleManager.discoverAllServicesAndCharacteristics(device.id);
      
      // Subscribe to sensor data characteristic
      await BleManager.startNotification(
        device.id,
        BODYDFI_SERVICE_UUID,
        SENSOR_DATA_CHARACTERISTIC_UUID
      );
      
      // Handle incoming sensor data
      BleManager.onDeviceDisconnected(device.id, () => {
        setConnectedDevice(null);
        setSensorData([]);
      });
      
      // Process incoming data
      BleManager.monitorCharacteristic(
        device.id,
        BODYDFI_SERVICE_UUID,
        SENSOR_DATA_CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('Notification error:', error);
            return;
          }
          
          const decodedData = decodeAndProcessSensorData(characteristic.value);
          setSensorData(prev => [...prev, decodedData]);
        }
      );
      
      setConnectedDevice(device);
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  return (
    <DeviceContext.Provider
      value={{
        devices,
        connectedDevice,
        isScanning,
        sensorData,
        startScan,
        connectToDevice,
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
};
```

### 3. Data Marketplace Smart Contract (Solana/Rust)

```rust
// From smart-contracts/programs/bodydfi/src/data_marketplace/marketplace_operations.rs
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct CreateDataListing<'info> {
    #[account(mut)]
    pub provider: Signer<'info>,
    
    #[account(
        init,
        payer = provider,
        space = DataListing::space(),
        seeds = [
            b"data_listing",
            provider.key().as_ref(),
            &listing_id.to_le_bytes()
        ],
        bump
    )]
    pub data_listing: Account<'info, DataListing>,
    
    #[account(mut)]
    pub provider_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct PurchaseDataAccess<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(
        mut,
        seeds = [
            b"data_listing",
            data_listing.provider.as_ref(),
            &data_listing.listing_id.to_le_bytes()
        ],
        bump = data_listing.bump
    )]
    pub data_listing: Account<'info, DataListing>,
    
    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = provider_token_account.owner == data_listing.provider
    )]
    pub provider_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = buyer,
        space = DataAccess::space(),
        seeds = [
            b"data_access",
            data_listing.key().as_ref(),
            buyer.key().as_ref()
        ],
        bump
    )]
    pub data_access: Account<'info, DataAccess>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn create_data_listing(
    ctx: Context<CreateDataListing>,
    listing_id: u64,
    title: String,
    description: String,
    data_type: String,
    price: u64,
    access_period: i64,
) -> Result<()> {
    let data_listing = &mut ctx.accounts.data_listing;
    
    data_listing.provider = ctx.accounts.provider.key();
    data_listing.listing_id = listing_id;
    data_listing.title = title;
    data_listing.description = description;
    data_listing.data_type = data_type;
    data_listing.price = price;
    data_listing.access_period = access_period;
    data_listing.created_at = Clock::get()?.unix_timestamp;
    data_listing.is_active = true;
    data_listing.bump = *ctx.bumps.get("data_listing").unwrap();
    
    Ok(())
}

pub fn purchase_data_access(ctx: Context<PurchaseDataAccess>) -> Result<()> {
    let data_listing = &ctx.accounts.data_listing;
    let buyer = &ctx.accounts.buyer;
    let now = Clock::get()?.unix_timestamp;
    
    // Ensure the listing is active
    require!(data_listing.is_active, ErrorCode::ListingNotActive);
    
    // Transfer tokens from buyer to provider
    let transfer_instruction = Transfer {
        from: ctx.accounts.buyer_token_account.to_account_info(),
        to: ctx.accounts.provider_token_account.to_account_info(),
        authority: buyer.to_account_info(),
    };
    
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
        ),
        data_listing.price,
    )?;
    
    // Create data access record
    let data_access = &mut ctx.accounts.data_access;
    data_access.listing = data_listing.key();
    data_access.buyer = buyer.key();
    data_access.purchased_at = now;
    data_access.expires_at = now + data_listing.access_period;
    data_access.is_active = true;
    data_access.bump = *ctx.bumps.get("data_access").unwrap();
    
    Ok(())
}
```

### 4. Backend Data Service (Node.js)

```javascript
// From backend/src/services/data.service.js
class DataService {
  constructor(
    dataModel,
    userModel,
    blockchainService,
    analyticsService,
    encryptionService
  ) {
    this.dataModel = dataModel;
    this.userModel = userModel;
    this.blockchainService = blockchainService;
    this.analyticsService = analyticsService;
    this.encryptionService = encryptionService;
    this.logger = createLogger('data-service');
  }

  /**
   * Submit sensor data from a user device
   * @param {string} userId - The user ID
   * @param {string} deviceId - The device ID
   * @param {Array} sensorData - Array of sensor data points
   * @returns {Promise<Object>} - Result of the operation
   */
  async submitSensorData(userId, deviceId, sensorData) {
    try {
      this.logger.info(`Receiving data from user ${userId}, device ${deviceId}, ${sensorData.length} points`);
      
      // Validate user and device
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      const device = user.devices.find(d => d.deviceId === deviceId);
      if (!device) {
        throw new Error('Device not registered for this user');
      }
      
      // Process and validate the data
      const processedData = this.validateAndProcessData(sensorData, device.type);
      
      // Add metadata
      const enrichedData = processedData.map(data => ({
        ...data,
        userId,
        deviceId,
        deviceType: device.type,
        receivedAt: new Date(),
      }));
      
      // Save to database
      const savedData = await this.dataModel.insertMany(enrichedData);
      
      // Calculate analytics in background
      this.analyticsService.processNewData(userId, enrichedData);
      
      // Submit hash to blockchain for verification (if enabled)
      if (user.settings.blockchainVerification) {
        const dataHash = this.encryptionService.hashData(enrichedData);
        await this.blockchainService.submitDataHash(userId, dataHash);
      }
      
      return {
        success: true,
        recordsProcessed: savedData.length,
        id: savedData[0]._id,
      };
    } catch (error) {
      this.logger.error(`Error processing sensor data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieve user data with filtering options
   * @param {string} userId - The user ID
   * @param {Object} options - Filtering options
   * @returns {Promise<Array>} - Retrieved data
   */
  async getUserData(userId, options = {}) {
    const { startDate, endDate, type, limit = 1000, offset = 0 } = options;
    
    const query = { userId };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    if (type) {
      query.dataType = type;
    }
    
    const data = await this.dataModel
      .find(query)
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit);
      
    return data;
  }

  /**
   * Create marketplace data listing
   * @param {string} userId - The user ID
   * @param {Object} listingData - Listing details
   * @returns {Promise<Object>} - Created listing
   */
  async createDataListing(userId, listingData) {
    // Implementation for creating a data listing in the marketplace
    // Includes blockchain transaction for listing creation
    // ...
  }
}

module.exports = DataService;
```

## Technology Stack

### Frontend
- React (Web Dashboard)
- React Native (Mobile Application)
- Redux (State Management)
- TailwindCSS (Styling)

### Backend
- Node.js
- Express
- MongoDB
- Redis (Caching)
- Socket.IO (Real-time Communication)
- Winston (Logging)
- i18next (Internationalization)

### Testing & Documentation
- Jest (Testing Framework)
- Supertest (API Testing)
- Swagger/OpenAPI (API Documentation)

### Monitoring & Performance
- Prometheus (Metrics Collection)
- Prom-client (Node.js Prometheus Integration)

### Security
- Helmet (HTTP Headers Security)
- XSS-Clean (XSS Protection)
- HPP (HTTP Parameter Pollution Protection)
- Express Rate Limit (Rate Limiting)

### Blockchain
- Solana (Main Blockchain)
- Anchor Framework (Solana Program Development)
- SPL Tokens (Token Standard)

### DevOps
- Docker (Containerization)
- GitHub Actions (CI/CD)
- PM2 (Process Management)
- Nginx (Reverse Proxy)

## Project Structure

```
body/
├── backend/                    # Backend application
│   ├── src/
│   │   ├── config/             # Configuration files
│   │   ├── locales/            # Internationalization files
│   │   ├── middleware/         # Middleware components
│   │   │   ├── auth/           # Authentication middleware
│   │   │   ├── validation/     # Request validation middleware
│   │   │   └── error/          # Error handling middleware
│   │   ├── models/             # Database models
│   │   ├── routes/             # API routes
│   │   ├── services/           # Business logic
│   │   ├── utils/              # Utility functions
│   │   │   ├── apiResponse.js  # Standardized API responses
│   │   │   ├── encryption.js   # Encryption utilities
│   │   │   ├── i18n.js         # Internationalization setup
│   │   │   ├── logger.js       # Logging utilities
│   │   │   ├── monitor.js      # Performance monitoring
│   │   │   ├── security.js     # Security utilities
│   │   │   ├── swagger.js      # API documentation
│   │   │   └── validators.js   # Input validators
│   │   ├── blockchain/         # Blockchain interactions
│   │   ├── workers/            # Background workers
│   │   ├── cron/               # Scheduled tasks
│   │   ├── app.js              # Express application setup
│   │   └── server.js           # Server entry point
│   ├── tests/                  # Test files
│   │   ├── unit/               # Unit tests
│   │   ├── integration/        # Integration tests
│   │   └── setup.js            # Test configuration
│   └── package.json            # Dependencies
├── frontend/                   # Web application
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── contexts/           # React contexts
│   │   ├── hooks/              # Custom React hooks
│   │   ├── pages/              # Page components
│   │   ├── services/           # API service calls
│   │   ├── utils/              # Utility functions
│   │   ├── i18n/               # Internationalization
│   │   ├── constants.js        # Application constants
│   │   └── App.js              # Main app component
│   ├── public/                 # Static assets
│   └── package.json            # Dependencies
├── mobile/                     # Mobile application
│   ├── src/                    # Source code
│   ├── assets/                 # Assets and resources
│   └── package.json            # Dependencies
├── hardware/                   # Hardware resources
│   ├── firmware/               # Sensor firmware
│   ├── schematics/             # Hardware design files
│   └── prototypes/             # Prototype documentation
├── smart-contracts/            # Solana program code
│   ├── programs/               # Solana programs
│   └── tests/                  # Program tests
├── docs/                       # Project documentation
│   ├── api/                    # API documentation
│   ├── architecture/           # Architecture diagrams
│   └── guides/                 # Developer guides
├── scripts/                    # Utility scripts
├── .github/                    # GitHub configuration
│   └── workflows/              # CI/CD workflows
├── docker/                     # Docker configuration
│   ├── backend/                # Backend Docker setup
│   ├── frontend/               # Frontend Docker setup
│   └── nginx/                  # NGINX configuration
├── Dockerfile                  # Main Dockerfile
├── docker-compose.yml          # Docker Compose file
├── ecosystem.config.js         # PM2 configuration
├── .env.example                # Environment variables example
└── README.md                   # Project documentation
```

## Getting Started

### Prerequisites

- Node.js (v16+)
- MongoDB (v5+)
- Redis (v6+)
- Docker and Docker Compose
- Solana CLI tools

### Installation

1. Clone the repository
```bash
git clone https://github.com/bodyDFI/body.git
cd body
```

2. Install dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install mobile app dependencies
cd ../mobile
npm install
```

3. Configure environment variables
```bash
# Copy example environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp mobile/.env.example mobile/.env
```

4. Start the development servers
```bash
# Start backend
cd backend
npm run dev

# Start frontend
cd ../frontend
npm start

# Start mobile app
cd ../mobile
npm start
```

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Generate test coverage report
npm run test:coverage
```

### API Documentation

API documentation is available when running the development server:
- Swagger UI: http://localhost:3000/api-docs

### Deployment

For production deployment, use Docker:

```bash
# Build and start containers
docker-compose up -d
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Special thanks to all contributors
- Built with Solana blockchain technology
- Inspired by the need for secure, user-controlled fitness data
