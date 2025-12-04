# DiaperPal Codebase Handoff Document

**Prepared for:** External Code Review
**Date:** December 4, 2025
**Prepared by:** Claude (AI Assistant who built most of this codebase)

> **Note to Reviewer:** This document aims to be completely honest about what was built, including uncertainties, potential issues, and decisions I'm not fully confident about. Please treat any defensiveness or minimization you detect as unintentional - the goal is to help you find problems and help the project improve.

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
- **Status:** Beta/MVP stage with founder-seeded data
- **Production URL:** Not confirmed (would be set in Vercel dashboard)

---

## 2. ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER'S BROWSER                                   │
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
│  │   venues    │  │  restrooms  │  │  restroom_  │  │ direction_clicks   │ │
│  │   table     │◄─┤   table     │◄─┤  photos     │  │ (analytics)        │ │
│  │             │  │             │  │  table      │  │                    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────────────┘ │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────────────────────────┐                                        │
│  │ find_nearby_venues()            │                                        │
│  │ PostGIS function for geo search │                                        │
│  └─────────────────────────────────┘                                        │
│                                                                              │
│  Storage Bucket: facility-photos (not actively used in current flow)        │
│                                                                              │
│  ⚠️  NO RLS POLICIES DEFINED - See Security section                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Data Flows

**1. User Searches for Nearby Venues:**
```
Browser geolocation → /api/venues/nearby → find_nearby_venues() RPC →
Filter results → Return to client → Render list/map
```

**2. Admin Adds New Venue:**
```
Google Autocomplete → Select place → /api/admin/venues POST →
Fetch Google Place Details → Insert to venues table →
Return venue_id → Admin adds restroom details
```

**3. User Gets Directions:**
```
Tap "Directions" → POST /api/direction-click (analytics) →
Open native maps app (Apple/Google)
```

---

## 3. COMPLETE DATABASE SCHEMA

### Tables

#### `venues` Table
```sql
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT UNIQUE NOT NULL,              -- Google Places ID
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat NUMERIC(10,8) NOT NULL,
  lng NUMERIC(11,8) NOT NULL,
  coordinates GEOGRAPHY(POINT, 4326) NOT NULL, -- PostGIS for geo queries
  venue_type TEXT NOT NULL CHECK (venue_type IN ('food_drink', 'parks_outdoors', 'indoor_activities', 'errands')),
  hours_json JSONB,                           -- Opening hours by day
  special_hours JSONB,                        -- Holiday hours (not used)
  rating DECIMAL(3,1),                        -- From Google
  review_count INTEGER,                       -- From Google
  photo_urls TEXT[],                          -- Google photo URLs
  family_amenities JSONB DEFAULT '{}',        -- Future expansion (not used)
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
  restroom_location_text TEXT,                -- "Back hallway", etc.
  status TEXT NOT NULL DEFAULT 'unverified' CHECK (status IN ('verified_present', 'verified_absent', 'unverified')),
  verified_by_user_id UUID,                   -- Not used (no user auth)
  verified_at TIMESTAMP,
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  safety_notes TEXT,                          -- Tips like "ask for key"
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by_user_id UUID                     -- Not used (no user auth)
);
```

