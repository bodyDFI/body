# Contributing to BodyDFi

Thank you for your interest in contributing to BodyDFi! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please read it before contributing.

## How to Contribute

### Reporting Bugs

If you find a bug in the project, please create an issue on GitHub with the following information:

1. A clear, descriptive title
2. A detailed description of the issue
3. Steps to reproduce the bug
4. Expected behavior
5. Actual behavior
6. Screenshots (if applicable)
7. Environment information (OS, browser, device, etc.)

### Suggesting Enhancements

We welcome suggestions for enhancements to the project. Please create an issue on GitHub with the following information:

1. A clear, descriptive title
2. A detailed description of the enhancement
3. The motivation behind the enhancement
4. Any examples or mockups of the enhancement

### Pull Requests

We actively welcome pull requests. Here's how to submit one:

1. Fork the repository
2. Create a new branch from `main`
3. Make your changes
4. Run tests to ensure your changes don't break existing functionality
5. Submit a pull request

#### Pull Request Guidelines

- Follow the coding style of the project
- Write clear, descriptive commit messages
- Include tests for new features
- Update documentation as needed
- Keep pull requests focused on a single change
- Link the pull request to any related issues

## Development Setup

### Prerequisites

- Node.js (v16+)
- Rust (v1.65+)
- Solana CLI (v1.16+)
- Anchor Framework (v0.27+)
- MongoDB

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/bodydfi.git
cd bodydfi
```

2. Install dependencies
```bash
# Install contract dependencies
cd contracts
cargo build

# Install frontend dependencies
cd ../frontend
npm install

# Install backend dependencies
cd ../backend
npm install

# Install mobile dependencies
cd ../mobile
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run the development servers
```bash
# Run frontend
cd frontend
npm start

# Run backend
cd ../backend
npm run dev

# Run mobile app
cd ../mobile
npm start
```

## Testing

Please ensure that your changes pass all tests before submitting a pull request.

```bash
# Test contracts
cd contracts
cargo test

# Test frontend
cd ../frontend
npm test

# Test backend
cd ../backend
npm test

# Test mobile
cd ../mobile
npm test
```

## Documentation

Please update the documentation when necessary. This includes:

- README.md
- Code comments
- API documentation
- User guides

## License

By contributing to BodyDFi, you agree that your contributions will be licensed under the project's MIT License.
