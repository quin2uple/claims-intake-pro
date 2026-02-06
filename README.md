# Claims Intake Pro

A fully automated class action settlement scraping, deduplication, and management system. This platform intelligently ingests settlement data from multiple sources, applies advanced deduplication logic, and provides a comprehensive dashboard for review and approval.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Ingestion Pipeline](#ingestion-pipeline)
- [Deduplication System](#deduplication-system)
- [Dashboard Features](#dashboard-features)
- [Quick Start](#quick-start)
- [Technical Details](#technical-details)
- [Tradeoffs & Design Decisions](#tradeoffs--design-decisions)
- [API Documentation](#api-documentation)
- [Environment Configuration](#environment-configuration)

---

## 🎯 Overview

**Claims Intake Pro** is an enterprise-grade solution for automatically discovering, validating, and managing class action settlement claims. The system:

- **Scrapes 3 major sources** daily for new settlements
- **Intelligently deduplicates** using fuzzy matching (85% threshold)
- **Flags potential duplicates** for manual review
- **Provides a modern dashboard** for approval workflow
- **Tracks all activities** with comprehensive audit logs
- **Handles Cloudflare challenges** using 2Captcha integration

### Key Features

✅ **Automated Daily Scraping** - Runs at midnight, ingests new settlements  
✅ **Smart Deduplication** - Prevents duplicate entries with fuzzy matching  
✅ **Interactive Dashboard** - Review, approve, reject, and resolve cases  
✅ **Multi-Source Support** - ClaimDepot, ClassAction.org, TopClassActions  
✅ **Real-Time Filtering** - Filter by status, source, brand, deadline  
✅ **Activity Tracking** - Full audit trail of all case actions  
✅ **Dockerized Deployment** - One command setup with docker-compose

---

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
│  - Dashboard UI with filtering & pagination                 │
│  - Case approval/rejection workflow                          │
│  - Real-time data updates via React Query                   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ REST API
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js/Express)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              SCRAPER ORCHESTRATION                    │  │
│  │  - ScraperManager (cron scheduler)                    │  │
│  │  - 3 Active Scrapers (daily at midnight)             │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            DEDUPLICATION ENGINE                       │  │
│  │  - Exact URL matching                                 │  │
│  │  - Fuzzy title matching (string-similarity)           │  │
│  │  - Brand-based grouping                               │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                 API LAYER                             │  │
│  │  - Cases CRUD operations                              │  │
│  │  - Status updates with activity logging               │  │
│  │  - Statistics & analytics                             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Prisma ORM
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE (PostgreSQL)                      │
│  - Cases table (settlements data)                           │
│  - ActivityLogs table (audit trail)                         │
│  - ScrapeHistory table (scrape tracking)                    │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- TanStack Table v8 (data tables)
- TanStack Query (data fetching)
- Tailwind CSS (styling)
- Vite (build tool)

**Backend:**
- Node.js 20 with Express
- TypeScript
- Prisma ORM
- Puppeteer + Puppeteer-Extra-Stealth (web scraping)
- node-cron (scheduling)
- string-similarity (fuzzy matching)
- 2Captcha (Cloudflare bypass)

**Database:**
- PostgreSQL 16

**Infrastructure:**
- Docker & Docker Compose
- Multi-stage builds for optimization

---

## 🔄 Ingestion Pipeline

### Pipeline Overview

```
┌──────────────┐
│  SCHEDULER   │  Cron: 0 0 * * * (Daily at midnight)
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│              SCRAPER ORCHESTRATION                    │
│  1. Launch all 3 scrapers in parallel                │
│  2. Each scraper runs independently                   │
│  3. Results collected and processed sequentially      │
└──────┬───────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│                   SCRAPERS                            │
│  ┌────────────────────────────────────────────────┐  │
│  │  ClaimDepot Scraper                            │  │
│  │  - Parses HTML with Cheerio                    │  │
│  │  - ~170 settlements per run                    │  │
│  │  - Fast, reliable                              │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  TopClassActions Scraper                       │  │
│  │  - Uses Puppeteer (dynamic content)            │  │
│  │  - Pagination support (7 pages)                │  │
│  │  - ~81 settlements per run                     │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  ClassAction.org Scraper                       │  │
│  │  - Puppeteer with Stealth plugin               │  │
│  │  - Cloudflare Turnstile bypass (2Captcha)      │  │
│  │  - Variable results based on availability      │  │
│  └────────────────────────────────────────────────┘  │
└──────┬───────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│              DATA EXTRACTION & NORMALIZATION          │
│  For each scraped case:                              │
│  1. Extract brand name (remove price, descriptors)   │
│  2. Extract case title                               │
│  3. Parse deadline (various formats)                 │
│  4. Extract description                              │
│  5. Normalize URLs                                   │
└──────┬───────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│              DEDUPLICATION CHECK                      │
│  (See Deduplication System section below)            │
└──────┬───────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│                   STORAGE                             │
│  - Insert new cases (status: "new")                  │
│  - Flag potential duplicates (status: "flagged")     │
│  - Skip exact duplicates (not inserted)              │
│  - Log scrape history                                │
└──────────────────────────────────────────────────────┘
```

### Source-Specific Approaches

#### 1. ClaimDepot Scraper

**Method:** Static HTML parsing with Cheerio (Axios + Cheerio)

**Why:** ClaimDepot's content is server-rendered, no JavaScript required.

**Process:**
1. Fetch page with Axios
2. Parse HTML with Cheerio
3. Select settlement cards using CSS selectors
4. Extract: title, URL, deadline, payout, description
5. Return structured data

**Pros:**
- Fast (no browser overhead)
- Low resource usage
- Reliable

**Cons:**
- Breaks if HTML structure changes

**Average Results:** ~170 settlements per scrape

---

#### 2. TopClassActions Scraper

**Method:** Puppeteer (headless browser)

**Why:** Page uses JavaScript for content rendering and pagination.

**Process:**
1. Launch headless browser
2. Navigate to settlements page
3. Wait for content to load
4. Extract settlements from current page
5. Click "Next" button for pagination
6. Repeat for all pages (max 7 pages)
7. Handle "detached frame" errors with retry logic

**Challenges:**
- Pagination with dynamic content
- JavaScript-dependent rendering
- Occasional frame detachment issues

**Solutions:**
- Implemented retry mechanism
- Re-initialize page on detachment
- Proper wait conditions

**Average Results:** ~81 settlements per scrape (7 pages × ~12 per page)

---

#### 3. ClassAction.org Scraper

**Method:** Puppeteer + Stealth plugin + 2Captcha integration

**Why:** Site is protected by Cloudflare Turnstile CAPTCHA.

**Process:**
1. Launch Puppeteer with Stealth plugin
2. Navigate to settlements page
3. Detect Cloudflare challenge
4. If interactive challenge:
   - Extract Turnstile sitekey
   - Send to 2Captcha API
   - Wait for solution (~10-30s)
   - Inject solution token
   - Wait for navigation
5. Parse settlement cards
6. Extract data

**Cloudflare Handling:**
- **Automatic challenges:** Wait for auto-solve (max 90s)
- **Interactive challenges:** Use 2Captcha API
- **Challenge page params:** Extract cData, pagedata, action
- **Anti-detection:** Stealth plugin masks automation

**Challenges:**
- Cloudflare protection
- Variable challenge types
- Token injection complexity

**Solutions:**
- Puppeteer-Extra-Stealth plugin
- 2Captcha Turnstile API integration
- Proper sitekey extraction from iframe/scripts
- Retry logic with exponential backoff

**Average Results:** Variable (0-50 depending on Cloudflare)

**Cost:** ~$0.002 per CAPTCHA solve (2Captcha pricing)

---

### Brand Name Extraction Logic

**Goal:** Extract clean company/brand name from settlement title

**Process:**
```javascript
extractBrandFromTitle(title: string): string {
  // Step 1: Remove leading dollar amounts
  // "$625,000 Apple Settlement" → "Apple Settlement"
  title = title.replace(/^\$[\d,.]+(M|K|B)?\s+/i, '');
  
  // Step 2: Split on key phrases
  // "Apple - Data Breach Class Action Settlement"
  // → parts[0] = "Apple - Data Breach "
  const parts = title.split(/\s+(?:class\s+action|settlement|lawsuit)/i);
  
  // Step 3: Remove trailing descriptive words
  // "Apple - Data Breach " → "Apple - "
  brand = brand.replace(/\s+(data\s+breach|privacy|security|...)$/i, '');
  
  // Step 4: Remove trailing separators
  // "Apple - " → "Apple"
  brand = brand.replace(/[-–:]\s*$/, '');
  
  return brand;
}
```

**Example Transformations:**
- `"$625,000 Educative - Subscription Class Action"` → `"Educative"`
- `"Pinehurst Radiology - Data Breach Settlement"` → `"Pinehurst Radiology"`
- `"Capital Health: Privacy Class Action"` → `"Capital Health"`

---

### Scraping Schedule

**Default:** `0 0 * * *` (Daily at midnight)

**Override:** Set `SCRAPER_CRON` environment variable

**Examples:**
```bash
SCRAPER_CRON="0 2 * * *"    # 2 AM daily
SCRAPER_CRON="0 0 * * 0"    # Midnight every Sunday
SCRAPER_CRON="0 */6 * * *"  # Every 6 hours
```

**Why midnight?**
- Low server load
- Settlement sites typically update during business hours
- Allows morning review of new cases

---

## 🔍 Deduplication System

### Overview

The deduplication system prevents duplicate entries while flagging potential duplicates for human review. It uses a multi-stage approach combining exact matching and fuzzy logic.

### Deduplication Flow

```
┌─────────────────────────────────────────────────────┐
│             INCOMING SCRAPED CASE                    │
│  - brand: "Apple"                                   │
│  - title: "iPhone Battery Settlement"               │
│  - sourceUrl: "example.com/apple-battery"           │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│          STAGE 1: EXACT URL MATCH                   │
│  Query: SELECT * FROM cases                         │
│         WHERE sourceUrl = incoming.sourceUrl        │
│                                                      │
│  IF MATCH FOUND:                                    │
│    → SKIP (return action: "skipped")                │
│    → Do NOT insert into database                    │
│    → Log: "Exact URL match, skipping"               │
└────────────────┬────────────────────────────────────┘
                 │ No match
                 ▼
┌─────────────────────────────────────────────────────┐
│        STAGE 2: BRAND-BASED TITLE MATCHING         │
│  Query: SELECT * FROM cases                         │
│         WHERE brand = incoming.brand (case-insens)  │
│         AND status NOT IN ['rejected', 'duplicate'] │
│                                                      │
│  For each existing case with same brand:            │
│    1. Normalize both titles (lowercase, no punct)   │
│    2. Calculate similarity score                    │
│       using string-similarity algorithm             │
│    3. Compare score to threshold                    │
│                                                      │
│  IF similarity >= 0.85 (85%):                       │
│    → FLAG (insert with status: "flagged")           │
│    → Store duplicateOfId reference                  │
│    → Store similarityScore                          │
│    → Log: "Potential duplicate (85%), flagging"     │
└────────────────┬────────────────────────────────────┘
                 │ No high similarity
                 ▼
┌─────────────────────────────────────────────────────┐
│        STAGE 3: FUZZY BRAND MATCHING                │
│  Query: SELECT * FROM cases                         │
│         WHERE brand LIKE '%partial_brand%'          │
│         LIMIT 10                                    │
│                                                      │
│  Check for similar brands with similar titles       │
│  (catches typos, variations)                        │
│                                                      │
│  IF high similarity found:                          │
│    → FLAG (same as Stage 2)                         │
└────────────────┬────────────────────────────────────┘
                 │ No duplicates found
                 ▼
┌─────────────────────────────────────────────────────┐
│             INSERT AS NEW CASE                       │
│  - status: "new"                                    │
│  - duplicateOfId: null                              │
│  - action: "added"                                  │
└─────────────────────────────────────────────────────┘
```

### Deduplication Logic Details

#### Stage 1: Exact URL Matching

**Purpose:** Prevent re-scraping the same settlement

**Implementation:**
```typescript
const urlMatch = await prisma.case.findUnique({
  where: { sourceUrl: newCase.sourceUrl },
});

if (urlMatch) {
  return { action: 'skipped', status: 'duplicate' };
}
```

**Rationale:**
- URLs are unique identifiers
- Most reliable duplicate detection
- Handles re-scrapes automatically

**Example:**
```
Scrape 1: "Apple Settlement" from url.com/apple-1 → Added ✓
Scrape 2: "Apple Settlement" from url.com/apple-1 → Skipped ⊗
```

---

#### Stage 2: Title Similarity Matching

**Purpose:** Detect similar settlements from same company

**Algorithm:** Sørensen-Dice coefficient (string-similarity library)

**Threshold:** 0.85 (85% similarity)

**Implementation:**
```typescript
const normalizedNewTitle = this.normalizeText(newCase.caseTitle);
const normalizedExistingTitle = this.normalizeText(existingCase.caseTitle);

const similarity = stringSimilarity.compareTwoStrings(
  normalizedNewTitle,
  normalizedExistingTitle
);

if (similarity >= 0.85) {
  // Flag as potential duplicate
  return {
    isDuplicate: false,  // Don't auto-reject
    shouldFlag: true,    // Flag for review
    similarityScore: similarity
  };
}
```

**Text Normalization:**
```typescript
normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')  // Remove punctuation
    .replace(/\s+/g, ' ')      // Normalize spaces
    .trim();
}
```

**Why 85%?**
- Balance between false positives and false negatives
- Catches typos, minor variations
- Avoids flagging unrelated cases
- Configurable via `FUZZY_MATCH_THRESHOLD` env var

**Example Matches:**
```
"Apple iPhone Battery Settlement"
vs
"Apple iPhone Battery Class Action"
→ Similarity: 0.88 → FLAGGED ⚠

"Apple iPhone Settlement"
vs
"Samsung Galaxy Settlement"
→ Similarity: 0.45 → NOT FLAGGED ✓
```

---

#### Stage 3: Cross-Brand Fuzzy Matching

**Purpose:** Catch brand name variations/typos

**Implementation:**
```typescript
// Find brands that partially match
const similarBrandMatches = await prisma.case.findMany({
  where: {
    brand: {
      contains: newCase.brand.substring(0, Math.floor(newCase.brand.length * 0.6)),
      mode: 'insensitive',
    },
  },
  take: 10,
});

// Then check title similarity
```

**Example Catches:**
```
"Appl" vs "Apple"
"Coca Cola" vs "Coca-Cola"
"JP Morgan" vs "JPMorgan"
```

---

### Deduplication Actions

| Action | Status | Database Insert | Description |
|--------|--------|-----------------|-------------|
| **added** | `new` | ✅ Yes | Completely new case |
| **flagged** | `flagged` | ✅ Yes | Potential duplicate, needs review |
| **skipped** | `duplicate` | ❌ No | Exact URL match, ignored |

---

### Deduplication Configuration

**Environment Variables:**

```bash
# Fuzzy matching threshold (0.0 to 1.0)
FUZZY_MATCH_THRESHOLD=0.85

# Auto-reject threshold (currently unused, reserved)
AUTO_REJECT_THRESHOLD=0.95
```

**Recommendation:** Keep at 0.85 for balanced detection

---

### Manual Review Workflow

**When cases are flagged:**

1. **Dashboard displays:**
   - Yellow badge: "FLAGGED"
   - Yellow background on table row
   - Warning icon
   - Reference to duplicate: "Duplicate of #CLM-123"

2. **Review options:**
   - **Approve:** Mark as legitimate, set status to "approved"
   - **Resolve:** Unflag, return to "new" status (not a duplicate)
   - **Delete:** Permanently remove (confirms it's a duplicate)

3. **Activity tracking:**
   - All actions logged to `activity_logs` table
   - Includes: user, timestamp, status changes, notes

---

## 📊 Dashboard Features

### Overview

The dashboard provides a comprehensive interface for managing scraped settlements with filtering, sorting, and bulk actions.

### Key Features

#### 1. **Cases Table**

**Columns:**
- Brand (with initials badge)
- Case Title (with ID and duplicate warnings)
- Source (ClaimDepot, ClassAction.org, etc.)
- Deadline (with urgency indicators)
- Status (color-coded badges)
- Actions (Approve, Reject, Resolve, Delete)

**Features:**
- Pagination (10 per page)
- Sortable columns
- Real-time updates
- Duplicate indicators (yellow bar + warning icon)

---

#### 2. **Advanced Filtering**

**Filter Options:**

| Filter | Options | Behavior |
|--------|---------|----------|
| **Brand** | Search input | Fuzzy search by brand name |
| **Source** | Dropdown | Filter by scraping source |
| **Status** | Dropdown | New, Flagged, Pending, Approved, Rejected |
| **Deadline** | Dropdown | Next 7/30/90 days or All |

**Filter Persistence:**
- Filters persist during pagination
- URL query params (can bookmark filtered views)
- Real-time updates as you type/select

---

#### 3. **Status Management**

**Status Flow:**

```
         ┌─────────┐
    ┌───▶│   NEW   │◀───┐
    │    └────┬────┘    │
    │         │         │
    │         │ (similar title detected)
    │         ▼         │
    │    ┌─────────┐   │
    │    │ FLAGGED │   │
    │    └────┬────┘   │
    │         │         │
    │    ┌────┴────┐   │
    │    │         │   │
    │    ▼         ▼   │
┌───┴────────┐  ┌─────┴───┐
│  APPROVED  │  │ RESOLVE │
└────────────┘  └─────────┘
    
         or
         
    ┌─────────┐
    │ REJECTED│
    └─────────┘
    
         or
         
    ┌─────────┐
    │ DELETED │
    └─────────┘
```

**Status Badges:**
- 🔵 **NEW** - Blue badge
- 🟡 **FLAGGED** - Yellow badge (needs review)
- ⚪ **PENDING** - Gray badge
- 🟢 **APPROVED** - Green badge
- 🔴 **REJECTED** - Red badge

---

#### 4. **Action Buttons**

**For Non-Flagged Cases:**
- ✅ **Approve** - Mark as approved (green badge)
- ❌ **Reject** - Mark as rejected (red badge)

**For Flagged Cases:**
- 🗑️ **Delete** - Permanently remove (with confirmation)
- 🔄 **Resolve** - Unflag and return to "new" status

**Confirmation Dialogs:**
- Delete action requires confirmation
- Prevents accidental deletions

---

#### 5. **Statistics Dashboard**

**Displays:**
- Total New Cases
- Average Processing Time
- Pending Duplicates (flagged)
- Resolution Rate (approved / total)

**Updates:**
- Real-time via React Query
- Auto-refresh on case status changes

---

#### 6. **Activity Tracking**

**Logged Activities:**
- Case creation (scraping)
- Status changes (new → approved, etc.)
- User actions (who did what)
- Timestamps
- Notes (optional)

**View:**
- Per-case activity log on detail page
- Full audit trail for compliance

---

### Dashboard Screenshots

**Main Table View:**
```
╔═════════════════════════════════════════════════════════════╗
║ Brand          │ Case Title        │ Status  │ Actions      ║
╠═════════════════════════════════════════════════════════════╣
║ [AP] Apple     │ Battery Settlement│ NEW     │ ✓ ✕          ║
║ [GG] Google    │ Privacy Lawsuit   │ FLAGGED │ 🗑️ Resolve   ║
║ [FB] Facebook  │ Data Breach       │ APPROVED│              ║
╚═════════════════════════════════════════════════════════════╝
```

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- 2GB RAM minimum
- 10GB disk space

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd claims-intake-pro
```

2. **Create `.env` file:**
```bash
# Database
POSTGRES_USER=claims_user
POSTGRES_PASSWORD=claims_password
POSTGRES_DB=claims_intake

# Backend
DATABASE_URL=postgresql://claims_user:claims_password@postgres:5432/claims_intake
NODE_ENV=production
PORT=3001
SCRAPER_CRON=0 0 * * *

# 2Captcha (optional, for ClassAction.org)
TWOCAPTCHA_API_KEY=your_api_key_here

# Frontend
VITE_API_URL=http://localhost:3001
VITE_API_BASE_URL=http://localhost:3001/api
```

3. **Start services:**
```bash
docker compose up --build
```

4. **Access dashboard:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health check: http://localhost:3001/health

### First Run

**The system will:**
1. Initialize PostgreSQL database
2. Run Prisma migrations
3. Start backend server
4. Run initial scrape (takes ~5-10 minutes)
5. Start frontend server

**Check logs:**
```bash
# Backend logs
docker logs -f claims-intake-backend

# Database logs
docker logs -f claims-intake-db

# Frontend logs
docker logs -f claims-intake-frontend
```

---

## 🔧 Technical Details

### Database Schema

**Cases Table:**
```sql
CREATE TABLE cases (
  id SERIAL PRIMARY KEY,
  brand VARCHAR(255) NOT NULL,
  case_title TEXT NOT NULL,
  source VARCHAR(50) NOT NULL,
  source_url TEXT UNIQUE NOT NULL,
  deadline TIMESTAMP,
  description TEXT,
  status VARCHAR(50) DEFAULT 'new',
  duplicate_of_id INTEGER REFERENCES cases(id),
  similarity_score DECIMAL(5,4),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR(255)
);

CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_brand ON cases(brand);
CREATE INDEX idx_cases_source ON cases(source);
CREATE INDEX idx_cases_deadline ON cases(deadline);
```

**ActivityLogs Table:**
```sql
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  case_id INTEGER REFERENCES cases(id),
  action VARCHAR(100) NOT NULL,
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  user_name VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**ScrapeHistory Table:**
```sql
CREATE TABLE scrape_history (
  id SERIAL PRIMARY KEY,
  source VARCHAR(50) NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  status VARCHAR(50),
  cases_found INTEGER DEFAULT 0,
  cases_added INTEGER DEFAULT 0,
  cases_skipped INTEGER DEFAULT 0,
  error_message TEXT
);
```

---

### API Endpoints

**Cases:**
```
GET    /api/cases              - List all cases (with filters)
GET    /api/cases/:id          - Get case details
POST   /api/cases              - Create manual case
PATCH  /api/cases/:id/status   - Update case status
DELETE /api/cases/:id          - Delete case
```

**Query Parameters (GET /api/cases):**
```
?status=new           - Filter by status
?source=ClaimDepot    - Filter by source
?brand=Apple          - Search by brand
?deadlineDays=7       - Deadline in next X days
?page=1               - Page number
?limit=10             - Items per page
?sortBy=createdAt     - Sort column
?sortOrder=desc       - Sort direction
```

**Example Response:**
```json
{
  "cases": [
    {
      "id": 1,
      "brand": "Apple",
      "case_title": "iPhone Battery Settlement",
      "source": "ClaimDepot",
      "source_url": "https://...",
      "deadline": "2026-03-15T00:00:00.000Z",
      "status": "new",
      "duplicate_of": null,
      "created_at": "2026-02-06T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 251,
    "page": 1,
    "limit": 10,
    "totalPages": 26
  }
}
```

**Stats:**
```
GET /api/stats                - Get overview statistics
GET /api/stats/scrapes        - Get scrape history
```

---

### Performance Optimization

**Frontend:**
- Code splitting with Vite
- React Query caching (5-minute stale time)
- Pagination (10 items per page)
- Lazy loading components
- Optimized re-renders with useMemo/useCallback

**Backend:**
- Database indexes on common queries
- Connection pooling (Prisma)
- Parallel scraper execution
- Efficient deduplication queries
- GZIP compression

**Scraping:**
- Puppeteer browser reuse (not launched per scrape)
- Parallel source scraping
- Retry mechanisms with exponential backoff
- Cloudflare bypass with 2Captcha

---

## ⚖️ Tradeoffs & Design Decisions

### 1. Fuzzy Matching Threshold (85%)

**Decision:** Use 85% similarity threshold for duplicate detection

**Rationale:**
- Lower threshold (e.g., 70%) → Too many false positives
- Higher threshold (e.g., 95%) → Misses legitimate duplicates
- 85% catches typos and minor variations
- Allows human review of edge cases

**Tradeoff:**
- Pro: Balances precision and recall
- Con: Still requires manual review of flagged cases

**Alternative Considered:** Machine learning classifier
- Rejected: Overkill for current scale
- Can revisit if data grows to 100K+ cases

---

### 2. Daily Scraping Schedule

**Decision:** Scrape once daily at midnight

**Rationale:**
- Settlements don't change frequently (weekly/monthly updates)
- Reduces server load and API costs
- Prevents duplicate processing
- Allows morning review workflow

**Tradeoff:**
- Pro: Cost-effective, efficient
- Con: Up to 24-hour delay for new settlements

**Alternative Considered:** Hourly scraping
- Rejected: Unnecessary overhead, 99% duplicates

---

### 3. 2Captcha for Cloudflare

**Decision:** Use paid 2Captcha service for ClassAction.org

**Rationale:**
- Cloudflare Turnstile cannot be bypassed reliably otherwise
- Attempting to crack it risks IP bans
- $0.002 per solve is cost-effective
- API-based, fully automated

**Tradeoff:**
- Pro: Reliable, automated, scales
- Con: Recurring cost (~$0.10/day if 50 solves)

**Alternative Considered:** Cloudflare Scraper libraries
- Rejected: Unreliable, frequently broken, violates ToS

---

### 4. No Auto-Rejection of Duplicates

**Decision:** Flag potential duplicates instead of auto-rejecting

**Rationale:**
- Different settlements can have similar titles
- Same company can have multiple settlements
- Human review prevents false rejections
- Preserves data integrity

**Tradeoff:**
- Pro: No false rejections
- Con: Requires manual review effort

**Example:**
```
"Apple iPhone Battery Settlement" (2020)
"Apple iPhone Battery Settlement" (2023)
→ Different settlements, same title
→ Auto-reject would lose the 2023 case ❌
→ Flagging allows human verification ✓
```

---

### 5. PostgreSQL Over MongoDB

**Decision:** Use PostgreSQL as primary database

**Rationale:**
- Structured data with clear schema
- ACID compliance for audit trail
- Excellent JSON support (if needed later)
- Strong ecosystem (Prisma ORM)
- Better for analytics queries

**Tradeoff:**
- Pro: Reliable, consistent, scalable
- Con: Slightly less flexible schema

**Alternative Considered:** MongoDB
- Rejected: No clear advantage for structured settlement data

---

### 6. Monolithic Over Microservices

**Decision:** Single backend service (not microservices)

**Rationale:**
- Current scale doesn't justify complexity
- Easier development and debugging
- Simpler deployment
- Lower operational overhead

**Tradeoff:**
- Pro: Simple, fast iteration
- Con: Harder to scale horizontally (but can refactor later)

**When to Reconsider:** If traffic exceeds 1000 req/s or team grows

---

### 7. Client-Side Filtering

**Decision:** Filter on backend, not client-side

**Rationale:**
- Reduces payload size
- Enables pagination with accurate counts
- Better for large datasets
- Supports bookmarkable URLs

**Tradeoff:**
- Pro: Scalable, efficient
- Con: Slightly more complex frontend state management

---

### 8. Activity Logging

**Decision:** Log all case status changes

**Rationale:**
- Audit trail for compliance
- Debugging workflow issues
- Accountability (who did what)
- Enables analytics

**Tradeoff:**
- Pro: Full transparency, useful for debugging
- Con: Additional database writes

**Implementation:** Asynchronous logging to avoid blocking requests

---

## 📚 API Documentation

### Authentication

**Current:** No authentication (internal tool)

**Future:** Add JWT-based auth when exposing to external users

---

### Rate Limiting

**Current:** No rate limiting

**Future:** Implement rate limiting if API is exposed publicly

---

### Error Handling

**Standard Error Response:**
```json
{
  "error": "Error message here",
  "code": "ERROR_CODE",
  "details": {...}
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Internal Server Error

---

### Case Status Values

```typescript
type CaseStatus =
  | 'new'        // Newly scraped
  | 'pending'    // Under review
  | 'flagged'    // Potential duplicate
  | 'approved'   // Approved by user
  | 'rejected'   // Rejected by user
  | 'duplicate'; // Exact duplicate (skipped)
```

---

### Source Types

```typescript
type SourceType =
  | 'ClaimDepot'
  | 'ClassActionOrg'
  | 'TopClassActions'
  | 'Manual';
```

---

## 🌍 Environment Configuration

### Required Variables

```bash
# Database (required)
POSTGRES_USER=claims_user
POSTGRES_PASSWORD=claims_password
POSTGRES_DB=claims_intake
DATABASE_URL=postgresql://user:password@host:5432/db

# Backend (required)
NODE_ENV=production
PORT=3001
```

### Optional Variables

```bash
# Scraping schedule (default: daily at midnight)
SCRAPER_CRON=0 0 * * *

# Deduplication thresholds (defaults: 0.85, 0.95)
FUZZY_MATCH_THRESHOLD=0.85
AUTO_REJECT_THRESHOLD=0.95

# 2Captcha (required for ClassAction.org scraper)
TWOCAPTCHA_API_KEY=your_key_here

# Frontend (defaults to localhost)
VITE_API_URL=http://localhost:3001
VITE_API_BASE_URL=http://localhost:3001/api
```

---

## 🐛 Troubleshooting

### Scraper Not Running

**Check:**
1. Backend logs: `docker logs -f claims-intake-backend`
2. Cron schedule: `SCRAPER_CRON` environment variable
3. Database connection
4. Disk space

**Force Manual Scrape:**
```bash
docker exec -it claims-intake-backend sh
cd /app/packages/backend
node -e "require('./dist/scrapers/run').scraperManager.runAll()"
```

---

### Cloudflare Issues

**Symptoms:** ClassAction.org scraper returns 0 results

**Solutions:**
1. Verify 2Captcha API key is set
2. Check 2Captcha balance
3. Review backend logs for CAPTCHA errors
4. Try non-headless mode for debugging (local only)

**Bypass Testing:**
```bash
# Check if sitekey extraction works
docker logs claims-intake-backend | grep "sitekey"

# Check 2Captcha balance
curl "http://2captcha.com/res.php?key=YOUR_KEY&action=getbalance&json=1"
```

---

### Database Migration Issues

**Reset Database:**
```bash
docker compose down -v
docker compose up --build
```

**Manual Migration:**
```bash
docker exec -it claims-intake-backend sh
cd /app/packages/backend
npx prisma migrate reset
npx prisma migrate deploy
```
