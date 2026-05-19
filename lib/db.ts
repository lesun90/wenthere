import { Pool } from 'pg';
import { OWNER_ID } from './types';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await getPool().query(sql, params);
  return result.rows as T[];
}

export async function ensureOwnerUser(): Promise<void> {
  const username = process.env.OWNER_USERNAME ?? 'owner';
  await query(
    `UPDATE users SET username = $1 WHERE id = $2`,
    [username, OWNER_ID]
  );
}

export async function getOwnerRegions() {
  return query<{
    country_code: string;
    country_name: string;
    region_code: string | null;
    region_name: string | null;
    hero_photo_id: string | null;
    thumbnail_path: string | null;
    photo_count: number;
  }>(`
    SELECT
      r.country_code,
      r.country_name,
      r.region_code,
      r.region_name,
      r.hero_photo_id,
      p.thumbnail_path,
      r.photo_count
    FROM regions r
    LEFT JOIN photos p ON p.id = r.hero_photo_id
    WHERE r.user_id = $1
    ORDER BY r.country_name, r.region_name
  `, [OWNER_ID]);
}

export async function getPhotosByRegion(
  countryCode: string,
  regionCode: string | null
): Promise<{
  id: string;
  thumbnail_path: string;
  storage_path: string;
  taken_at: string | null;
  caption: string | null;
  country_name: string | null;
  region_name: string | null;
  is_hero: boolean;
}[]> {
  return query(`
    SELECT id, thumbnail_path, storage_path, taken_at, caption, country_name, region_name, is_hero
    FROM photos
    WHERE user_id = $1
      AND country_code = $2
      AND ($3::text IS NULL OR region_code = $3)
    ORDER BY is_hero DESC, taken_at DESC NULLS LAST
  `, [OWNER_ID, countryCode, regionCode]);
}

export async function upsertRegions(
  countryCode: string,
  countryName: string,
  regionCode: string | null,
  regionName: string | null
): Promise<void> {
  // Rebuild country-level record
  await query(`
    DELETE FROM regions WHERE user_id = $1 AND country_code = $2 AND region_code IS NULL
  `, [OWNER_ID, countryCode]);

  await query(`
    INSERT INTO regions (user_id, country_code, country_name, region_code, region_name, hero_photo_id, photo_count)
    SELECT
      $1, $2, $3, NULL, NULL,
      (SELECT id FROM photos WHERE user_id = $1 AND country_code = $2 AND is_hero = true ORDER BY uploaded_at LIMIT 1),
      COUNT(*)
    FROM photos
    WHERE user_id = $1 AND country_code = $2
  `, [OWNER_ID, countryCode, countryName]);

  if (regionCode && regionName) {
    await query(`
      DELETE FROM regions WHERE user_id = $1 AND region_code = $2
    `, [OWNER_ID, regionCode]);

    await query(`
      INSERT INTO regions (user_id, country_code, country_name, region_code, region_name, hero_photo_id, photo_count)
      SELECT
        $1, $2, $3, $4, $5,
        (SELECT id FROM photos WHERE user_id = $1 AND region_code = $4 AND is_hero = true ORDER BY uploaded_at LIMIT 1),
        COUNT(*)
      FROM photos
      WHERE user_id = $1 AND region_code = $4
    `, [OWNER_ID, countryCode, countryName, regionCode, regionName]);
  }
}
