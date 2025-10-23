# HopeScroll Documentation

Welcome to the HopeScroll documentation. This documentation follows the [Diátaxis framework](https://diataxis.fr/) for clear, organized technical documentation.

## Documentation Structure

Our documentation is organized into four categories:

### 📚 [Tutorials](./tutorials/)
**Learning-oriented** - Step-by-step lessons for getting started
- [Getting Started](./tutorials/getting-started.md)
- [Your First Content Source](./tutorials/first-content-source.md)

### 🔧 [How-To Guides](./how-to/)
**Problem-oriented** - Practical guides for specific tasks
- [Adding Content Sources](./how-to/add-content-sources.md)
- [Managing Collections](./how-to/manage-collections.md)
- [Setting Up Filters](./how-to/setup-filters.md)
- [Deployment Guide](./how-to/deploy.md)

### 📖 [Reference](./reference/)
**Information-oriented** - Technical descriptions and specifications
- [Architecture Overview](./reference/architecture.md)
- [API Reference](./reference/api.md)
- [Database Schema](./reference/database-schema.md)
- [Design System](./reference/design-system.md)
- [Configuration](./reference/configuration.md)

### 💡 [Explanation](./explanation/)
**Understanding-oriented** - Concepts and design decisions
- [Feed Algorithm](./explanation/feed-algorithm.md)
- [Content Filtering](./explanation/content-filtering.md)
- [Architecture Decisions](./explanation/architecture-decisions.md)

### 📋 [Planning](./planning/)
**Project planning and vision documents**
- [Product Vision](./planning/PRODUCT_VISION.md)
- [Feature Roadmap](./planning/FEATURE_ROADMAP.md)
- [Design Decisions](./planning/DESIGN_DECISIONS.md)

---

## Quick Links

- **For New Developers:** Start with [Getting Started Tutorial](./tutorials/getting-started.md)
- **For Contributors:** Read [Contributing Guide](./CONTRIBUTING.md)
- **For Deployment:** See [Deployment Guide](./how-to/deploy.md)
- **For AI Assistants:** See [CLAUDE.md](../CLAUDE.md)

---

## Project Overview

**HopeScroll** is a content aggregation and curation platform that helps users discover and manage content from multiple sources (YouTube, Twitch, RSS, Podcasts).

### Key Features
- Multi-platform content aggregation
- Intelligent feed generation with diversity controls
- Keyword filtering and content muting
- Collections for organizing saved content
- Duration-based filtering
- Clean hexagonal architecture

### Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Styling:** Tailwind CSS
- **Testing:** Vitest
- **Authentication:** NextAuth.js v5

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, coding standards, and contribution guidelines.

---

## Documentation Standards

This documentation follows these principles:

1. **Separation of concerns** - Each doc type serves a specific purpose
2. **User-focused** - Written for the reader's needs, not the writer's
3. **Maintainable** - Easy to update as the codebase evolves
4. **Discoverable** - Clear navigation and cross-references
5. **Accurate** - Kept in sync with code changes

For more details, see [Documentation Strategy](./DOCUMENTATION.md).
