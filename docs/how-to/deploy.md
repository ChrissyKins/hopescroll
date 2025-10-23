# How to Deploy HopeScroll

**Version:** 1.0
**Last Updated:** 2025-10-23

This guide covers deploying HopeScroll to production.

---

## Prerequisites

- Vercel account (recommended) or other Next.js-compatible host
- PostgreSQL database (Neon, Supabase, or self-hosted)
- Domain name (optional)
- API keys for external services

---

## Environment Variables

### Required Variables

Create a `.env.production` file or set in hosting dashboard:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/hopescroll"
POSTGRES_URL="postgresql://user:password@host:5432/hopescroll" # For Neon

# Authentication
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# External APIs
YOUTUBE_API_KEY="your-youtube-api-key"
RESEND_API_KEY="your-resend-api-key"

# Optional
NODE_ENV="production"
LOG_LEVEL="info"
```

### Generating Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Deployment Steps

### Option 1: Vercel (Recommended)

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Login and link project
   vercel login
   vercel link
   ```

2. **Set Environment Variables**
   ```bash
   # Via CLI
   vercel env add DATABASE_URL
   vercel env add NEXTAUTH_SECRET
   vercel env add YOUTUBE_API_KEY
   vercel env add RESEND_API_KEY

   # Or via Vercel Dashboard:
   # Project Settings → Environment Variables
   ```

3. **Deploy**
   ```bash
   # Deploy to production
   vercel --prod

   # Or push to main branch (auto-deploys if connected to GitHub)
   git push origin main
   ```

4. **Run Database Migrations**
   ```bash
   # After first deployment, run migrations
   npm run db:migrate
   ```

5. **Set Up Cron Job**

   Add to `vercel.json`:
   ```json
   {
     "crons": [{
       "path": "/api/cron/fetch-content",
       "schedule": "0 * * * *"
     }]
   }
   ```

### Option 2: Docker

1. **Create Dockerfile** (already exists in project root)

2. **Build Image**
   ```bash
   docker build -t hopescroll:latest .
   ```

3. **Run Container**
   ```bash
   docker run -d \
     -p 3000:3000 \
     -e DATABASE_URL="your-db-url" \
     -e NEXTAUTH_SECRET="your-secret" \
     -e YOUTUBE_API_KEY="your-key" \
     -e RESEND_API_KEY="your-key" \
     hopescroll:latest
   ```

### Option 3: VPS (Ubuntu)

1. **Install Dependencies**
   ```bash
   # Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # PM2 for process management
   sudo npm install -g pm2
   ```

2. **Clone and Build**
   ```bash
   git clone https://github.com/your-repo/hopescroll.git
   cd hopescroll
   npm install
   npm run build
   ```

3. **Set Environment Variables**
   ```bash
   cp .env.example .env.production
   nano .env.production  # Edit with your values
   ```

4. **Start with PM2**
   ```bash
   pm2 start npm --name "hopescroll" -- start
   pm2 save
   pm2 startup  # Auto-start on reboot
   ```

5. **Set Up Nginx (optional)**
   ```nginx
   server {
     listen 80;
     server_name your-domain.com;

     location / {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```

---

## Database Setup

### Neon (Recommended)

