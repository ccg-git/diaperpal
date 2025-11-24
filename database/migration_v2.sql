-- DiaperPal Database Migration v2
-- Run this in Supabase SQL Editor AFTER running migration.sql
-- Adds: safety_concern, cleanliness_issue fields and separate tips/notes
-- Created: November 24, 2025

-- ============================================
-- STEP 1: Add new columns to restrooms table
-- ============================================

-- Add safety concern fields
ALTER TABLE restrooms ADD COLUMN IF NOT EXISTS has_safety_concern BOOLEAN DEFAULT false;
ALTER TABLE restrooms ADD COLUMN IF NOT EXISTS safety_concern_notes TEXT;

-- Add cleanliness issue fields
ALTER TABLE restrooms ADD COLUMN IF NOT EXISTS has_cleanliness_issue BOOLEAN DEFAULT false;
ALTER TABLE restrooms ADD COLUMN IF NOT EXISTS cleanliness_issue_notes TEXT;

-- Rename safety_notes to additional_notes (tips like "ask for key")
-- First check if we need to migrate data
DO $$
BEGIN
  -- Add additional_notes if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='restrooms' AND column_name='additional_notes') THEN
    ALTER TABLE restrooms ADD COLUMN additional_notes TEXT;
  END IF;

  -- If safety_notes exists and additional_notes is empty, migrate the data
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='restrooms' AND column_name='safety_notes') THEN
    UPDATE restrooms SET additional_notes = safety_notes WHERE additional_notes IS NULL;
  END IF;
END $$;

-- Add photo_url directly on restroom (simpler than separate table for v1)
ALTER TABLE restrooms ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add times_directions_clicked counter
ALTER TABLE restrooms ADD COLUMN IF NOT EXISTS times_directions_clicked INTEGER DEFAULT 0;

-- ============================================
-- STEP 2: Create index for analytics
-- ============================================
CREATE INDEX IF NOT EXISTS idx_restroom_station_location ON restrooms(station_location);

-- ============================================
-- STEP 3: Update direction_clicks to track restroom_id
-- ============================================
ALTER TABLE direction_clicks ADD COLUMN IF NOT EXISTS restroom_id UUID REFERENCES restrooms(id) ON DELETE SET NULL;
ALTER TABLE direction_clicks ADD COLUMN IF NOT EXISTS user_lat DECIMAL(10, 8);
ALTER TABLE direction_clicks ADD COLUMN IF NOT EXISTS user_lng DECIMAL(11, 8);

-- ============================================
-- DONE! Schema updated for v2 fields.
-- ============================================
