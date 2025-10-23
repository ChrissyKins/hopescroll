# HopeScroll

A personalized content aggregation platform for discovering and managing content from multiple sources.

## Overview

HopeScroll helps you curate and discover content from YouTube, Twitch, RSS feeds, and podcasts in one unified feed. Built with a clean hexagonal architecture for maintainability and extensibility.

### Key Features

- **Multi-platform aggregation** - YouTube, Twitch, RSS, Podcasts
- **Intelligent feed generation** - Balanced mix of new and backlog content
- **Content filtering** - Keyword-based filtering with wildcard support
- **Collections** - Organize saved content with notes
- **Duration filtering** - Filter by content length
- **Watch history** - Track what you've watched
- **Clean architecture** - Testable, maintainable codebase

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL with Prisma ORM
- **Styling:** Tailwind CSS + Design System
- **Testing:** Vitest
- **Authentication:** NextAuth.js v5

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Git

### Installation

```bash
# Clone repository
git clone <repository-url>
cd hopescroll

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**For detailed setup:** See [Getting Started Tutorial](./docs/tutorials/getting-started.md)

## Documentation

Comprehensive documentation following the [Diátaxis framework](https://diataxis.fr/):

- **[Getting Started](./docs/tutorials/getting-started.md)** - New to HopeScroll? Start here
- **[Architecture](./docs/reference/architecture.md)** - Understanding the codebase
- **[Contributing](./docs/CONTRIBUTING.md)** - How to contribute
- **[API Reference](./docs/reference/api.md)** - API documentation

**Full documentation:** [docs/README.md](./docs/README.md)

## Project Structure

```
hopescroll/
├── app/                    # Next.js App Router (pages & API routes)
├── domain/                 # Business logic (pure TypeScript)
├── adapters/               # External integrations (YouTube, Twitch, DB)
├── services/               # Application services
├── components/             # React components
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities
├── prisma/                 # Database schema & migrations
└── docs/                   # Documentation
```

## Development

```bash
# Development server
npm run dev

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Database tools
npm run db:studio    # Prisma Studio
npm run db:migrate   # Run migrations
npm run db:generate  # Generate Prisma client
```

## Architecture

HopeScroll follows **hexagonal (ports and adapters) architecture**:

- **Domain layer** - Pure business logic, framework-agnostic
- **Adapter layer** - External system integrations
- **Application layer** - Orchestration and coordination
- **Presentation layer** - UI and user interaction

**Learn more:** [Architecture Overview](./docs/reference/architecture.md)

## Contributing

We welcome contributions! Please read our [Contributing Guide](./docs/CONTRIBUTING.md) for:

- Development setup
- Coding standards
- Testing requirements
- Pull request process

## Documentation for AI Assistants

If you're an AI coding assistant working on this project, see [CLAUDE.md](./CLAUDE.md) for:

- Architecture guidelines
- Coding standards
- Common patterns
- Documentation requirements

## License

[Your License Here]

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [NextAuth.js](https://next-auth.js.org/)
- [Vitest](https://vitest.dev/)

---

**Questions?** Check the [documentation](./docs/README.md) or open an issue.
