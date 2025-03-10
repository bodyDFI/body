# bodyDFI Code Organization

This document outlines the code organization standards and best practices for the bodyDFI project.

## Directory Structure

The project follows a modular approach with clear separation of concerns:

```
body/
├── backend/                    # Server-side application
├── frontend/                   # Web client application
├── mobile/                     # Mobile client application
├── hardware/                   # Hardware-related code and design
├── smart-contracts/            # Blockchain contracts and programs
├── docs/                       # Documentation
├── scripts/                    # Utility scripts
└── assets/                     # Shared assets
```

## Coding Standards

### JavaScript/TypeScript

- Use ES6+ features
- Follow Airbnb JavaScript Style Guide
- Maintain consistent naming conventions:
  - camelCase for variables and functions
  - PascalCase for classes and components
  - UPPER_CASE for constants

### Rust (Smart Contracts)

- Follow Rust standard formatting conventions
- Use descriptive variable and function names
- Include documentation comments for all public functions

### C/C++ (Firmware)

- Follow Google C++ Style Guide
- Prioritize readability over premature optimization
- Document hardware dependencies clearly

## Documentation Standards

- Each module should include a README.md file
- All public APIs should have documentation comments
- Complex logic should include explanatory comments
- Architecture decisions should be documented in the docs/architecture directory

## Testing Guidelines

- Backend APIs: Unit tests for services, integration tests for endpoints
- Smart Contracts: Full test coverage for all contract functions
- Frontend/Mobile: Component tests and integration tests
- Firmware: Testing protocols should be documented

## Version Control Practices

- Create feature branches for all new development
- Use descriptive commit messages that explain the "why"
- Keep commits focused on a single change
- Reference issue numbers in commit messages

## Release Process

1. Version number format: X.Y.Z (Major.Minor.Patch)
2. Create release notes in docs/releases directory
3. Tag releases using the format `bodyDFI-vX.Y.Z`
4. Document API changes or breaking changes prominently

This guide should be followed by all contributors to maintain consistency across the codebase. 