#### `restroom_photos` Table
```sql
CREATE TABLE restroom_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restroom_id UUID NOT NULL REFERENCES restrooms(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  uploaded_by_user_id UUID,                   -- Not used
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `direction_clicks` Table
```sql
CREATE TABLE direction_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP DEFAULT NOW(),
  user_agent TEXT,
  ip_hash TEXT                                -- SHA256 hash, truncated
);
```

### Indexes
```sql
CREATE INDEX idx_venue_coordinates ON venues USING GIST(coordinates);
CREATE INDEX idx_venue_type ON venues(venue_type);
CREATE INDEX idx_venue_place_id ON venues(place_id);
CREATE INDEX idx_restroom_venue ON restrooms(venue_id);
CREATE INDEX idx_restroom_gender ON restrooms(gender);
CREATE INDEX idx_restroom_status ON restrooms(status);
CREATE INDEX idx_photo_restroom ON restroom_photos(restroom_id);
CREATE UNIQUE INDEX idx_one_primary_per_restroom ON restroom_photos(restroom_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX idx_direction_venue ON direction_clicks(venue_id);
CREATE INDEX idx_direction_date ON direction_clicks(clicked_at);
```

### Functions
```sql
CREATE OR REPLACE FUNCTION find_nearby_venues(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 8
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  lat NUMERIC,
  lng NUMERIC,
  venue_type TEXT,
  place_id TEXT,
  hours_json JSONB,
  rating DECIMAL,
  review_count INTEGER,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id, v.name, v.address, v.lat, v.lng, v.venue_type, v.place_id,
    v.hours_json, v.rating, v.review_count,
    ST_Distance(
      v.coordinates::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) as distance_meters
  FROM venues v
  WHERE ST_DWithin(
    v.coordinates::geography,
    ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
    radius_km * 1000
  )
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;
```

### Triggers
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restrooms_updated_at
  BEFORE UPDATE ON restrooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### RLS Policies

**CRITICAL: NO RLS POLICIES ARE DEFINED IN THE MIGRATION.**

The migration file (`database/migration.sql`) does not include any Row Level Security policies. This means:
- If RLS is enabled on tables, all access is denied (secure but broken)
- If RLS is disabled, the anon key has full read/write access (insecure)

**I honestly don't know the current state in production.** I would need to check the Supabase dashboard to see if RLS is enabled and what policies exist. This is a significant gap in my documentation.

---

## 4. AUTHENTICATION & AUTHORIZATION FLOW

### Current Implementation

**User Authentication:** NONE
- No user accounts
- No login/signup
- All public routes are fully anonymous

**Admin Authentication:** Simple Password
- Single shared password stored in `ADMIN_PASSWORD` env var
- Password sent via `Authorization: Bearer <password>` header
- Password also stored in browser cookie (`admin_password`) for session persistence

```typescript
// Pattern used in all admin routes:
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return false
  const password = authHeader.substring(7)
  return password === process.env.ADMIN_PASSWORD
}
```

### Role System
There's no role system. Just:
- **Anonymous users:** Can read venue/restroom data, record direction clicks
- **Admin:** Can create/modify venues and restrooms (password required)

### Where Auth Checks Are Performed
| Location | Check Performed |
|----------|-----------------|
| API routes (`/api/admin/*`) | Password check in route handler |
| Client (`/admin`) | Password stored in cookie, passed with requests |
| RLS (Supabase) | **NOT CONFIGURED** |
| Middleware | None |

### Permissions Matrix
| Action | Anonymous | Admin |
|--------|-----------|-------|
| View nearby venues | Yes | Yes |
| View venue details | Yes | Yes |
| Record direction click | Yes | Yes |
| Create venue | No | Yes |
| Create restroom | No | Yes |
| View admin stats | No | Yes |

### Honest Assessment of Gaps

1. **Cookie stores password in plaintext** - Anyone with browser access can see it
2. **No CSRF protection** - Cookie-based auth without CSRF tokens
3. **No rate limiting** - Could be abused for brute force
4. **Service role key used inconsistently** - Some routes that should use anon key use service role
5. **No RLS** - If someone gets the anon key, they can query/modify anything
6. **Password comparison is timing-safe?** - I used simple `===` comparison, not `crypto.timingSafeEqual()`

---

## 5. API ROUTE INVENTORY

### Production Routes (Actively Used)

| Path | Method | Auth | Purpose | Validation |
|------|--------|------|---------|------------|
| `/api/venues/nearby` | GET | None | Find venues near coordinates | Basic lat/lng parsing, defaults if missing |
| `/api/venues/[id]` | GET | None | Get venue detail with restrooms | UUID validation (implicit) |
| `/api/admin/venues` | POST | Password | Create venue from Google Place | place_id required, venue_type validated against enum |
| `/api/admin/venues/list` | GET | Password | List all venues for admin | None |
| `/api/admin/restrooms` | POST | Password | Add restroom to venue | venue_id, gender, station_location required |
| `/api/admin/restrooms` | GET | None | List restrooms for venue | venue_id required |
| `/api/admin/stats` | GET | Password | Get dashboard stats | None |
| `/api/direction-click` | POST | None | Record analytics event | venue_id required |
| `/api/places/[placeId]` | GET | None | Proxy Google Place details | None - **placeId passed directly to Google** |

### Legacy/Unused Routes (Probably Should Be Deleted)

These routes exist but reference tables or patterns that don't match the current schema:

| Path | Method | Issue |
|------|--------|-------|
| `/api/venues` | POST | Uses `google_place_id` column (schema uses `place_id`), inserts `data_source` column |
| `/api/locations` | GET | Calls `find_nearby_stations` RPC (doesn't exist - should be `find_nearby_venues`) |
| `/api/locations` | POST | References `facilities` table (doesn't exist in migration) |
| `/api/locations/[id]` | GET | References `facilities` table |
| `/api/locations/nearby` | GET | Has fallback logic but references `facilities` |
| `/api/facilities` | POST | References `facilities` table |
| `/api/photos` | POST | References `photos` table (schema has `restroom_photos`) |
| `/api/photos/[id]` | GET | References `photos` table |
| `/api/reports` | POST | References `reports` table (not in migration) |
| `/api/votes` | POST | References `votes` table (not in migration) |

**Admission:** I likely created these during early development with a different schema, then evolved the schema but didn't clean up the routes. They may cause 500 errors if called.

### Validation Concerns

1. **`/api/admin/venues` POST:** `place_id` is passed to Google API without sanitization - probably safe since Google validates it, but still...
2. **`/api/venues` POST:** Direct string interpolation for coordinates: `` `POINT(${lng} ${lat})` `` - potential SQL injection if lat/lng aren't validated as numbers
3. **`/api/admin/restrooms` GET:** No auth check - anyone can list all restrooms for any venue
4. **`/api/places/[placeId]` GET:** placeId passed directly to Google - could leak API key usage to attacker-controlled requests

---

## 6. KEY COMPONENTS & DATA FLOW

### Component Hierarchy

```
app/
├── layout.tsx                 # Root layout with nav bar
│   └── page.tsx              # Landing page (links to /map, /admin)
│
├── map/
│   └── page.tsx              # Main user-facing page (client component)
│       ├── Google Autocomplete (location search)
│       ├── Mapbox GL Map (venue markers)
│       ├── Venue List Cards
│       └── Filter Chips (gender, venue type)
│
├── location/[id]/
│   └── page.tsx              # Venue detail page (SERVER component)
│       ├── Venue Header (name, rating, hours)
│       ├── Directions Button
│       ├── Restroom Cards
│       └── Hours Table
│
└── admin/
    └── page.tsx              # Admin panel (client component)
        ├── Login Form
        ├── Stats Dashboard
        ├── Tab: Add Venue (Google Autocomplete → venue creation)
        ├── Tab: Add Restroom (select venue → add restrooms)
        └── Tab: Browse Venues (list all venues)
```

### Data Fetching Patterns

| Component | Type | Data Source |
|-----------|------|-------------|
| `/map/page.tsx` | Client | `fetch('/api/venues/nearby')` on mount + location change |
| `/location/[id]/page.tsx` | Server | Direct Supabase query in `getVenueDetails()` |
| `/admin/page.tsx` | Client | `fetch('/api/admin/stats')` and `fetch('/api/admin/venues/list')` |

### State Management
- **No global state** (no Redux, Zustand, Jotai)
- All state is local to components using `useState`
- URL state for route params (venue ID)

### Pattern Concerns

1. **Server component creates its own Supabase client:** `location/[id]/page.tsx` creates a client with `NEXT_PUBLIC_SUPABASE_ANON_KEY`. This works but means we can't easily share a single client instance.

2. **Mixed fetch patterns:** Some pages use API routes, others query Supabase directly. This inconsistency could cause caching/revalidation issues.

3. **Google Maps library loaded multiple times:** Both `/map/page.tsx` and `/admin/page.tsx` use `useJsApiLoader`. If user navigates between them, the library may reload.

---

## 7. ENVIRONMENT VARIABLES

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=       # Public - Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Public - Supabase anon key (limited permissions)
SUPABASE_SERVICE_ROLE_KEY=      # Server-only - Full database access

# Google APIs (Required for admin, optional for map)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=  # Public - Used for autocomplete in browser
GOOGLE_PLACES_API_KEY=            # Server-only - Used to fetch place details

# Mapbox (Required for map view)
NEXT_PUBLIC_MAPBOX_TOKEN=       # Public - Mapbox access token

# Admin (Required)
ADMIN_PASSWORD=                 # Server-only - Admin panel password
```

### Configuration Issues I'm Aware Of

1. **Fallback in admin routes:** `process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!` - Falls back to anon key if service key isn't set, which might cause silent failures

2. **Google API key duplication:** Code checks `GOOGLE_PLACES_API_KEY || NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - unclear which should be used where

3. **No validation:** If env vars are missing, the app may fail at runtime with unclear errors

4. **Console.log in production:** Map page logs Mapbox token availability: `console.log('[DiaperPal] MAPBOX_TOKEN available:', ...)` - This exposes token presence (not value) in browser console

---

## 8. ASSUMPTIONS & DECISIONS LOG

### Decisions I Made When Requirements Were Ambiguous

1. **Venue type categories:** I chose four categories (`food_drink`, `parks_outdoors`, `indoor_activities`, `errands`) based on what seemed most useful for parents. The user never specified exactly what categories to use.

2. **Station location types:** I defined `single_restroom`, `inside_stall`, `near_sinks` to describe where the changing station is within a restroom. These aren't standard terms - I made them up based on real-world scenarios.

3. **Pacific Time hardcoded:** All "is open now" calculations use Pacific Time. I assumed the app would launch in California. This will be wrong for users in other timezones.

4. **Default radius of 8km:** I chose 8km (~5 miles) as the default search radius. No specific requirement was given.

5. **Filtering out `verified_absent`:** I made restrooms with `status = 'verified_absent'` invisible to users. The assumption is that these are "confirmed no changing station here" and shouldn't clutter results.

### Patterns I Chose (And Second-Guessing)

1. **No user authentication for MVP:** The founder wanted quick launch, so I skipped user accounts. Now I realize this limits:
   - Can't track who submitted what
   - Can't let users verify/update stations
   - Can't implement voting or flagging properly

2. **Service role key in API routes:** I used the service role key in admin routes to bypass RLS. This works but means:
   - Any bug in auth check gives full DB access
   - Should probably use RLS + Supabase Auth for proper security

3. **Storing Google photo URLs directly:** Instead of downloading/caching Google photos, I store the Google API URLs directly. These URLs require an API key and may be rate-limited or change.

4. **Client-side filtering:** The `/api/venues/nearby` endpoint returns all venues, and filtering (by type, open/closed) happens on the client. For small datasets this is fine, but won't scale.

### Things That Might Need Revisiting

1. **The whole `locations/` and `facilities/` code path:** This appears to be from an earlier schema iteration. It's dead code that should probably be removed.

2. **Restroom form fields:** The TypeScript types (`lib/types.ts`) include fields like `has_safety_concern`, `photo_url`, `times_directions_clicked` that aren't in the SQL migration. The types and schema are out of sync.

3. **Moderation status:** There's a `moderation_status` field on restrooms/photos but no moderation workflow implemented.

---

## 9. KNOWN LIMITATIONS & TODOS

### Features That Are Stubbed or Incomplete

1. **User accounts:** No implementation
2. **Photo uploads:** The `/api/photos` route exists but isn't connected to the UI
3. **Voting/reports:** Routes exist but tables don't match schema
4. **Family amenities:** `family_amenities` JSONB field exists but never used
5. **Special hours:** `special_hours` field for holidays exists but never populated or displayed

### Error Handling Gaps

1. **No error boundaries:** React errors will crash the whole page
2. **Silent failures:** Many API routes return `[]` instead of errors (e.g., `return NextResponse.json([])` when query fails)
3. **No retry logic:** Failed API calls aren't retried
4. **Generic error messages:** "Internal server error" doesn't help users or debugging

### Performance Concerns

1. **N+1 queries:** `/api/locations/nearby` and `/api/locations/[id]` do N+1 queries (fetch venues, then loop through to fetch facilities for each)
2. **No caching:** Every page load fetches fresh data
3. **No pagination:** Venue list loads all venues at once
4. **Large response payloads:** `venues/nearby` returns full venue objects including all restroom data

### Hardcoded Values

| Value | Location | Should Be |
|-------|----------|-----------|
| Pacific timezone | `lib/utils.ts` | User's timezone or configurable |
| 8km default radius | `api/venues/nearby/route.ts` | Configurable |
| Manhattan Beach fallback coords | `map/page.tsx` | Configurable or prompt user |
| US country restriction | `map/page.tsx`, `admin/page.tsx` | Configurable |

### Tests That Should Exist But Don't

- No tests exist at all
- Should have: API route tests, component tests, E2E tests
- Critical paths needing tests:
  - Nearby venue search
  - Admin venue creation
  - Open/closed calculation
  - Coordinate handling

---

## 10. POTENTIAL ISSUES I'M AWARE OF

### Security Vulnerabilities

1. **No RLS policies:** If the anon key leaks, anyone can read/write all data
2. **SQL injection risk:** `coordinates: \`POINT(${lng} ${lat})\`` in `/api/venues/route.ts` - lat/lng should be validated as numbers
3. **Admin password in cookie:** Plaintext, accessible to JavaScript, no HttpOnly flag
4. **No CSRF protection:** Cookie-based auth without CSRF tokens
5. **API key exposure:** Google Places API key passed in URLs that could be logged
6. **No rate limiting:** All endpoints can be hammered

### Race Conditions

1. **Direction click counter:** The click recording and count retrieval are separate operations - high-traffic scenarios could get stale counts
2. **Venue creation:** No check-and-create atomicity for duplicate place_ids (though UNIQUE constraint catches this)

### Edge Cases Not Handled

1. **Venues with no restrooms:** Displayed fine but confusing for users
2. **24-hour venues:** Hours parsing might not handle "Open 24 hours" correctly
3. **Midnight-crossing hours:** A venue open "10 PM - 2 AM" may not calculate correctly
4. **Invalid UUIDs:** Venue detail pages with malformed IDs may crash
5. **Missing Google data:** If Google returns incomplete place data, insert may fail

### Dev vs Production Differences

1. **Localhost works fine:** Google/Mapbox APIs may have different domain restrictions in production
2. **Cold starts:** Vercel serverless cold starts may cause first-request slowness
3. **RLS:** May be configured differently in production Supabase vs development

### Type Assertions Masking Problems

```typescript
// These are throughout the codebase:
process.env.NEXT_PUBLIC_SUPABASE_URL!  // Assumes env var exists
parseFloat(searchParams.get('lat') || '33.8845')  // Assumes valid number
venue.restrooms || []  // Assumes array or undefined, never null
```

---

## 11. THINGS I'M UNSURE ABOUT

### Next.js 14 App Router Uncertainties

1. **Server vs Client data fetching:** I mixed patterns (some pages use server components with direct Supabase access, others use client components with API routes). I'm not sure which is "correct" for this use case.

2. **Caching behavior:** I haven't configured any caching, so I'm not sure how Next.js is caching API responses or server component data fetches.

3. **Dynamic route params:** In `/location/[id]/page.tsx`, I access `params.id` directly. There might be a better pattern with `generateStaticParams` for static generation.

### Supabase Uncertainties

1. **RLS policy syntax:** I never wrote RLS policies for this project. I'd need to research the correct syntax and test them.

2. **PostGIS precision:** I'm using `GEOGRAPHY(POINT, 4326)` for coordinates. I'm not 100% sure this is the right choice vs `GEOMETRY`.

3. **Connection pooling:** I create new Supabase clients in each route. I don't know if Supabase handles pooling or if this creates connection overhead.

4. **Realtime:** The schema is set up for potential realtime updates but I never implemented subscriptions.

### Google/Mapbox Uncertainties

1. **API quotas:** I don't know what the current quota/billing situation is for the Google Maps and Mapbox APIs.

2. **Photo URL expiration:** Google Places photo URLs may have expiration. I'm storing them directly without checking.

3. **Rate limiting:** No idea what happens when we hit Google/Mapbox rate limits.

### General Architecture Questions

1. **Should there be middleware?** I'm not using Next.js middleware. It might be useful for auth checks.

2. **Is the data model right?** The venue → restroom relationship makes sense, but I wonder if "restroom" should be "changing_station" for clarity.

3. **Error monitoring:** No error monitoring (Sentry, etc.) is set up. Errors in production are invisible.

---

## 12. FILE STRUCTURE

```
diaperpal/
├── .env.local.example         # Template for environment variables
├── .gitignore
├── next.config.js             # Minimal Next.js config
├── package.json               # Dependencies
├── postcss.config.mjs         # PostCSS for Tailwind
├── tailwind.config.js         # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
├── vercel.json                # Vercel deployment config
│
├── database/
│   └── migration.sql          # Complete database schema (run manually in Supabase SQL editor)
│
├── lib/
│   ├── supabase.ts            # Supabase client initialization (LEGACY - has old function names)
│   ├── types.ts               # TypeScript type definitions
│   └── utils.ts               # Utility functions (distance, time, formatting)
│
└── app/
    ├── globals.css            # Global styles + Tailwind imports
    ├── layout.tsx             # Root layout with navigation
    ├── page.tsx               # Landing page (/)
    │
    ├── map/
    │   └── page.tsx           # Main map/list view (/map) - CLIENT COMPONENT
    │
    ├── location/
    │   └── [id]/
    │       └── page.tsx       # Venue detail page (/location/:id) - SERVER COMPONENT
    │
    ├── admin/
    │   └── page.tsx           # Admin panel (/admin) - CLIENT COMPONENT
    │
    └── api/
        ├── venues/
        │   ├── route.ts       # POST: Create venue (LEGACY - schema mismatch)
        │   ├── nearby/
        │   │   └── route.ts   # GET: Find nearby venues (MAIN ENDPOINT)
        │   └── [id]/
        │       └── route.ts   # GET: Venue detail with restrooms
        │
        ├── admin/
        │   ├── venues/
        │   │   ├── route.ts   # POST: Create venue from Google Place
        │   │   └── list/
        │   │       └── route.ts  # GET: List all venues
        │   ├── restrooms/
        │   │   └── route.ts   # GET/POST: Restroom CRUD
        │   └── stats/
        │       └── route.ts   # GET: Dashboard statistics
        │
        ├── direction-click/
        │   └── route.ts       # POST: Record analytics
        │
        ├── places/
        │   └── [placeId]/
        │       └── route.ts   # GET: Proxy Google Place details
        │
        ├── locations/         # LEGACY - references old schema
        │   ├── route.ts
        │   ├── nearby/
        │   │   └── route.ts
        │   └── [id]/
        │       └── route.ts
        │
        ├── facilities/        # LEGACY - table doesn't exist
        │   └── route.ts
        │
        ├── photos/            # LEGACY - partial implementation
        │   ├── route.ts
        │   └── [id]/
        │       └── route.ts
        │
        ├── reports/           # LEGACY - table doesn't exist
        │   └── route.ts
        │
        └── votes/             # LEGACY - table doesn't exist
            └── route.ts
```

---

## Summary for Reviewer

Thank you for taking the time to review this codebase. Here's what I'd prioritize looking at:

1. **Security:** The lack of RLS policies and the simple password auth are the biggest concerns
2. **Dead code:** The legacy routes should probably be deleted
3. **Type/schema mismatch:** `lib/types.ts` doesn't match `database/migration.sql`
4. **Error handling:** Many silent failures that could cause data issues
5. **Production readiness:** No monitoring, no tests, hardcoded values

I built this as an MVP to help the founder validate the idea. It works for a small-scale launch with founder-seeded data, but has technical debt that would need addressing before scaling.

Please don't hesitate to point out anything I missed or got wrong. The goal is to make this better, and honest feedback is the fastest path there.
