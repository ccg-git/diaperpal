export interface Station {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  privacy_level: 'private' | 'semi_private' | 'exposed';
  gender_accessibility: 'mens' | 'womens' | 'family' | 'both';
  cleanliness_rating: number;
  last_verified: string;
  verification_status: 'founder' | 'scout' | 'community';
  status: 'active' | 'broken' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface Facility {
  id: string;
  station_id: string;
  facility_type: 'mens' | 'womens' | 'family' | 'allgender';
  verification_status: 'verified_present' | 'verified_absent' | 'unverified';
  privacy_level: 'private' | 'semi_private' | 'exposed';
  cleanliness_rating: number;
  strap_condition: 'good' | 'dirty' | 'broken' | 'missing';
  safety_rating: 'safe' | 'questionable' | 'unsafe';
  issues: string;
  verified_by: string;
  verified_at: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  venue_type: string;
  created_at: string;
  updated_at: string;
}

export interface LocationDetail {
  id: string;
  name: string;
  address: string;
  privacy: string;
  gender_accessibility: string;
  cleanliness: number;
  votes_up: number;
  votes_down: number;
  reports: number;
  last_verified: string;
  facilities: Facility[];
  issues: string;
}

export interface NearbyLocation {
  id: string;
  name: string;
  distance: number;
  cleanliness: number;
  privacy: string;
  verified: string;
  lat: number;
  lng: number;
}