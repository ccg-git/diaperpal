# DiaperPal Codebase Handoff Document

**Prepared for:** External Code Review
**Original Date:** December 4, 2025
**Last Updated:** December 5, 2025
**Prepared by:** Claude (AI Assistant who built most of this codebase)

---

## ⚠️ CORRECTIONS (December 5, 2025)

**After the external reviewer requested verification against the production Supabase database, several significant errors in this document were discovered and corrected:**

| Original Claim | Correction |
|----------------|------------|
| "NO RLS POLICIES DEFINED" | **WRONG** — 18 RLS policies exist with proper RBAC |
| "No user authentication" | **WRONG** — `profiles` table with `user_role` enum exists |
| "Types don't match schema" | **PARTIALLY WRONG** — Types match actual DB; `migration.sql` was outdated |
| "`find_nearby_stations` doesn't exist" | **WRONG** — Both functions exist |

**Root cause:** I documented from the repo's `migration.sql` file without verifying against production. The migration file was outdated; the actual database had evolved.

**What's been fixed:**
- `database/migration.sql` now matches production (synced Dec 5, 2025)
- Legacy routes moved to `app/api/_deprecated/` (build verified, awaiting deletion)
- This document updated with corrections below

---

> **Note to Reviewer:** This document aims to be completely honest about what was built, including uncertainties, potential issues, and decisions I'm not fully confident about. The corrections above demonstrate why verification matters.

---

## 1. PROJECT OVERVIEW

