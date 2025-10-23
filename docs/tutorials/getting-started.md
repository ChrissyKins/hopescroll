# Getting Started with HopeScroll

**Estimated time:** 15 minutes

This tutorial will guide you through setting up HopeScroll locally and understanding the basics of the project.

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 20+ installed ([Download](https://nodejs.org/))
- **PostgreSQL** database (local or cloud)
- **Git** for version control
- A code editor (VS Code recommended)

## Step 1: Clone and Install

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd hopescroll
npm install
```

You should see dependencies being installed. This may take a few minutes.

## Step 2: Set Up Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and configure the required variables:

```env
# Database
POSTGRES_URL="postgresql://user:password@localhost:5432/hopescroll"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"  # Generate with: openssl rand -base64 32

# Optional: Content Source API Keys
YOUTUBE_API_KEY="your-youtube-api-key"
TWITCH_CLIENT_ID="your-twitch-client-id"
TWITCH_CLIENT_SECRET="your-twitch-client-secret"
```

**Important:** For development, you must have a PostgreSQL database running.

## Step 3: Set Up Database

Run the database migrations:

```bash
npm run db:migrate
```

This creates all necessary tables in your database. You should see output like:

```
✓ Generated Prisma Client
✓ Migrations applied successfully
```

## Step 4: Start Development Server

Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

You should see the HopeScroll login page.

## Step 5: Create Your First Account

1. Navigate to the signup page
2. Enter your email and password
3. Click "Sign Up"

You'll be redirected to the feed page (which will be empty since you haven't added any sources yet).

## Step 6: Explore the Interface

Now that you're logged in, you'll see:

- **Scroll** - Your personalized content feed
- **Sources** - Manage content sources (YouTube, Twitch, RSS)
- **Filters** - Set up keyword filters
- **Saved** - View saved content
- **History** - See your watch history

## Step 7: Add Your First Content Source

Continue to [Your First Content Source Tutorial](./first-content-source.md) to learn how to add and configure content sources.

## Understanding the Project Structure

```
hopescroll/
├── app/          # Next.js pages and API routes
├── domain/       # Business logic (pure TypeScript)
├── adapters/     # External integrations (YouTube, Twitch, DB)
├── components/   # React UI components
├── prisma/       # Database schema
└── docs/         # Documentation (you are here!)
```

**Key concepts:**
- **Domain layer** - Core business logic, no framework dependencies
- **Adapter layer** - Integrations with external systems
- **App layer** - Next.js routes and pages

For more details, see [Architecture Overview](../reference/architecture.md).

## Running Tests

HopeScroll uses Vitest for testing:

```bash
# Run tests once
npm run test

# Run tests in watch mode
npm run test:watch
```

You should see tests passing. If any fail, check your database connection.

## Development Tools

### Prisma Studio

View and edit your database directly:

```bash
npm run db:studio
```

Opens at [http://localhost:5555](http://localhost:5555)

### TypeScript Checking

```bash
npx tsc --noEmit
```

### Linting

```bash
npm run lint
```

## Next Steps

Congratulations! You now have HopeScroll running locally.

**Continue learning:**
1. [Add Your First Content Source](./first-content-source.md)
2. [Understanding the Feed Algorithm](../explanation/feed-algorithm.md)
3. [Contributing Guide](../CONTRIBUTING.md)

## Troubleshooting

### Database Connection Issues

**Error:** `Can't reach database server`

**Solution:** Ensure PostgreSQL is running and `POSTGRES_URL` is correct.

```bash
# Check if PostgreSQL is running
pg_isready

# Test connection
psql $POSTGRES_URL
```

### Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:** Kill the process or use a different port:

```bash
PORT=3001 npm run dev
```

### Prisma Client Issues

**Error:** `@prisma/client did not initialize yet`

**Solution:** Regenerate the Prisma client:

```bash
npm run db:generate
```

## Getting Help

- Check [How-To Guides](../how-to/) for specific tasks
- Review [Architecture Documentation](../reference/architecture.md)
- Open an issue on GitHub
- Check existing issues for similar problems

---

**Next Tutorial:** [Your First Content Source →](./first-content-source.md)
