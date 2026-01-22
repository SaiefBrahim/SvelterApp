# Contributing to SvelterApp

First off, thank you for considering contributing to SvelterApp! It's people like you that make SvelterApp such a great project.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title** for the issue to identify the problem.
- **Describe the exact steps to reproduce the problem** in as many details as possible.
- **Describe the behavior you observed** after following the steps.
- **Describe the behavior you expected** to see instead.
- **Include screenshots and animated GIFs** if applicable.
- **Include environment details**:
  - OS and version
  - Node.js version
  - Package manager (pnpm/npm/yarn) and version
  - Database version (PostgreSQL)
  - Browser (if applicable)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title** for the issue.
- **Provide a step-by-step description** of the suggested enhancement.
- **Provide specific examples** to demonstrate the steps.
- **Describe the current behavior** and explain which behavior you expected to see instead.
- **Explain why this enhancement would be useful** to most SvelterApp users.

### Pull Requests

- Fill in the required template
- Do not include issue numbers in the PR title
- Include screenshots and animated GIFs in your pull request whenever possible
- Follow the TypeScript and Svelte styleguides
- Include thoughtfully-worded, well-structured tests
- Document new code based on the Documentation Styleguide
- End all files with a newline

## Development Process

### Getting Started

1. **Fork the repository**

   Click the "Fork" button at the top right of the repository page.

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/SvelterApp.git
   cd SvelterApp
   ```

3. **Add the upstream remote**

   ```bash
   git remote add upstream https://github.com/SaiefBrahim/SvelterApp.git
   ```

4. **Create a branch**

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

5. **Install dependencies**

   ```bash
   pnpm install
   ```

6. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Update the `.env` file with your configuration.

7. **Set up the database**

   ```bash
   pnpm db:generate
   pnpm db:migrate
   pnpm db:seed
   ```

8. **Start the development server**

   ```bash
   pnpm dev
   ```

### Making Changes

1. **Make your changes** following the coding standards below
2. **Test your changes** thoroughly
3. **Update documentation** if needed
4. **Commit your changes** with clear commit messages

### Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

**Examples:**
```
feat(auth): add email verification flow
fix(rbac): correct permission check for managers
docs(readme): update installation instructions
refactor(ui): simplify sidebar component
```

### Submitting Changes

1. **Ensure your code follows the style guidelines**
2. **Run type checking**

   ```bash
   pnpm check
   ```

3. **Ensure all tests pass** (if applicable)
4. **Update the README.md** if needed
5. **Push to your fork**

   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**

   - Go to the [SvelterApp repository](https://github.com/SaiefBrahim/SvelterApp)
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill out the PR template
   - Submit the pull request

## Coding Standards

### TypeScript

- Use **TypeScript** for all code
- Enable strict mode
- Use interfaces over types when possible
- Avoid `any` types - use proper typing
- Use meaningful variable and function names

### Svelte

- Use **Svelte 5 runes**:
  - `$state()` for reactive state
  - `$derived()` for computed values
  - `$effect()` for side effects
  - `$props()` for component props
- Follow Svelte naming conventions:
  - Component files: `kebab-case.svelte`
  - Component names in code: `PascalCase`
  - Variables and functions: `camelCase`
- Keep components focused and reusable
- Use proper prop types with TypeScript

### Styling

- Use **Tailwind CSS** utility classes
- Follow the existing design system
- Use Shadcn-svelte components from `$lib/components/ui`
- Ensure responsive design
- Maintain accessibility standards

### File Structure

- Keep files organized in logical directories
- Use consistent naming conventions
- Group related functionality together
- Keep components small and focused

### RBAC & Security

- Always use permission guards for protected routes
- Never bypass security checks
- Validate all user inputs
- Use parameterized queries (Prisma handles this)
- Follow the principle of least privilege

### Internationalization

- Add translations for all user-facing strings
- Use Paraglide.js for i18n
- Add translations to all language files:
  - `messages/en.json`
  - `messages/fr.json`
  - `messages/ar.json`
- Test with different languages

### Code Comments

- Write clear, concise comments
- Explain "why" not "what"
- Use JSDoc for functions and classes
- Keep comments up-to-date with code changes

## Testing

- Write tests for new features
- Ensure existing tests still pass
- Test edge cases and error scenarios
- Test with different user roles and permissions

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for new functions
- Update inline code comments
- Keep documentation examples current

## Review Process

1. All pull requests require review
2. Maintainers will review your PR
3. Address any feedback or requested changes
4. Once approved, your PR will be merged

## Questions?

If you have questions about contributing:

- Open a [GitHub Discussion](https://github.com/SaiefBrahim/SvelterApp/discussions)
- Create an issue with the `question` label
- Check existing issues and discussions

## Recognition

Contributors will be recognized in:
- The project README (if significant contributions)
- Release notes (for major contributions)
- GitHub contributors page

Thank you for contributing to SvelterApp! 🎉
