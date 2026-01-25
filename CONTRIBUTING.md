# Contributing to Tidal Hi-Fi

Thank you for your interest in contributing to Tidal Hi-Fi! This document outlines the guidelines and best practices for contributing to this project.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (use the version specified in `.nvmrc` if available)
- [nvm](https://github.com/nvm-sh/nvm) (recommended for Node.js version management)
- npm (comes with Node.js)

### Development Setup

1. Fork and clone the repository
2. Install Node.js using nvm (if available): `nvm use`
3. Install dependencies: `npm install`
4. Start the file watcher: `npm run watch` or `npm run dev` *
5. Run `npm start` whenever you want to test your changes.

- This only watches for `typescript` changes, not html or sass.

### Project Tools

This project uses specific tools that you should familiarize yourself with:

- **npm**: Package management and script running
- **nvm**: Node.js version management
- **Biome**: Code formatting and linting
- **TypeScript**: Primary development language
- **Electron**: Desktop application framework

Please use these tools as they're configured in the project rather than introducing alternatives.

## 📝 Contribution Guidelines

### Pull Request Guidelines

- **Target the develop branch**: All pull requests should target the `develop` branch, not `master`. The `master` branch is reserved for stable releases.
- **Keep PRs focused**: Limit each pull request to **one specific change or feature**. This makes reviews easier and reduces the chance of conflicts.
- **Separate boyscouting**: Keep refactoring, renaming, and cleanup work in **separate PRs** from feature additions or bug fixes.
- **Clear descriptions**: Provide a clear description of what your PR does and why it's needed.
- **Reference issues**: Link to relevant issues using `Fixes #123` or `Closes #123`.
- **Don't update version files**: You don't need to update the changelog, version numbers, or package.json version. The maintainers will handle this during the release process when features/fixes are bundled together.

### Before You Start

- **Discuss first**: If you want to introduce something new (features, dependencies, architectural changes), it's best to discuss it first in [Issues](https://github.com/Mastermindzh/tidal-hifi/issues) or [Discussions](https://github.com/Mastermindzh/tidal-hifi/discussions).
- **Check existing work**: Look through existing issues and PRs to avoid duplicating effort.
- **Small changes first**: Consider starting with small bug fixes or documentation improvements to get familiar with the codebase.

### Code Standards

- Follow the existing code style and patterns
- Use **Biome** for formatting and linting: `npm run lint` and `npm run format`
- Write TypeScript with proper type definitions
- Add appropriate comments for complex logic, but please don't comment on every flow/line
- Follow existing naming conventions

### AI Usage Policy

- **AI assistance is allowed** for development, but you are **fully responsible** for:
  - The quality of code you submit
  - Understanding how your code works
  - Responding to feedback and questions about your implementation
  - Ensuring the code follows project standards and patterns

### Commit Guidelines

- Write clear, descriptive commit messages
- Try to use conventional commit format when possible (e.g., `feat:`, `fix:`, `docs:`, `refactor:`)
- Keep commits atomic (one logical change per commit)

### Testing

- Test your changes thoroughly before submitting
- Ensure the application builds successfully on at least 1 platform to not waste GH resources: `npm run build`
- Run linting: `npm run lint`
- Verify formatting: `npm run format`
- Test the application functionality manually

## 🐛 Bug Reports & 💡 Feature Requests

Please use our GitHub issue templates:

- **[Report a Bug](https://github.com/Mastermindzh/tidal-hifi/issues/new?template=bug_report.yml)**: Use this template to report bugs or issues
- **[Request a Feature](https://github.com/Mastermindzh/tidal-hifi/issues/new?template=feature_request.yml)**: Use this template to suggest new features or enhancements

Before creating a new issue, please search existing issues to avoid duplicates.

## 🔄 Review Process

- All submissions require review before merging
- Reviews may request changes or improvements
- Maintain a positive and collaborative attitude
- Understand that your code might not be merged.

## 📚 Resources

- [Project Documentation](./docs/)
- [Issues](https://github.com/Mastermindzh/tidal-hifi/issues)
- [Discussions](https://github.com/Mastermindzh/tidal-hifi/discussions)
- [Electron Documentation](https://www.electronjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Known issues](./docs/known-issues.md)

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project. See [LICENSE](./LICENSE) for details.

## 🤝 Code of Conduct

This project follows a standard code of conduct. Please be respectful, inclusive, and professional in all interactions.

## ❓ Questions?

If you have questions about contributing, feel free to:

- Open a [Discussion](https://github.com/Mastermindzh/tidal-hifi/discussions)
- Ask in an existing [Issue](https://github.com/Mastermindzh/tidal-hifi/issues)
- Reach out to the maintainers

Thank you for contributing to Tidal Hi-Fi! 🎵
