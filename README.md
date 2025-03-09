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

### Key Features

- **Hardware Sensors**: Custom fitness sensors for collecting motion and biometric data
- **Mobile Application**: User-friendly interface for data visualization and device management
- **Data Marketplace**: Platform for sharing and monetizing fitness data
- **Blockchain Integration**: Solana-based token rewards and transaction verification
- **Privacy Controls**: Granular user control over data sharing and anonymization
- **Token Economy**: Reward system for data contributions and platform participation
- **Internationalization**: Multi-language support throughout the platform
- **Comprehensive Testing**: Automated unit and integration tests

## Architecture

bodyDFI follows a comprehensive architecture divided into several components:

### System Components

![bodyDFI Architecture](docs/architecture/architecture-diagram.png)

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

### Data Flow

1. **Collection**: Sensors collect motion and biometric data
2. **Transmission**: Data is securely transferred to mobile application via BLE
3. **Processing**: Backend services process and analyze raw data
4. **Storage**: Processed data is stored in MongoDB with privacy controls
5. **Marketplace**: Data can be shared or sold through the marketplace
6. **Verification**: Blockchain verifies transactions and issues token rewards

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

## Key Components

### Hardware Sensors

bodyDFI offers three tiers of sensors:
- **bodyDFI Sensor™** (Consumer): Basic motion tracking for everyday users
- **bodyDFI Pro™** (Professional): Advanced sensors for fitness professionals
- **bodyDFI Medical™** (Medical): Medical-grade sensors with certification

Each device includes an ESP32 microcontroller, motion sensors (MPU-6050), and optional biometric sensors depending on the model.

### Mobile Application

The React Native mobile app provides:
- Real-time data visualization
- Workout tracking and analysis
- Device connection and management
- Data marketplace access
- Wallet and token management

### Data Marketplace

The marketplace enables:
- Listing data for sharing/selling
- Purchasing access to datasets
- Setting price, duration, and access controls
- Rating and reviewing data providers
- Automated token transactions

### Token Economy

The token system includes:
- Rewards for data contributions
- Incentives for regular activity
- Marketplace transaction facilitation
- Staking mechanisms for platform governance
- Revenue sharing for data providers

## Security and Privacy

bodyDFI prioritizes user data protection:
- End-to-end encryption for sensitive data
- Granular privacy controls per data type
- Data anonymization options
- GDPR-compliant data handling
- Authorized device management
- Comprehensive access logging
- Rate limiting and brute force protection
- Security headers implementation
- XSS and parameter pollution protection

## Quality Assurance

bodyDFI maintains high quality through:
- **Automated Testing**: Comprehensive unit and integration tests
- **API Documentation**: Auto-generated Swagger documentation
- **Performance Monitoring**: Real-time metrics with Prometheus
- **Standardized Response Format**: Consistent API responses
- **Error Handling**: Centralized error management
- **Input Validation**: Schema-based request validation

## Internationalization

The platform supports multiple languages:
- English (Default)
- Chinese
- Spanish
- French
- Easy addition of new languages

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

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Special thanks to all contributors
- Built with Solana blockchain technology
- Inspired by the need for secure, user-controlled fitness data
