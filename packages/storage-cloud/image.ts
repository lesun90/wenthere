import type { PlannedImageVariant } from './server'
import { planImageVariants } from './server'

export interface CreatedImageVariant extends PlannedImageVariant {
  buffer: Buffer
  mimeType: 'image/webp'
}

export async function createImageVariants(original: Buffer): Promise<CreatedImageVariant[]> {
  const sharp = (await import('sharp')).default
  const metadata = await sharp(original).metadata()
  if (!metadata.width || !metadata.height) {
    throw new Error('Uploaded image is missing decodable dimensions.')
  }

  const variants = planImageVariants({ width: metadata.width, height: metadata.height })
  return Promise.all(variants.map(async variant => ({
    ...variant,
    mimeType: 'image/webp' as const,
    buffer: await sharp(original)
      .rotate()
      .resize({ width: variant.width, height: variant.height, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: variant.quality })
      .toBuffer(),
  })))
}
