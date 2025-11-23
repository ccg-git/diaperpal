-- DiaperPal Database Migration
-- Run this in Supabase SQL Editor
-- Created: November 22, 2025

-- ============================================
-- STEP 1: Drop existing tables (test data only)
-- ============================================
DROP TABLE IF EXISTS restroom_photos CASCADE;
DROP TABLE IF EXISTS direction_clicks CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS facilities CASCADE;
DROP TABLE IF EXISTS restrooms CASCADE;
DROP TABLE IF EXISTS venues CASCADE;

-- ============================================
-- STEP 2: Create new venues table
-- ============================================
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Google Places integration
  place_id TEXT UNIQUE NOT NULL,

  -- Core venue data
  name TEXT NOT NULL,
  address TEXT NOT NULL,

  -- Coordinates (both formats for flexibility)
  lat NUMERIC(10,8) NOT NULL,
  lng NUMERIC(11,8) NOT NULL,
  coordinates GEOGRAPHY(POINT, 4326) NOT NULL,

  -- Venue classification
  venue_type TEXT NOT NULL CHECK (venue_type IN ('food_drink', 'parks_outdoors', 'indoor_activities', 'errands')),

  -- Google cached data
  hours_json JSONB,
  special_hours JSONB,
  rating DECIMAL(3,1),
  review_count INTEGER,
  photo_urls TEXT[],

  -- Future expansion
  family_amenities JSONB DEFAULT '{}',

  -- Audit trail
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  google_data_refreshed_at TIMESTAMP
);

-- Indexes for venues
CREATE INDEX idx_venue_coordinates ON venues USING GIST(coordinates);
CREATE INDEX idx_venue_type ON venues(venue_type);
CREATE INDEX idx_venue_place_id ON venues(place_id);

-- ============================================
-- STEP 3: Create restrooms table
-- ============================================
CREATE TABLE restrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,

  -- Restroom identity
  gender TEXT NOT NULL CHECK (gender IN ('mens', 'womens', 'all_gender')),
  station_location TEXT NOT NULL CHECK (station_location IN ('single_restroom', 'inside_stall', 'near_sinks')),

  -- Location details
  restroom_location_text TEXT,

  -- Verification status
  status TEXT NOT NULL DEFAULT 'unverified' CHECK (status IN ('verified_present', 'verified_absent', 'unverified')),
  verified_by_user_id UUID,
  verified_at TIMESTAMP,

  -- Safety & moderation
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  safety_notes TEXT,
  admin_notes TEXT,

  -- Audit trail
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by_user_id UUID
);

-- Indexes for restrooms
CREATE INDEX idx_restroom_venue ON restrooms(venue_id);
CREATE INDEX idx_restroom_gender ON restrooms(gender);
CREATE INDEX idx_restroom_status ON restrooms(status);

-- ============================================
-- STEP 4: Create restroom_photos table
-- ============================================
CREATE TABLE restroom_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restroom_id UUID NOT NULL REFERENCES restrooms(id) ON DELETE CASCADE,

  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,

  uploaded_by_user_id UUID,
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for photos
CREATE INDEX idx_photo_restroom ON restroom_photos(restroom_id);
CREATE UNIQUE INDEX idx_one_primary_per_restroom ON restroom_photos(restroom_id, is_primary) WHERE is_primary = TRUE;

-- ============================================
-- STEP 5: Create direction_clicks table
-- ============================================
CREATE TABLE direction_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP DEFAULT NOW(),
  user_agent TEXT,
  ip_hash TEXT
);

-- Indexes for analytics
CREATE INDEX idx_direction_venue ON direction_clicks(venue_id);
CREATE INDEX idx_direction_date ON direction_clicks(clicked_at);

-- ============================================
-- STEP 6: Create PostGIS function for nearby search
-- ============================================
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
    v.id,
    v.name,
    v.address,
    v.lat,
    v.lng,
    v.venue_type,
    v.place_id,
    v.hours_json,
    v.rating,
    v.review_count,
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

-- ============================================
-- STEP 7: Add updated_at trigger
-- ============================================
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

-- ============================================
-- DONE! Your database is ready.
-- ============================================
