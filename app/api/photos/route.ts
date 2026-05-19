export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getPhotosByRegion } from '@/lib/db';
import { publicUrl } from '@/lib/storage';

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country');
  const region = searchParams.get('region') ?? null;

  if (!country) {
    return NextResponse.json({ error: 'country is required' }, { status: 400 });
  }

  const photos = await getPhotosByRegion(country, region);
  const withUrls = photos.map(p => ({
    ...p,
    thumbnail_url: publicUrl(p.thumbnail_path),
    original_url: publicUrl(p.storage_path),
  }));

  return NextResponse.json(withUrls);
}
