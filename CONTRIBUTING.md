# Contributing to Azure SWA Fullstack Starter

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## Getting Started

### Prerequisites

- Node.js 20+
- Azure CLI
- Azure Functions Core Tools v4
- Git

### Local Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/azure-swa-fullstack-starter.git
   cd azure-swa-fullstack-starter
   ```

3. **Install dependencies**
   ```bash
   cd app
   npm install
   cd api && npm install && cd ..
   ```

4. **Create local configuration**
   ```bash
   cp ../.env.example .env
   ```

   Create `api/local.settings.json`:
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AzureWebJobsStorage": "",
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "COSMOS_DB_CONNECTION_STRING": "your-connection-string",
       "JWT_SECRET": "your-dev-secret-at-least-32-characters"
     }
   }
   ```

5. **Run tests to verify setup**
   ```bash
   npm test
   cd api && npm test
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names:
- `feature/add-export-functionality`
- `fix/login-validation-error`
- `docs/update-api-documentation`
- `refactor/improve-auth-module`

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the existing code style
   - Write tests for new functionality
   - Update documentation if needed

3. **Run tests**
   ```bash
   cd app && npm test
   cd api && npm test
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(auth): add password reset functionality
fix(dashboard): correct revenue calculation
docs(readme): update deployment instructions
test(api): add validation tests
```

## Pull Request Process

1. **Update your branch** with the latest main
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create a Pull Request**
   - Use a clear, descriptive title
   - Fill in the PR template
   - Link any related issues

4. **Address review feedback**
   - Make requested changes
   - Push additional commits
   - Request re-review when ready

### PR Requirements

- [ ] All tests pass
- [ ] Code follows project style guidelines
- [ ] Documentation updated (if applicable)
- [ ] No linting errors
- [ ] Commits follow conventional format

## Code Style Guidelines

### TypeScript/JavaScript

- Use TypeScript for all new code
- Use meaningful variable and function names
- Prefer `const` over `let`, avoid `var`
- Use async/await over raw promises
- Export types and interfaces

### React Components

- Use functional components with hooks
- Use the shared UI components from `src/components/ui`
- Follow the existing file naming convention (PascalCase for components)
- Keep components focused and single-purpose

### CSS/Tailwind

- Use Tailwind CSS utility classes
- Use the `primary` colour palette for brand colours
- Ensure responsive design (mobile-first)
- Use `cn()` utility for conditional classes

### API Functions

- Use the shared utilities from `api/src/shared/`
- Implement proper error handling
- Return consistent response formats
- Add input validation for all endpoints

## Testing

### Frontend Tests

```bash
cd app
npm test              # Run tests
npm test -- --watch   # Watch mode
npm test -- --coverage # With coverage
```

### API Tests

```bash
cd app/api
npm test
npm test -- --watch
```

### Writing Tests

- Place test files next to the code they test (`*.test.ts`)
- Use descriptive test names
- Test edge cases and error conditions
- Mock external dependencies

## Documentation

### Code Documentation

- Add JSDoc comments for public functions
- Document complex logic with inline comments
- Keep comments up to date with code changes

### Project Documentation

- Update `README.md` for user-facing changes
- Update `ARCHITECTURE.md` for structural changes
- Update `docs/` for feature-specific documentation

## Reporting Issues

### Bug Reports

Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behaviour
- Browser/environment details
- Screenshots (if applicable)

### Feature Requests

Include:
- Clear description of the feature
- Use case / problem it solves
- Proposed implementation (optional)
- Willingness to contribute

## Questions?

- Check existing issues and discussions
- Open a new issue for questions
- Be patient and respectful

---

Thank you for contributing! 🎉
