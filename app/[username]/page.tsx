export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { getOwnerRegions } from '@/lib/db';
import { publicUrl } from '@/lib/storage';
import type { GlobeRegion } from '@/lib/types';
import GlobeScene from '@/components/globe/GlobeScene';

interface Props {
  params: Promise<{ username: string }>;
}

export default async function UserGlobePage({ params }: Props) {
  const { username } = await params;

  if (username !== (process.env.OWNER_USERNAME ?? 'owner')) {
    notFound();
  }

  const rawRegions = await getOwnerRegions();
  const regions: GlobeRegion[] = rawRegions.map(r => ({
    country_code: r.country_code,
    country_name: r.country_name,
    region_code: r.region_code,
    region_name: r.region_name,
    hero_thumbnail_url: r.thumbnail_path ? publicUrl(r.thumbnail_path) : null,
    photo_count: r.photo_count,
  }));

  return (
    <GlobeScene
      regions={regions}
      username={username}
      isOwner={false}
    />
  );
}
