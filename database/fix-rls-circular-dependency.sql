-- Fix for RLS Circular Dependency Issue
-- Run this in Supabase SQL Editor to fix admin login issues
--
-- Problem: The RLS policies on profiles table had a circular dependency
-- where checking if a user is an admin required querying the profiles table,
-- which itself triggers RLS checks, causing the query to fail.
--
-- Solution: Create a SECURITY DEFINER function that bypasses RLS to check
-- the current user's role, then update all policies to use this function.

-- Step 1: Create helper function to get current user's role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 2: Drop and recreate the problematic profiles policy
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- Step 3: Update venues policies
DROP POLICY IF EXISTS "Reviewers see all venues" ON venues;
CREATE POLICY "Reviewers see all venues"
  ON venues FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('reviewer', 'admin'));

DROP POLICY IF EXISTS "Reviewers can insert venues" ON venues;
CREATE POLICY "Reviewers can insert venues"
  ON venues FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('reviewer', 'admin'));

DROP POLICY IF EXISTS "Admins can update venues" ON venues;
CREATE POLICY "Admins can update venues"
  ON venues FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Admins can delete venues" ON venues;
CREATE POLICY "Admins can delete venues"
  ON venues FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- Step 4: Update restrooms policies
DROP POLICY IF EXISTS "Reviewers see all restrooms" ON restrooms;
CREATE POLICY "Reviewers see all restrooms"
  ON restrooms FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('reviewer', 'admin'));

DROP POLICY IF EXISTS "Reviewers can insert restrooms" ON restrooms;
CREATE POLICY "Reviewers can insert restrooms"
  ON restrooms FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('reviewer', 'admin'));

DROP POLICY IF EXISTS "Admins can update restrooms" ON restrooms;
CREATE POLICY "Admins can update restrooms"
  ON restrooms FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Admins can delete restrooms" ON restrooms;
CREATE POLICY "Admins can delete restrooms"
  ON restrooms FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- Step 5: Update restroom_photos policies
DROP POLICY IF EXISTS "Reviewers can insert photos" ON restroom_photos;
CREATE POLICY "Reviewers can insert photos"
  ON restroom_photos FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('reviewer', 'admin'));

DROP POLICY IF EXISTS "Admins can update photos" ON restroom_photos;
CREATE POLICY "Admins can update photos"
  ON restroom_photos FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Admins can delete photos" ON restroom_photos;
CREATE POLICY "Admins can delete photos"
  ON restroom_photos FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- Step 6: Update direction_clicks policies
DROP POLICY IF EXISTS "Admins can read clicks" ON direction_clicks;
CREATE POLICY "Admins can read clicks"
  ON direction_clicks FOR SELECT
  TO authenticated
  USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Admins can delete clicks" ON direction_clicks;
CREATE POLICY "Admins can delete clicks"
  ON direction_clicks FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- Done! Admin login should now work correctly.
