# Contributing to HopeScroll

Thank you for your interest in contributing! This guide will help you get started.

## Code of Conduct

- Be respectful and constructive
- Focus on the problem, not the person
- Welcome newcomers and help them learn
- Follow project standards and conventions

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a branch** for your changes: `git checkout -b feature/your-feature-name`
4. **Make your changes** following our guidelines below
5. **Test thoroughly** - all tests must pass
6. **Submit a pull request** with a clear description

See [Getting Started Tutorial](./tutorials/getting-started.md) for development setup.

## Development Workflow

### 1. Pick an Issue

- Check the [Issues](https://github.com/yourusername/hopescroll/issues) page
- Look for `good first issue` or `help wanted` labels
- Comment on the issue to let others know you're working on it

### 2. Create a Branch

```bash
# Feature branch
git checkout -b feature/add-user-notifications

# Bug fix branch
git checkout -b fix/feed-loading-error

# Documentation branch
git checkout -b docs/update-api-reference
```

### 3. Make Changes

Follow our [Coding Standards](#coding-standards) below.

### 4. Test Your Changes

```bash
# Run all tests
npm run test

# Run specific test file
npm run test path/to/test.test.ts

# Check TypeScript types
npx tsc --noEmit

# Lint code
npm run lint
```

### 5. Commit Your Changes

Write clear, descriptive commit messages:

```bash
# Good commit messages
git commit -m "Add user notification system"
git commit -m "Fix feed loading error on empty sources"
git commit -m "Update API documentation for /api/feed"

# Bad commit messages
git commit -m "fix bug"
git commit -m "wip"
git commit -m "asdf"
```

**Commit message format:**
```
[type]: [short description]

[optional detailed description]

[optional footer with issue references]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Example:**
```
feat: Add collection management UI

- Add collection creation dialog
- Implement collection list view
- Add saved item assignment to collections

Closes #123
```

### 6. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Open a pull request on GitHub with:
- Clear title describing the change
- Description of what changed and why
- Screenshots for UI changes
- Reference to related issues

## Coding Standards

### TypeScript

- **Strict mode enabled** - No `any` types without good reason
- **Explicit return types** on functions
- **Interfaces over types** for object shapes
- **Descriptive names** - `getUserById` not `get`

**Good:**
```typescript
interface User {
  id: string;
  email: string;
}

async function getUserById(id: string): Promise<User | null> {
  return await prisma.user.findUnique({ where: { id } });
}
```

**Bad:**
```typescript
async function get(id: any) {
  return await prisma.user.findUnique({ where: { id } });
}
```

### React Components

- **Functional components** with hooks
- **TypeScript props** - Always type your props
- **Component co-location** - Keep related files together
- **Client/Server components** - Mark client components with `'use client'`

**Good:**
```typescript
'use client';

interface ButtonProps {
  variant: 'primary' | 'danger';
  onClick: () => void;
  children: ReactNode;
}

export function Button({ variant, onClick, children }: ButtonProps) {
  return (
    <button onClick={onClick} className={styles[variant]}>
      {children}
    </button>
  );
}
```

### File Naming

- **kebab-case** for files: `feed-generator.ts`, `user-profile.tsx`
- **PascalCase** for components: `FeedCard.tsx`, `UserAvatar.tsx`
- **camelCase** for utilities: `formatDate.ts`, `debounce.ts`

### Architecture

Follow our [hexagonal architecture](./reference/architecture.md):

- **Domain logic** in `/domain` - Pure TypeScript, no frameworks
- **Adapters** in `/adapters` - External integrations
- **Services** in `/services` - Orchestration
- **UI components** in `/components` - Presentation only

**Domain layer rules:**
- No imports from `next`, `react`, or `prisma`
- Pure functions where possible
- Interfaces for external dependencies
- Comprehensive unit tests

**Good:**
```typescript
// domain/feed/feed-generator.ts
export function generateFeed(
  items: ContentItem[],
  preferences: UserPreferences
): ContentItem[] {
  // Pure logic, no external dependencies
}
```

**Bad:**
```typescript
// domain/feed/feed-generator.ts
import { prisma } from '@/lib/db'; // ❌ No DB in domain

export async function generateFeed(userId: string) {
  const items = await prisma.contentItem.findMany(); // ❌ No DB calls
}
```

### Styling

- **Tailwind CSS** for styling
- **Design system components** from `/components/ui`
- **Consistent spacing** - Use design system spacing scale
- **Dark mode first** - All colors work on dark backgrounds

See [Design System Reference](./reference/design-system.md).

### Testing

- **Unit tests** for domain logic (required)
- **Integration tests** for API routes (recommended)
- **Component tests** for complex UI (recommended)
- **Test file naming**: `*.test.ts` or `*.test.tsx`

**Test structure:**
```typescript
import { describe, it, expect } from 'vitest';

describe('generateFeed', () => {
  it('should return items sorted by publish date', () => {
    // Arrange
    const items = [/* test data */];

    // Act
    const result = generateFeed(items, defaultPreferences);

    // Assert
    expect(result[0].publishedAt).toBeGreaterThan(result[1].publishedAt);
  });
});
```

### API Routes

- **Input validation** with Zod schemas
- **Error handling** with try-catch
- **Authentication** where required
- **Consistent response format**

**Good:**
```typescript
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = createSourceSchema.parse(body);

    // ... handle request

    return Response.json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors }, { status: 400 });
    }
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

