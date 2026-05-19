CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  username    TEXT        UNIQUE NOT NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS photos (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storage_path    TEXT        NOT NULL,
  thumbnail_path  TEXT        NOT NULL,
  taken_at        TIMESTAMPTZ,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lat             FLOAT,
  lng             FLOAT,
  country_code    TEXT,
  country_name    TEXT,
  region_code     TEXT,
  region_name     TEXT,
  is_hero         BOOLEAN     NOT NULL DEFAULT FALSE,
  caption         TEXT
);

CREATE TABLE IF NOT EXISTS regions (
  id            UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  country_code  TEXT    NOT NULL,
  country_name  TEXT    NOT NULL,
  region_code   TEXT,
  region_name   TEXT,
  hero_photo_id UUID    REFERENCES photos(id) ON DELETE SET NULL,
  photo_count   INT     NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS regions_country_level
  ON regions (user_id, country_code)
  WHERE region_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS regions_region_level
  ON regions (user_id, country_code, region_code)
  WHERE region_code IS NOT NULL;

-- Single owner row — username updated at app startup from OWNER_USERNAME env var
INSERT INTO users (id, username, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'owner', NOW())
ON CONFLICT (id) DO NOTHING;

-- ── Demo seed data ────────────────────────────────────────────────────────────
-- thumbnail_path is a full picsum.photos URL; publicUrl() returns it unchanged.
-- These rows let the globe render with real thumbnails before any photos are uploaded.

INSERT INTO photos (id, user_id, storage_path, thumbnail_path, taken_at, lat, lng,
                    country_code, country_name, region_code, region_name, is_hero, caption)
VALUES
  ('d1000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'demo/fr-1.jpg', 'https://picsum.photos/seed/wt-fr1/400/400',
   '2024-06-10 09:00:00+00', 48.8566, 2.3522,
   'FR', 'France', 'FR-IDF', 'Île-de-France', TRUE, 'Morning at the Louvre'),

  ('d1000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'demo/fr-2.jpg', 'https://picsum.photos/seed/wt-fr2/400/400',
   '2024-06-11 16:00:00+00', 48.8731, 2.2950,
   'FR', 'France', 'FR-IDF', 'Île-de-France', FALSE, 'Café on the Seine'),

  ('d1000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000001',
   'demo/jp-1.jpg', 'https://picsum.photos/seed/wt-jp1/400/400',
   '2024-03-25 07:30:00+00', 35.6762, 139.6503,
   'JP', 'Japan', 'JP-13', 'Tokyo', TRUE, 'Cherry blossoms in Shinjuku'),

  ('d1000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000001',
   'demo/jp-2.jpg', 'https://picsum.photos/seed/wt-jp2/400/400',
   '2024-03-26 12:00:00+00', 35.0116, 135.7681,
   'JP', 'Japan', 'JP-26', 'Kyoto', FALSE, 'Fushimi Inari at dusk'),

  ('d1000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000001',
   'demo/us-1.jpg', 'https://picsum.photos/seed/wt-us1/400/400',
   '2023-09-05 16:00:00+00', 37.8044, -122.2712,
   'US', 'United States of America', 'US-CA', 'California', TRUE, 'Golden Gate fog'),

  ('d1000000-0000-0000-0000-000000000006',
   '00000000-0000-0000-0000-000000000001',
   'demo/us-2.jpg', 'https://picsum.photos/seed/wt-us2/400/400',
   '2023-09-06 11:00:00+00', 36.1069, -112.1129,
   'US', 'United States of America', 'US-AZ', 'Arizona', FALSE, 'Grand Canyon south rim'),

  ('d1000000-0000-0000-0000-000000000007',
   '00000000-0000-0000-0000-000000000001',
   'demo/br-1.jpg', 'https://picsum.photos/seed/wt-br1/400/400',
   '2023-12-28 10:00:00+00', -22.9068, -43.1729,
   'BR', 'Brazil', 'BR-RJ', 'Rio de Janeiro', TRUE, 'Ipanema at golden hour'),

  ('d1000000-0000-0000-0000-000000000008',
   '00000000-0000-0000-0000-000000000001',
   'demo/au-1.jpg', 'https://picsum.photos/seed/wt-au1/400/400',
   '2023-07-15 13:00:00+00', -33.8688, 151.2093,
   'AU', 'Australia', 'AU-NSW', 'New South Wales', TRUE, 'Sydney Opera House'),

  ('d1000000-0000-0000-0000-000000000009',
   '00000000-0000-0000-0000-000000000001',
   'demo/ke-1.jpg', 'https://picsum.photos/seed/wt-ke1/400/400',
   '2024-01-20 06:30:00+00', -1.2921, 36.8219,
   'KE', 'Kenya', 'KE-110', 'Nairobi', TRUE, 'Sunrise safari')
ON CONFLICT (id) DO NOTHING;

-- Country-level region records (region_code IS NULL = country overview)
INSERT INTO regions (user_id, country_code, country_name, region_code, region_name, hero_photo_id, photo_count)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'FR', 'France',                       NULL, NULL, 'd1000000-0000-0000-0000-000000000001', 2),
  ('00000000-0000-0000-0000-000000000001', 'JP', 'Japan',                        NULL, NULL, 'd1000000-0000-0000-0000-000000000003', 2),
  ('00000000-0000-0000-0000-000000000001', 'US', 'United States of America',     NULL, NULL, 'd1000000-0000-0000-0000-000000000005', 2),
  ('00000000-0000-0000-0000-000000000001', 'BR', 'Brazil',                       NULL, NULL, 'd1000000-0000-0000-0000-000000000007', 1),
  ('00000000-0000-0000-0000-000000000001', 'AU', 'Australia',                    NULL, NULL, 'd1000000-0000-0000-0000-000000000008', 1),
  ('00000000-0000-0000-0000-000000000001', 'KE', 'Kenya',                        NULL, NULL, 'd1000000-0000-0000-0000-000000000009', 1)
ON CONFLICT (user_id, country_code) WHERE region_code IS NULL DO NOTHING;
