export const dynamic = 'force-dynamic';

import { getOwnerRegions } from '@/lib/db';
import { publicUrl } from '@/lib/storage';
import type { GlobeRegion } from '@/lib/types';
import GlobeScene from '@/components/globe/GlobeScene';

export default async function DashboardPage() {
  const rawRegions = await getOwnerRegions();
  const regions: GlobeRegion[] = rawRegions.map(r => ({
    country_code: r.country_code,
    country_name: r.country_name,
    region_code: r.region_code,
    region_name: r.region_name,
    hero_thumbnail_url: r.thumbnail_path ? publicUrl(r.thumbnail_path) : null,
    photo_count: r.photo_count,
  }));

  const username = process.env.OWNER_USERNAME ?? 'owner';

  return (
    <GlobeScene
      regions={regions}
      username={username}
      isOwner={true}
    />
  );
}