## Documentation

### When to Update Docs

Update documentation when you:
- Add a new feature
- Change API behavior
- Modify architecture
- Add configuration options
- Change database schema

### Documentation Types

Follow our [Diátaxis framework](./README.md):

- **Tutorials** - Learning-oriented, step-by-step
- **How-to guides** - Task-oriented, problem-solving
- **Reference** - Information-oriented, technical specs
- **Explanation** - Understanding-oriented, concepts

See [Documentation Strategy](./DOCUMENTATION.md) for details.

### Code Comments

- **Why, not what** - Explain reasoning, not obvious code
- **Complex logic** - Add comments for non-obvious algorithms
- **TODOs** - Include issue number: `// TODO(#123): Implement retry logic`

**Good:**
```typescript
// Use exponential backoff to avoid overwhelming external APIs
// during temporary outages
const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
```

**Bad:**
```typescript
// Set delay to minimum of 1000 * 2^attempt and 30000
const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
```

## Pull Request Process

### Before Submitting

- [ ] All tests pass (`npm run test`)
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] Linting passes (`npm run lint`)
- [ ] Documentation updated if needed
- [ ] Screenshots included for UI changes
- [ ] Commit messages are clear and descriptive

### PR Description Template

```markdown
## Description
Brief description of what this PR does

## Changes
- List of specific changes
- Another change

## Testing
How to test this change

## Screenshots (if UI change)
Before/after screenshots

## Related Issues
Closes #123
```

### Review Process

1. Automated checks must pass
2. At least one maintainer approval required
3. Address all review comments
4. Squash commits before merge (maintainer will handle)

## Project-Specific Guidelines

### Adding a New Content Source Adapter

See [How to Add Content Sources](./how-to/add-content-sources.md).

**Requirements:**
- Implement `ContentAdapter` interface
- Add corresponding `SourceType` enum value
- Update database schema if needed
- Add unit tests
- Update documentation

### Modifying the Feed Algorithm

Feed algorithm changes require:
- Tests demonstrating expected behavior
- Documentation explaining the change
- Performance considerations
- Discussion in an issue first

### Database Schema Changes

1. Modify `prisma/schema.prisma`
2. Run `npm run db:migrate`
3. Update [Database Schema docs](./reference/database-schema.md)
4. Consider backward compatibility
5. Add migration to PR

## Getting Help

- **Questions?** Open a discussion on GitHub
- **Bug reports** Use issue templates
- **Feature requests** Discuss in issues first
- **Unclear guidelines?** Ask in your PR

## Recognition

Contributors are recognized in:
- GitHub contributors page
- Release notes for significant contributions
- Project README (for major features)

Thank you for contributing to HopeScroll! 🎉