### Business Objective
DiaperPal is a mobile-first web app to help parents find baby changing stations. The app has two phases:
1. **Consumer Phase (current):** Help parents quickly find verified changing stations nearby
2. **B2B Phase (future):** Document building code violations (e.g., lack of changing tables in men's restrooms) to sell compliance reports to cities/businesses

### Target Users
- **Primary:** Parents with young children needing to find changing stations quickly ("emergency mode")
- **Secondary (future):** City building inspectors, property managers, business owners

### Current Deployment Status
- **Platform:** Vercel (Next.js deployment)
- **Database:** Supabase (PostgreSQL with PostGIS)
- **Status:** Beta/MVP stage with founder-seeded data (6 venues, 6 restrooms)
- **Production URL:** Not confirmed (would be set in Vercel dashboard)

---

## 2. ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER'S BROWSER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Next.js App (Client Components)                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  /          │  │  /map       │  │  /location/ │  │  /admin     │        │
│  │  Landing    │  │  Map+List   │  │  [id]       │  │  Admin CRUD │        │
│  │  Page       │  │  View       │  │  Detail     │  │  Panel      │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │                │                │                │                 │
│         └────────────────┴────────────────┴────────────────┘                 │
│                                    │                                          │
│                          Google Maps Autocomplete                             │
│                          Mapbox GL for Map Rendering                          │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VERCEL EDGE/SERVERLESS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  Next.js API Routes (/api/*)                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌────────────────────┐  │
│  │ /api/venues/nearby  │  │ /api/admin/venues   │  │ /api/direction-    │  │
│  │ Public read         │  │ Password protected  │  │ click              │  │
│  │ (PostGIS query)     │  │ (CRUD operations)   │  │ Analytics tracking │  │
│  └──────────┬──────────┘  └──────────┬──────────┘  └──────────┬─────────┘  │
│             │                        │                         │             │
│             └────────────────────────┴─────────────────────────┘             │
│                                      │                                        │
│                        ┌─────────────┴─────────────┐                         │
│                        │  Google Places API        │                         │
│                        │  (fetch venue details)    │                         │
│                        └───────────────────────────┘                         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL + PostGIS                                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────────────┐ │
│  │  profiles   │  │   venues    │  │  restrooms  │  │ direction_clicks   │ │
│  │  (auth)     │  │   table     │◄─┤   table     │  │ (analytics)        │ │
│  │             │  │             │  │             │  │                    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────────────┘ │
│                          │                │                                  │
│                          ▼                ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐                │
│  │ find_nearby_venues() - PostGIS function for geo search  │                │
│  └─────────────────────────────────────────────────────────┘                │
│                                                                              │
│  ✅ RLS ENABLED on all tables with 18 policies                              │
│  ✅ Role-based access: user, reviewer, admin                                │
│                                                                              │
│  Storage Buckets:                                                            │
│  - restroom-photos (current, 0 files)                                       │
│  - facility-photos (legacy, 2 files)                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. COMPLETE DATABASE SCHEMA

> **Note:** This section has been corrected to match the actual production database as of December 5, 2025. See `database/migration.sql` for the full schema with RLS policies.

### Enums

```sql
CREATE TYPE user_role AS ENUM ('user', 'reviewer', 'admin');
CREATE TYPE venue_status AS ENUM ('pending', 'approved', 'rejected');
```

### Tables

#### `profiles` Table (Linked to Supabase Auth)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role user_role DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `venues` Table
```sql
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat NUMERIC(10,8) NOT NULL,
  lng NUMERIC(11,8) NOT NULL,
  coordinates GEOGRAPHY(POINT, 4326) NOT NULL,
  venue_type TEXT NOT NULL CHECK (venue_type IN ('food_drink', 'parks_outdoors', 'indoor_activities', 'errands')),
  hours_json JSONB,
  special_hours JSONB,
  rating NUMERIC(3,1),
  review_count INTEGER,
  photo_urls TEXT[],
  family_amenities JSONB DEFAULT '{}',
  status venue_status DEFAULT 'approved',        -- CORRECTED: This exists
  submitted_by UUID NOT NULL REFERENCES profiles(id),  -- CORRECTED: This exists
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  google_data_refreshed_at TIMESTAMP
);
```

#### `restrooms` Table
```sql
CREATE TABLE restrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  gender TEXT NOT NULL CHECK (gender IN ('mens', 'womens', 'all_gender')),
  station_location TEXT NOT NULL CHECK (station_location IN ('single_restroom', 'inside_stall', 'near_sinks')),
  restroom_location_text TEXT,
  status TEXT NOT NULL DEFAULT 'unverified' CHECK (status IN ('verified_present', 'verified_absent', 'unverified')),
  verified_by_user_id UUID REFERENCES profiles(id),
  verified_at TIMESTAMP,
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  safety_notes TEXT,
  admin_notes TEXT,
  -- Issue tracking (CORRECTED: These exist)
  has_safety_concern BOOLEAN DEFAULT FALSE,
  safety_concern_notes TEXT,
  has_cleanliness_issue BOOLEAN DEFAULT FALSE,
  cleanliness_issue_notes TEXT,
  additional_notes TEXT,
  photo_url TEXT,
  times_directions_clicked INTEGER DEFAULT 0,
  -- Audit trail
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by_user_id UUID REFERENCES profiles(id)
);
```

#### `direction_clicks` Table
```sql
CREATE TABLE direction_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  restroom_id UUID REFERENCES restrooms(id) ON DELETE SET NULL,
  user_lat NUMERIC,
  user_lng NUMERIC,
  source TEXT DEFAULT 'list',
  user_agent TEXT,
  ip_hash TEXT,
  clicked_at TIMESTAMP DEFAULT NOW()
);
```

### RLS Policies (CORRECTED: These exist!)

RLS is **enabled** on all tables. Summary of 18 policies:

| Table | Public | Reviewer | Admin |
|-------|--------|----------|-------|
| `profiles` | — | — | SELECT all |
| `venues` | SELECT approved | SELECT all, INSERT | UPDATE, DELETE |
| `restrooms` | SELECT approved | SELECT all, INSERT | UPDATE, DELETE |
| `restroom_photos` | SELECT all | INSERT | UPDATE, DELETE |
| `direction_clicks` | INSERT | — | SELECT, DELETE |

See `database/migration.sql` for full policy definitions.

### Trigger Functions

| Function | Purpose |
|----------|---------|
| `handle_new_user()` | Auto-creates profile row when user signs up |
| `set_submitted_by()` | Auto-sets `submitted_by` on venue insert |
| `update_updated_at_column()` | Updates `updated_at` timestamp |
| `find_nearby_venues()` | PostGIS proximity search |
| `find_nearby_stations()` | Legacy alias for `find_nearby_venues()` |

---

## 4. AUTHENTICATION & AUTHORIZATION FLOW

### Actual Implementation (CORRECTED)

**Supabase Auth exists with role-based access:**
- `profiles` table linked to `auth.users`
- `user_role` enum: `user`, `reviewer`, `admin`
- RLS policies enforce role-based access

**However, the admin panel uses a separate password system:**
- Single shared password in `ADMIN_PASSWORD` env var
- Password sent via `Authorization: Bearer <password>` header
- Password stored in browser cookie for session persistence

This is **redundant** — the proper Supabase Auth + RLS system exists but the admin panel doesn't use it.

### Role Permissions (Enforced by RLS)

| Action | Public (anon) | User | Reviewer | Admin |
|--------|---------------|------|----------|-------|
| View approved venues | ✅ | ✅ | ✅ | ✅ |
| View all venues | ❌ | ❌ | ✅ | ✅ |
| Create venue | ❌ | ❌ | ✅ | ✅ |
| Update venue | ❌ | ❌ | ❌ | ✅ |
| Delete venue | ❌ | ❌ | ❌ | ✅ |
| Record direction click | ✅ | ✅ | ✅ | ✅ |
| View direction clicks | ❌ | ❌ | ❌ | ✅ |

### Remaining Auth Concerns

1. **Admin password redundant** — Should migrate to Supabase Auth
2. **Cookie stores password in plaintext** — Security risk
3. **No CSRF protection** — Cookie-based auth without tokens
4. **Service role key in admin routes** — Bypasses RLS; should use authenticated client

---

## 5. API ROUTE INVENTORY

### Active Routes (6 total)

| Path | Method | Auth | Purpose |
|------|--------|------|---------|
| `/api/venues/nearby` | GET | None | Find venues near coordinates (PostGIS) |
| `/api/admin/venues` | POST | Password | Create venue from Google Place |
| `/api/admin/venues/list` | GET | Password | List all venues for admin |
| `/api/admin/restrooms` | GET/POST | Password (POST) | Restroom CRUD |
| `/api/admin/stats` | GET | Password | Dashboard statistics |
| `/api/direction-click` | POST | None | Record analytics event |

### Deprecated Routes (moved to `_deprecated/`)

The following routes have been moved to `app/api/_deprecated/` and are excluded from builds:

| Path | Reason |
|------|--------|
| `/api/locations/*` | References old schema |
| `/api/facilities/*` | Table doesn't exist |
| `/api/photos/*` | Different table name |
| `/api/reports/*` | Table doesn't exist |
| `/api/votes/*` | Table doesn't exist |
| `/api/venues/route.ts` | Superseded by admin/venues |
| `/api/venues/[id]/*` | Not used (page queries Supabase directly) |
| `/api/places/[placeId]/*` | Not used anywhere |

---

## 6. KEY COMPONENTS & DATA FLOW

### Component Hierarchy

```
app/
├── layout.tsx                 # Root layout with nav bar
│   └── page.tsx              # Landing page
│
├── map/
│   └── page.tsx              # Main user-facing page (CLIENT)
│       ├── Google Autocomplete
│       ├── Mapbox GL Map
│       └── Venue List Cards
│
├── location/[id]/
│   └── page.tsx              # Venue detail (SERVER - queries Supabase directly)
│
└── admin/
    └── page.tsx              # Admin panel (CLIENT)
        ├── Stats Dashboard
        ├── Add Venue tab
        ├── Add Restroom tab
        └── Browse Venues tab
```

### Data Fetching Patterns

| Component | Type | Data Source |
|-----------|------|-------------|
| `/map/page.tsx` | Client | `fetch('/api/venues/nearby')` |
| `/location/[id]/page.tsx` | Server | Direct Supabase query |
| `/admin/page.tsx` | Client | `fetch('/api/admin/*')` |

---

## 7. ENVIRONMENT VARIABLES

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=       # Public
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Public
SUPABASE_SERVICE_ROLE_KEY=      # Server-only

# Google APIs
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=  # Public
GOOGLE_PLACES_API_KEY=            # Server-only (optional)

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=       # Public

# Admin
ADMIN_PASSWORD=                 # Server-only (should migrate to Supabase Auth)
```

---

## 8. ASSUMPTIONS & DECISIONS LOG

### Key Decisions

1. **Venue type categories:** `food_drink`, `parks_outdoors`, `indoor_activities`, `errands`
2. **Station locations:** `single_restroom`, `inside_stall`, `near_sinks`
3. **Pacific Time hardcoded:** All "is open now" calculations assume Pacific timezone
4. **Default radius:** 8km (~5 miles)
5. **Hide `verified_absent`:** Restrooms confirmed to not have stations are hidden from users

### Things That Should Be Revisited

1. **Admin auth** — Should use Supabase Auth instead of password
2. **Pacific Time** — Should use user's timezone
3. **Client-side filtering** — Works for now but won't scale

---

## 9. KNOWN LIMITATIONS & TODOS

### Not Implemented

- User accounts for consumers (Auth exists but not exposed)
- Photo uploads (routes deprecated)
- Report Issue flow (schema supports it, no UI)
- Error boundaries
- Tests of any kind

### Hardcoded Values

| Value | Location | Should Be |
|-------|----------|-----------|
| Pacific timezone | `lib/utils.ts` | User's timezone |
| 8km radius | `api/venues/nearby/route.ts` | Configurable |
| Manhattan Beach coords | `map/page.tsx` | Prompt user |

---

## 10. REMAINING CONCERNS

### Security

1. **Admin password in cookie** — Plaintext, should migrate to Supabase Auth
2. **Service role key in admin routes** — Should use authenticated client + RLS

### Technical Debt

1. **Mixed data fetching patterns** — Some pages use API routes, others query Supabase directly
2. **Google Maps loaded twice** — Both map and admin pages load the library
3. **No error monitoring** — Errors in production are invisible

---

## 11. FILE STRUCTURE (Updated)

```
diaperpal/
├── database/
│   └── migration.sql          # ✅ SYNCED with production Dec 5, 2025
│
├── lib/
│   ├── supabase.ts            # Supabase client initialization
│   ├── types.ts               # TypeScript definitions
│   └── utils.ts               # Utility functions
│
└── app/
    ├── page.tsx               # Landing page
    ├── map/page.tsx           # Map view (CLIENT)
    ├── location/[id]/page.tsx # Detail page (SERVER)
    ├── admin/page.tsx         # Admin panel (CLIENT)
    │
    └── api/
        ├── venues/nearby/     # ✅ Active - find nearby venues
        ├── admin/venues/      # ✅ Active - venue CRUD
        ├── admin/restrooms/   # ✅ Active - restroom CRUD
        ├── admin/stats/       # ✅ Active - dashboard stats
        ├── direction-click/   # ✅ Active - analytics
        │
        └── _deprecated/       # ⚠️ Moved here, safe to delete later
            ├── locations/
            ├── facilities/
            ├── photos/
            ├── reports/
            ├── votes/
            └── ...
```

---

## 12. SUMMARY FOR REVIEWER

### What's Better Than Originally Documented

- ✅ RLS policies exist and are well-designed
- ✅ Auth system exists (profiles + roles)
- ✅ Schema is more complete than migration showed
- ✅ Issue tracking fields exist for future "Report Issue" feature

### What Still Needs Work

1. **Admin auth refactor** — Replace password with Supabase Auth
2. **Delete deprecated routes** — Currently in `_deprecated/`, can be removed
3. **Error handling** — Many silent failures
4. **Tests** — None exist
5. **Monitoring** — No error tracking in production

### Recommended Next Steps

1. Manually test main flows (map, detail, admin)
2. Delete `_deprecated/` folder when confident
3. Refactor admin to use Supabase Auth (separate PR)
4. Add error monitoring (Sentry)
5. Add basic tests for critical paths

---

*Thank you for the thorough review. The corrections above demonstrate why verification matters — I made claims based on an outdated file without checking production. Lesson learned.*
