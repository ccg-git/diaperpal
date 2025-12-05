-- DiaperPal Database Schema
-- Reverse-engineered from production Supabase database
-- Last synced: December 5, 2025
--
-- IMPORTANT: This file documents the current production schema.
-- Do NOT run this blindly - it includes DROP statements.
-- For fresh setup, run sections selectively.

-- ============================================
-- STEP 0: Enable required extensions
-- ============================================
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- STEP 1: Create custom types (enums)
-- ============================================

-- User roles for RBAC
CREATE TYPE user_role AS ENUM ('user', 'reviewer', 'admin');

-- Venue approval status
CREATE TYPE venue_status AS ENUM ('pending', 'approved', 'rejected');

-- ============================================
-- STEP 2: Create profiles table (linked to Supabase Auth)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role user_role DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- STEP 3: Create venues table
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
  rating NUMERIC(3,1),
  review_count INTEGER,
  photo_urls TEXT[],

  -- Future expansion
  family_amenities JSONB DEFAULT '{}',

  -- Moderation
  status venue_status DEFAULT 'approved',
  submitted_by UUID NOT NULL REFERENCES profiles(id),

  -- Audit trail
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  google_data_refreshed_at TIMESTAMP
);

-- Trigger to auto-set submitted_by from auth context
CREATE OR REPLACE FUNCTION set_submitted_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.submitted_by IS NULL THEN
    NEW.submitted_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_venue_submitted_by
  BEFORE INSERT ON venues
  FOR EACH ROW
  EXECUTE FUNCTION set_submitted_by();

-- Indexes for venues
CREATE INDEX idx_venue_coordinates ON venues USING GIST(coordinates);
CREATE INDEX idx_venue_type ON venues(venue_type);
CREATE INDEX idx_venue_place_id ON venues(place_id);
CREATE INDEX idx_venue_status ON venues(status);

-- ============================================
-- STEP 4: Create restrooms table
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
  verified_by_user_id UUID REFERENCES profiles(id),
  verified_at TIMESTAMP,

  -- Safety & moderation
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  safety_notes TEXT,
  admin_notes TEXT,

  -- Issue tracking (for Report Issue feature)
  has_safety_concern BOOLEAN DEFAULT FALSE,
  safety_concern_notes TEXT,
  has_cleanliness_issue BOOLEAN DEFAULT FALSE,
  cleanliness_issue_notes TEXT,
  additional_notes TEXT,

  -- Direct photo URL (simpler than separate table for v1)
  photo_url TEXT,

  -- Usage tracking
  times_directions_clicked INTEGER DEFAULT 0,

  -- Audit trail
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by_user_id UUID REFERENCES profiles(id)
);

-- Indexes for restrooms
CREATE INDEX idx_restroom_venue ON restrooms(venue_id);
CREATE INDEX idx_restroom_gender ON restrooms(gender);
CREATE INDEX idx_restroom_status ON restrooms(status);
CREATE INDEX idx_restroom_moderation ON restrooms(moderation_status);

-- ============================================
-- STEP 5: Create restroom_photos table
-- ============================================
CREATE TABLE restroom_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restroom_id UUID NOT NULL REFERENCES restrooms(id) ON DELETE CASCADE,

  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,

  uploaded_by_user_id UUID REFERENCES profiles(id),
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for photos
CREATE INDEX idx_photo_restroom ON restroom_photos(restroom_id);
CREATE UNIQUE INDEX idx_one_primary_per_restroom ON restroom_photos(restroom_id, is_primary) WHERE is_primary = TRUE;

-- ============================================
-- STEP 6: Create direction_clicks table (analytics)
-- ============================================
CREATE TABLE direction_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  restroom_id UUID REFERENCES restrooms(id) ON DELETE SET NULL,

  -- User context (for analytics, not auth)
  user_lat NUMERIC,
  user_lng NUMERIC,
  source TEXT DEFAULT 'list',

  -- Privacy-conscious tracking
  user_agent TEXT,
  ip_hash TEXT,

  clicked_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX idx_direction_venue ON direction_clicks(venue_id);
CREATE INDEX idx_direction_date ON direction_clicks(clicked_at);
CREATE INDEX idx_direction_restroom ON direction_clicks(restroom_id);

-- ============================================
-- STEP 7: Create PostGIS functions for nearby search
-- ============================================

-- Primary function (current)
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
  rating NUMERIC,
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
  WHERE v.status = 'approved'
    AND ST_DWithin(
      v.coordinates::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Legacy function (kept for backwards compatibility)
CREATE OR REPLACE FUNCTION find_nearby_stations(
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
  rating NUMERIC,
  review_count INTEGER,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  -- Delegate to find_nearby_venues
  RETURN QUERY SELECT * FROM find_nearby_venues(user_lat, user_lng, radius_km);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 8: Create updated_at trigger
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
-- STEP 9: Row Level Security Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE restrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE restroom_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE direction_clicks ENABLE ROW LEVEL SECURITY;

-- -----------------------------
-- Helper function to get current user's role (bypasses RLS to avoid circular dependency)
-- -----------------------------
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- -----------------------------
-- Profiles policies
-- -----------------------------
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- -----------------------------
-- Venues policies
-- -----------------------------
CREATE POLICY "Public read approved venues"
  ON venues FOR SELECT
  TO public
  USING (status = 'approved');

CREATE POLICY "Reviewers see all venues"
  ON venues FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('reviewer', 'admin'));

CREATE POLICY "Reviewers can insert venues"
  ON venues FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('reviewer', 'admin'));

CREATE POLICY "Admins can update venues"
  ON venues FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Admins can delete venues"
  ON venues FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- -----------------------------
-- Restrooms policies
-- -----------------------------
CREATE POLICY "Public read approved restrooms"
  ON restrooms FOR SELECT
  TO public
  USING (moderation_status = 'approved');

CREATE POLICY "Reviewers see all restrooms"
  ON restrooms FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('reviewer', 'admin'));

CREATE POLICY "Reviewers can insert restrooms"
  ON restrooms FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('reviewer', 'admin'));

CREATE POLICY "Admins can update restrooms"
  ON restrooms FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Admins can delete restrooms"
  ON restrooms FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- -----------------------------
-- Restroom photos policies
-- -----------------------------
CREATE POLICY "Public read photos"
  ON restroom_photos FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Reviewers can insert photos"
  ON restroom_photos FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('reviewer', 'admin'));

CREATE POLICY "Admins can update photos"
  ON restroom_photos FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Admins can delete photos"
  ON restroom_photos FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- -----------------------------
-- Direction clicks policies
-- -----------------------------
CREATE POLICY "Public can insert clicks"
  ON direction_clicks FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can read clicks"
  ON direction_clicks FOR SELECT
  TO authenticated
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Admins can delete clicks"
  ON direction_clicks FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- ============================================
-- DONE! Schema matches production as of Dec 5, 2025
-- ============================================