1. Create database at [neon.tech](https://neon.tech)
2. Copy connection string
3. Set `DATABASE_URL` environment variable
4. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

### Self-Hosted PostgreSQL

1. **Install PostgreSQL**
   ```bash
   sudo apt-get install postgresql postgresql-contrib
   ```

2. **Create Database**
   ```bash
   sudo -u postgres psql
   CREATE DATABASE hopescroll;
   CREATE USER hopescroll_user WITH PASSWORD 'secure-password';
   GRANT ALL PRIVILEGES ON DATABASE hopescroll TO hopescroll_user;
   ```

3. **Run Migrations**
   ```bash
   DATABASE_URL="postgresql://hopescroll_user:password@localhost:5432/hopescroll" \
     npx prisma migrate deploy
   ```

---

## Post-Deployment Checklist

### Immediate

- [ ] Verify site loads: `https://your-domain.com`
- [ ] Test authentication (sign up, login, password reset)
- [ ] Add a test YouTube channel
- [ ] Verify content fetching works
- [ ] Check feed generation
- [ ] Test filters and saved content

### Configuration

- [ ] Set up custom domain (if using Vercel)
- [ ] Configure SSL certificate (auto with Vercel)
- [ ] Set up cron job for content fetching
- [ ] Configure error monitoring (Sentry, LogRocket)
- [ ] Set up analytics (optional)

### Security

- [ ] Enable HTTPS (should be default)
- [ ] Set secure headers (Next.js does this)
- [ ] Verify `NEXTAUTH_SECRET` is strong
- [ ] Check database connection uses SSL
- [ ] Review API key permissions (YouTube, Resend)

### Monitoring

- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure error alerts
- [ ] Set up performance monitoring
- [ ] Enable database query logging (development only)

---

## Troubleshooting

### Build Fails

**Symptom:** Build errors during deployment

**Common causes:**
- Missing environment variables
- TypeScript errors
- Dependency conflicts

**Fix:**
```bash
# Run build locally first
npm run build

# Check for TypeScript errors
npm run type-check

# Ensure all deps installed
rm -rf node_modules package-lock.json
npm install
```

### Database Connection Errors

**Symptom:** "Can't reach database server"

**Fix:**
- Verify `DATABASE_URL` is correct
- Check database is running and accessible
- Ensure connection string includes SSL mode: `?sslmode=require`
- Check firewall allows connections

### Authentication Not Working

**Symptom:** Can't log in, session errors

**Fix:**
- Verify `NEXTAUTH_URL` matches your domain
- Check `NEXTAUTH_SECRET` is set
- Clear browser cookies
- Check session storage (database)

### Cron Job Not Running

**Symptom:** Content not fetching automatically

**Fix:**
- Verify cron configuration in `vercel.json`
- Check cron endpoint works: `curl https://your-domain.com/api/cron/fetch-content`
- Review cron logs in Vercel dashboard
- Ensure API route has proper authentication bypass for cron

### Slow Performance

**Symptom:** Pages load slowly

**Fix:**
- Enable Vercel's Edge Caching
- Optimize database queries (check indexes)
- Add Redis caching layer
- Use database connection pooling
- Enable Next.js ISR (Incremental Static Regeneration)

---

## Scaling Considerations

### Database

**When to scale:**
- > 100 users
- > 10,000 content items
- Query times > 500ms

**How to scale:**
- Upgrade database plan (more RAM/CPU)
- Add read replicas
- Implement connection pooling (PgBouncer)
- Add database indexes (check EXPLAIN ANALYZE)

### Application

**When to scale:**
- > 1,000 daily users
- Response times > 2s
- High CPU usage

**How to scale:**
- Vercel auto-scales (no action needed)
- Add Redis for caching
- Use CDN for static assets
- Implement API rate limiting

### External APIs

**YouTube API:**
- Monitor quota usage (10,000 units/day)
- Implement exponential backoff
- Cache responses aggressively
- Consider multiple API keys

---

## Maintenance

### Regular Tasks

**Daily:**
- Check error logs
- Monitor API quota usage
- Verify cron jobs ran successfully

**Weekly:**
- Review performance metrics
- Check database size/growth
- Update dependencies (if needed)

**Monthly:**
- Security updates
- Database backup verification
- User feedback review

### Backups

**Database:**
```bash
# Manual backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup-20250123.sql
```

**Automated backups:**
- Neon: Automatic point-in-time recovery (14 days)
- Vercel: Automatic PostgreSQL backups
- Self-hosted: Set up cron job for daily backups

---

## Rollback Procedure

If deployment breaks production:

1. **Immediate Rollback (Vercel)**
   ```bash
   # Via dashboard: Deployments → Previous → Promote to Production
   # Or via CLI:
   vercel rollback
   ```

2. **Database Rollback**
   ```bash
   # If migration caused issue
   npx prisma migrate resolve --rolled-back MIGRATION_NAME
   ```

3. **Verify**
   ```bash
   # Check site works
   curl https://your-domain.com
   # Test critical paths
   npm run test:e2e
   ```

---

## Cost Estimates

### Vercel + Neon (Recommended)

| Service | Plan | Cost |
|---------|------|------|
| Vercel Hosting | Hobby | $0/mo (free tier) |
| Neon Database | Free | $0/mo (1 project) |
| Resend Email | Free | $0/mo (100 emails/day) |
| **Total** | | **$0/mo** |

**Pro tier (for growth):**
- Vercel Pro: $20/mo
- Neon Scale: $19/mo
- Resend Starter: $10/mo
- **Total: $49/mo**

### VPS Alternative

| Service | Provider | Cost |
|---------|----------|------|
| VPS | DigitalOcean | $6/mo (1GB RAM) |
| Database | Self-hosted | $0 |
| Domain | Namecheap | $10/yr |
| **Total** | | **~$7/mo** |

---

## Production-Ready Checklist

Before going live:

- [ ] All environment variables set
- [ ] Database migrations run successfully
- [ ] SSL certificate active
- [ ] Custom domain configured
- [ ] Cron jobs configured and tested
- [ ] Error monitoring enabled
- [ ] Backups configured
- [ ] Performance tested (> 100 users)
- [ ] Security headers verified
- [ ] API rate limits tested
- [ ] Documentation updated
- [ ] Rollback procedure tested

---

## Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)
- [Neon Documentation](https://neon.tech/docs)

---

**Questions?** Open an issue or contact support.
