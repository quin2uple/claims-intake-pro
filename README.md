# Claims Intake Pro

An internal tool for discovering and managing class action lawsuits, mass arbitrations, and mass torts. Built with React, Express, PostgreSQL, and Docker.

![Claims Intake Pro](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🎯 Overview

Claims Intake Pro automatically discovers new open class actions, mass arbitrations, and mass torts from multiple sources, deduplicates entries using intelligent fuzzy matching, and presents them in a clean dashboard for internal review and approval.

### Key Features

- ✅ **Automated Discovery** - Scrapes from ClaimDepot, ClassAction.org, and TopClassActions
- 🔍 **Smart Deduplication** - Multi-level fuzzy matching to prevent duplicate entries
- 📊 **Review Dashboard** - Modern UI for approving, rejecting, and managing cases
- 🚨 **Duplicate Flagging** - Automatically flags potential duplicates for manual review
- ⏱️ **Scheduled Scraping** - Configurable cron jobs for continuous monitoring
- 📈 **Analytics** - Track processing time, resolution rates, and source performance

## 🏗️ Architecture

Built with **Clean Architecture** principles for maintainability and scalability.

```
packages/backend/
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Database migrations
├── src/
│   ├── controllers/          # Request/Response handlers
│   ├── services/             # Business logic (class-based)
│   ├── routes/               # API route definitions
│   ├── scrapers/             # Web scraper implementations
│   ├── types/                # TypeScript type definitions
│   ├── utils/                # Utility functions & transformers
│   ├── database/             # Prisma client setup
│   └── index.ts              # Application entry point

packages/frontend/
├── src/
│   ├── components/           # Reusable UI components
│   ├── pages/                # Page components
│   └── lib/                  # API client & utilities
```

### Architecture Layers

1. **Routes** → Define endpoints
2. **Controllers** → Handle HTTP requests/responses
3. **Services** → Business logic (class-based with singleton instances)
4. **Database** → Prisma ORM for type-safe queries
5. **Types** → Centralized TypeScript definitions

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker & Docker Compose

### First Time Setup

**⚠️ IMPORTANT: Before running, you must generate Prisma Client:**

```bash
# 1. Install dependencies
pnpm install

# 2. Generate Prisma Client (REQUIRED!)
cd packages/backend
pnpm prisma:generate

# 3. Copy environment file
cp .env.example .env

# 4. Start with Docker
docker-compose up --build
```

**📖 See `FIRST_RUN.md` for detailed first-time setup**
**⚡ See `QUICKSTART.md` for a 5-minute guided setup**

### After First Setup

```bash
# Start all services
docker-compose up

# Or development mode
docker-compose up postgres    # Terminal 1
cd packages/backend && pnpm dev    # Terminal 2  
cd packages/frontend && pnpm dev   # Terminal 3
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432

### Development Mode

```bash
# Terminal 1: Start PostgreSQL
docker-compose up postgres

# Terminal 2: Start backend
cd packages/backend
pnpm dev

# Terminal 3: Start frontend
cd packages/frontend
pnpm dev
```

## 📚 Usage

### Running Scrapers

#### Automatic (Scheduled)
Scrapers run automatically based on the `SCRAPER_CRON` environment variable (default: every 6 hours).

#### Manual
```bash
# Run all scrapers
pnpm scrape

# Or from backend package
cd packages/backend
pnpm scrape
```

### API Endpoints

#### Cases
- `GET /api/cases` - List all cases with filters
- `GET /api/cases/:id` - Get case details
- `POST /api/cases` - Create manual case
- `PATCH /api/cases/:id/status` - Update case status
- `DELETE /api/cases/:id` - Soft delete case

#### Stats
- `GET /api/stats` - Dashboard statistics
- `GET /api/stats/scrapes` - Scrape history

### Dashboard Workflow

1. **Review New Cases** - Filter by "New Intake" status
2. **Check Flagged Cases** - Review potential duplicates
3. **Take Action**:
   - ✅ **Approve** - Mark as publishable
   - ❌ **Reject** - Remove from consideration
   - 📋 **Mark as Duplicate** - Link to existing case
4. **View Details** - Click any case to see full information

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/claims_intake
POSTGRES_USER=claims_user
POSTGRES_PASSWORD=claims_password
POSTGRES_DB=claims_intake

# Backend
NODE_ENV=development
PORT=3001

# Frontend
VITE_API_URL=http://localhost:3001

# Scraper
SCRAPER_CRON=0 */6 * * *        # Every 6 hours
SCRAPER_CONCURRENT_LIMIT=3       # Parallel scrapers

# Deduplication
FUZZY_MATCH_THRESHOLD=0.85       # Flag potential duplicates
AUTO_REJECT_THRESHOLD=0.95       # Automatically reject as duplicate
```

### Database Schema

The system uses **PostgreSQL with Prisma ORM** for type-safe database access:

- **Case** - All discovered and manual cases
- **ScrapeHistory** - Audit log of scraper runs
- **ActivityLog** - User actions and status changes

The schema is defined in `packages/backend/prisma/schema.prisma`.

**Key Benefits of Prisma:**
- ✅ Fully type-safe database queries
- ✅ Auto-generated TypeScript types
- ✅ Built-in migration system
- ✅ Cleaner, more maintainable code
- ✅ Database GUI with Prisma Studio

See `PRISMA_MIGRATION.md` for detailed information about the Prisma setup.

## 🧠 Deduplication Strategy

The system employs a multi-level deduplication approach:

### Level 1: Exact URL Match
- **Result**: Automatic skip (100% match)
- **Use**: Same source URL = definite duplicate

### Level 2: Brand + Title Similarity
- **Method**: String similarity algorithm (Dice coefficient)
- **Thresholds**:
  - `>= 0.95` - Automatic duplicate (skip)
  - `0.85 - 0.95` - Flag for manual review
  - `< 0.85` - Allow as new case

### Level 3: Cross-Brand Matching
- **Method**: PostgreSQL trigram similarity
- **Use**: Catches brand name typos or variations
- **Threshold**: 0.8 brand similarity + 0.85 title similarity

### Handling Flagged Cases

When a case is flagged:
1. Status set to `flagged`
2. `duplicate_of` field references potential match
3. `similarity_score` stored for transparency
4. Manual review required before approval

## 📊 Database Migrations (Prisma)

```bash
# Generate Prisma Client (required after schema changes)
cd packages/backend
pnpm prisma:generate

# Run migrations (development)
pnpm db:migrate

# Deploy migrations (production)
pnpm db:migrate:deploy

# Open Prisma Studio (Database GUI)
pnpm db:studio

# Seed test data (optional)
pnpm db:seed
```

See `PRISMA_MIGRATION.md` for complete migration guide.

## 🐳 Docker Commands

```bash
# Start services
pnpm docker:up

# Stop services
pnpm docker:down

# Rebuild images
pnpm docker:build

# View logs
docker-compose logs -f

# Access database
docker-compose exec postgres psql -U claims_user -d claims_intake
```

## 🧪 Testing

```bash
# Run backend tests
cd packages/backend
pnpm test

# Run frontend tests
cd packages/frontend
pnpm test
```

## 📈 Monitoring

### Scraper Health
- Check `/api/stats/scrapes` for recent scraper runs
- Monitor for failed runs in scrape_history table
- Set up alerts for consecutive failures

### Performance Metrics
- Processing time: Average time to review a case
- Resolution rate: % of cases approved or rejected
- Duplicate rate: % of cases flagged as duplicates

## 🔒 Security Considerations

- **Internal Use Only** - No authentication implemented (add if exposing externally)
- **Database** - Use strong passwords in production
- **Rate Limiting** - Consider adding rate limits to scrapers
- **Input Validation** - All user inputs are validated

## 🚀 Production Deployment

### Recommended Setup

1. **Database**: Managed PostgreSQL (AWS RDS, Google Cloud SQL)
2. **Backend**: Container service (ECS, Cloud Run)
3. **Frontend**: Static hosting (S3 + CloudFront, Vercel)
4. **Scheduler**: Managed cron (AWS EventBridge, Cloud Scheduler)

### Environment-Specific Considerations

```bash
# Production
NODE_ENV=production
LOG_LEVEL=info

# Enable persistent logging
# Add monitoring (Sentry, Datadog, etc.)
# Configure backup strategy for database
```

## 🛠️ Troubleshooting

### Scrapers Failing

**Issue**: Scrapers return 0 results or fail

**Solutions**:
1. Check website structure hasn't changed (update selectors)
2. Verify network connectivity
3. Check for rate limiting or IP blocking
4. Review logs: `docker-compose logs backend`

### Database Connection Issues

**Issue**: Cannot connect to PostgreSQL

**Solutions**:
1. Ensure PostgreSQL is running: `docker-compose ps`
2. Check `DATABASE_URL` in `.env`
3. Verify credentials match `docker-compose.yml`

### Frontend Not Loading Data

**Issue**: Dashboard shows no data

**Solutions**:
1. Check `VITE_API_URL` points to backend
2. Verify CORS is enabled on backend
3. Check browser console for errors
4. Ensure backend is running: `curl http://localhost:3001/health`

## 📝 Adding New Sources

To add a new scraper source:

1. Create new scraper class in `packages/backend/src/scrapers/`
```typescript
export class NewSourceScraper extends BaseScraper {
  protected sourceName = 'NewSource';
  protected baseUrl = 'https://newsource.com';
  
  public async scrape(): Promise<ScrapedCase[]> {
    // Implementation
  }
}
```

2. Add to scraper list in `run.ts`
```typescript
const scrapers = [
  new ClaimDepotScraper(),
  new ClassActionScraper(),
  new TopClassActionsScraper(),
  new NewSourceScraper(),
];
```

3. Update database enum
```sql
ALTER TYPE source_type ADD VALUE 'NewSource';
```
