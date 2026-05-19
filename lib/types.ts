export const OWNER_ID = '00000000-0000-0000-0000-000000000001';

export interface GlobeRegion {
  country_code: string;
  country_name: string;
  region_code: string | null;
  region_name: string | null;
  hero_thumbnail_url: string | null;
  photo_count: number;
}
