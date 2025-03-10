# Core Components

This directory contains the core business logic components of the bodyDFI platform.

## Structure

- `controllers/`: API endpoint handlers and request processing
- `models/`: Data models and database schema definitions
- `services/`: Business logic and service implementations
- `blockchain/`: Blockchain integration and smart contract interactions

## Development Guidelines

1. Keep business logic in services, separate from controllers
2. Follow the repository pattern for database operations
3. Use dependency injection for service relationships
4. Document all public APIs and service interfaces 