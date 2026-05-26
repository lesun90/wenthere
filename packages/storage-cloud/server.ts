import { randomUUID } from 'crypto'
import { S3Client } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'

export const CLOUD_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
] as const

export interface CloudEnvironment {
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceRoleKey: string
  r2AccountId: string
  r2AccessKeyId: string
  r2SecretAccessKey: string
  r2Bucket: string
  r2Endpoint: string
}

export type CloudEnvSource = Record<string, string | undefined>

export interface ImageDimensions {
  width: number
  height: number
}

export interface PlannedImageVariant {
  name: 'display' | 'thumb'
  width: number
  height: number
  format: 'webp'
  stripMetadata: true
  quality: number
}

export interface R2ObjectKeyInput {
  profileId: string
  photoId: string
  randomId?: string
  extension: string
}

export interface R2ObjectKeys {
  original: string
  display: string
  thumb: string
}

export const IMAGE_VARIANTS = {
  display: {
    name: 'display',
    longEdge: 2048,
    webpQuality: 86,
    jpegQuality: 88,
  },
  thumb: {
    name: 'thumb',
    longEdge: 512,
    webpQuality: 82,
    jpegQuality: 85,
  },
} as const

export function missingCloudEnvironment(env: CloudEnvSource = process.env): string[] {
  return CLOUD_ENV_KEYS.filter(key => !env[key]?.trim())
}

export function getCloudEnvironment(env: CloudEnvSource = process.env): CloudEnvironment {
  const missing = missingCloudEnvironment(env)
  if (missing.length > 0) {
    throw new Error(`Missing cloud environment variables: ${missing.join(', ')}`)
  }

  const r2AccountId = env.R2_ACCOUNT_ID as string
  return {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL as string,
    supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY as string,
    r2AccountId,
    r2AccessKeyId: env.R2_ACCESS_KEY_ID as string,
    r2SecretAccessKey: env.R2_SECRET_ACCESS_KEY as string,
    r2Bucket: env.R2_BUCKET as string,
    r2Endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  }
}

export function createSupabaseAdminClient(env: CloudEnvironment = getCloudEnvironment()) {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function createR2Client(env: CloudEnvironment = getCloudEnvironment()): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: env.r2Endpoint,
    credentials: {
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey,
    },
  })
}

function scaledDimensions(dimensions: ImageDimensions, longEdge: number): ImageDimensions {
  const longest = Math.max(dimensions.width, dimensions.height)
  if (longest <= longEdge) return dimensions
  const ratio = longEdge / longest
  return {
    width: Math.round(dimensions.width * ratio),
    height: Math.round(dimensions.height * ratio),
  }
}

export function planImageVariants(dimensions: ImageDimensions): PlannedImageVariant[] {
  return [IMAGE_VARIANTS.display, IMAGE_VARIANTS.thumb].map(variant => {
    const scaled = scaledDimensions(dimensions, variant.longEdge)
    return {
      name: variant.name,
      width: scaled.width,
      height: scaled.height,
      format: 'webp',
      stripMetadata: true,
      quality: variant.webpQuality,
    }
  })
}

function cleanPathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
}

export function buildR2ObjectKeys(input: R2ObjectKeyInput): R2ObjectKeys {
  const randomId = cleanPathSegment(input.randomId ?? randomUUID().replace(/-/g, ''))
  const profileId = cleanPathSegment(input.profileId)
  const photoId = cleanPathSegment(input.photoId)
  const extension = cleanPathSegment(input.extension.toLowerCase())
  const prefix = `profiles/${profileId}/photos/${photoId}/${randomId}`
  return {
    original: `${prefix}/original.${extension}`,
    display: `${prefix}/display.webp`,
    thumb: `${prefix}/thumb.webp`,
  }
}

export function publicPhotoCacheHeaders({ visible }: { visible: boolean }): Record<string, string> {
  return {
    'Cache-Control': visible ? 'private, max-age=0, must-revalidate' : 'no-store',
  }
}
