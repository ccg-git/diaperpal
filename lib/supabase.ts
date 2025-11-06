import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function findNearbyStations(lat: number, lng: number, radiusKm: number = 5) {
  const { data, error } = await supabase.rpc('find_nearby_stations', {
    user_lat: lat,
    user_lng: lng,
    radius_km: radiusKm
  });

  if (error) {
    console.error('Error finding nearby stations:', error);
    return [];
  }

  return data || [];
}

export async function getStationDetail(id: string) {
  const { data, error } = await supabase
    .from('stations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching station:', error);
    return null;
  }

  return data;
}