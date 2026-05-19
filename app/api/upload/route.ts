import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { uploadFile, publicUrl } from '@/lib/storage';
import { query, upsertRegions, getOwnerRegions } from '@/lib/db';
import { reverseGeocode } from '@/lib/geocode';
import { OWNER_ID } from '@/lib/types';

async function parseExifGps(buffer: Buffer): Promise<{ lat: number; lng: number } | null> {
  try {
    const exifr = await import('exifr');
    const gps = await exifr.default.gps(buffer);
    if (gps?.latitude != null && gps?.longitude != null) {
      return { lat: gps.latitude, lng: gps.longitude };
    }
  } catch {
    // EXIF parsing is best-effort
  }
  return null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const formData = await request.formData();
  const files = formData.getAll('files') as File[];
  const manualLat = formData.get('lat') ? parseFloat(formData.get('lat') as string) : null;
  const manualLng = formData.get('lng') ? parseFloat(formData.get('lng') as string) : null;
  const caption = (formData.get('caption') as string | null) || null;

  if (!files.length) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }

  const results: { photoId: string; needsLocation: boolean }[] = [];

  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;

    const buffer = Buffer.from(await file.arrayBuffer());
    const photoId = randomUUID();
    const ext = file.type === 'image/png' ? 'png' : 'jpg';

    // Thumbnail
    const thumbnailBuffer = await sharp(buffer)
      .resize(400, 400, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85 })
      .toBuffer();

    const originalKey = `originals/${photoId}.${ext}`;
    const thumbnailKey = `thumbnails/${photoId}.jpg`;

    await Promise.all([
      uploadFile(originalKey, buffer, file.type),
      uploadFile(thumbnailKey, thumbnailBuffer, 'image/jpeg'),
    ]);

    const gps = (manualLat != null && manualLng != null)
      ? { lat: manualLat, lng: manualLng }
      : await parseExifGps(buffer);

    const geo = gps ? await reverseGeocode(gps.lat, gps.lng) : null;

    const exifr = await import('exifr');
    let takenAt: string | null = null;
    try {
      const exif = await exifr.default.parse(buffer, { pick: ['DateTimeOriginal'] });
      if (exif?.DateTimeOriginal) takenAt = new Date(exif.DateTimeOriginal).toISOString();
    } catch { /* best-effort */ }

    await query(
      `INSERT INTO photos
         (id, user_id, storage_path, thumbnail_path, taken_at, lat, lng,
          country_code, country_name, region_code, region_name, is_hero, caption)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,FALSE,$12)`,
      [
        photoId, OWNER_ID, originalKey, thumbnailKey, takenAt,
        gps?.lat ?? null, gps?.lng ?? null,
        geo?.country_code ?? null, geo?.country_name ?? null,
        geo?.region_code ?? null, geo?.region_name ?? null,
        caption,
      ]
    );

    if (geo) {
      await upsertRegions(geo.country_code, geo.country_name, geo.region_code, geo.region_name);
      // Make first photo in a region the hero automatically
      await query(
        `UPDATE photos SET is_hero = TRUE
         WHERE id = $1
           AND NOT EXISTS (
             SELECT 1 FROM photos
             WHERE user_id = $2 AND country_code = $3 AND is_hero = TRUE AND id != $1
           )`,
        [photoId, OWNER_ID, geo.country_code]
      );
    }

    results.push({ photoId, needsLocation: gps === null });
  }

  const regions = await getOwnerRegions();
  const regionsWithUrls = regions.map(r => ({
    ...r,
    hero_thumbnail_url: r.thumbnail_path ? publicUrl(r.thumbnail_path) : null,
  }));

  return NextResponse.json({ results, regions: regionsWithUrls });
}
