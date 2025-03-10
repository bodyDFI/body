# bodyDFI Project Structure

This document outlines the optimized project structure for the bodyDFI platform.

## Directory Organization

```
bodyDFI/
├── src/                       # Source code
│   ├── core/                  # Core business logic
│   │   ├── controllers/       # API controllers
│   │   ├── models/            # Data models
│   │   ├── services/          # Business services
│   │   └── blockchain/        # Blockchain integration
│   │
│   ├── shared/                # Shared resources
│   │   ├── config/            # Configuration files
│   │   ├── constants/         # Global constants
│   │   ├── locales/           # i18n translations
│   │   └── types/             # Type definitions
│   │
│   └── utils/                 # Utility functions
│       ├── formatting/        # Data formatting
│       ├── validation/        # Input validation
│       ├── security/          # Security helpers
│       └── i18n/              # i18n configuration
│
├── frontend/                  # Web application
│   ├── public/                # Static assets
│   └── src/                   # Frontend source code
│
├── mobile/                    # Mobile application
│   └── src/                   # Mobile source code
│
├── hardware/                  # Hardware resources
│   ├── firmware/              # Device firmware
│   └── schematics/            # Hardware designs
│
├── smart-contracts/           # Blockchain contracts
│   └── programs/              # Solana programs
│
├── docs/                      # Documentation
│   ├── api/                   # API documentation
│   ├── architecture/          # Architecture diagrams
│   └── releases/              # Release notes
│
├── scripts/                   # Utility scripts
│
├── .github/                   # GitHub configuration
│   └── workflows/             # CI/CD workflows
│
├── docker/                    # Docker configuration
│   └── nginx/                 # NGINX configuration
│
├── Dockerfile                 # Main Dockerfile
├── docker-compose.yml         # Docker Compose configuration
├── ecosystem.config.js        # PM2 configuration
└── README.md                  # Project documentation
```

## Key Components

### Core Module

The `core` directory contains the essential business logic of the application:

- **Controllers**: Handle HTTP requests and responses
- **Models**: Define data structures and database schemas
- **Services**: Implement business logic and application features
- **Blockchain**: Manage blockchain interactions and token operations

### Shared Module

The `shared` directory contains resources used across multiple parts of the application:

- **Config**: Application configuration parameters
- **Constants**: Global constants and enumerations
- **Locales**: Internationalization resources
- **Types**: Shared type definitions

### Utils Module

The `utils` directory contains helper functions and utilities:

- **Formatting**: Data transformation and display formatting
- **Validation**: Input validation and sanitation
- **Security**: Authentication and authorization helpers
- **i18n**: Internationalization configuration

## Development Guidelines

1. **Module Independence**: Each module should have clear responsibilities
2. **Consistent Naming**: Follow established naming conventions across the project
3. **Documentation**: Maintain up-to-date documentation for each module
4. **Testing**: Write comprehensive tests for all components

This structure supports the continued development of bodyDFI while maintaining code organization and scalability. 