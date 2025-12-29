# Contributing to Screenbook

Thank you for your interest in contributing to Screenbook! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js 22+
- pnpm 9+

### Getting Started

```bash
# Clone the repository
git clone https://github.com/wadakatu/screenbook.git
cd screenbook

# Install dependencies
pnpm install

# Build all packages
pnpm -r run build

# Run tests
pnpm test
```

## Project Structure

```
screenbook/
├── packages/
│   ├── core/     # @screenbook/core - Type definitions and utilities
│   ├── cli/      # @screenbook/cli - Command-line interface
│   └── ui/       # @screenbook/ui - Astro-based UI
├── docs/         # Documentation site
└── .github/      # GitHub workflows and templates
```

## Development Workflow

### Code Style

We use [Biome](https://biomejs.dev/) for linting and formatting:

```bash
# Check for issues
pnpm biome check

# Auto-fix issues
pnpm biome check --write
```

### Testing

We use [Vitest](https://vitest.dev/) for testing:

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm -r --filter @screenbook/cli run test
```

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions or changes
- `chore:` - Build process or tooling changes

Examples:
```
feat(cli): add --strict flag to lint command
fix(core): handle undefined screen IDs
docs: update README with new examples
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Make your changes
4. Run tests and linting (`pnpm test && pnpm biome check`)
5. Commit with a descriptive message
6. Push to your fork
7. Open a Pull Request

### PR Guidelines

- Keep PRs focused on a single change
- Update documentation if needed
- Add tests for new features
- Ensure CI passes before requesting review

## Reporting Issues

When reporting bugs, please include:

- Screenbook version
- Node.js version
- Operating system
- Steps to reproduce
- Expected vs actual behavior

## Questions?

Feel free to open an issue for any questions or discussions.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
