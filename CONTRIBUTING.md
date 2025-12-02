# Contributing to AI TestMind

Thank you for your interest in contributing to AI TestMind! 🎉

## 🌟 How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:

- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Environment details (OS, browser, Node version)

### Suggesting Features

We welcome feature suggestions! Please:

- Check if the feature already exists
- Describe the use case clearly
- Explain why this feature would be valuable
- Include mockups or examples if possible

### Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/bobby-sheng/AI TestMind.git
   cd AI TestMind
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Make your changes**
   - Follow the coding style
   - Add tests if applicable
   - Update documentation

5. **Test your changes**
   ```bash
   npm run lint
   npm test
   npm run build
   ```

6. **Commit your changes**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
   
   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes (formatting)
   - `refactor:` Code refactoring
   - `test:` Adding tests
   - `chore:` Maintenance tasks

7. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

8. **Create Pull Request**
   - Provide clear description
   - Reference related issues
   - Wait for review

## 📝 Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow ESLint rules
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

### Component Structure

```tsx
// components/MyComponent.tsx
import { useState } from 'react';

interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  const [state, setState] = useState(false);
  
  return (
    <div>
      <h2>{title}</h2>
      {/* Component JSX */}
    </div>
  );
}
```

### Testing

- Write unit tests for utilities
- Write integration tests for components
- Test happy paths and edge cases
- Aim for >80% coverage

### Documentation

- Update README.md if needed
- Add JSDoc comments for functions
- Update i18n files for new text
- Include examples in docs

## 🛠️ Project Structure

```
AI TestMind/
├── app/              # Next.js pages
├── components/       # React components
├── lib/              # Utilities
├── prisma/           # Database schema
├── executor/         # Python executor
└── i18n/            # Translations
```

## 🤝 Code Review Process

1. Maintainer reviews your PR
2. Discuss any needed changes
3. Make updates if requested
4. PR gets approved and merged
5. You become a contributor! 🎉

## 💬 Community

- **Discord**: Join our [Discord server](https://discord.gg/AI TestMind)
- **GitHub Discussions**: Ask questions and share ideas
- **Twitter**: Follow [@AI TestMind](https://twitter.com/AI TestMind)

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to AI TestMind!** 🧠✨

