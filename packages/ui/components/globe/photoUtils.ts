import type { TravelPhoto } from '../../lib/types'

export function firstOtherPhotoUrls(photos: TravelPhoto[], heroPicUrl: string, limit: number) {
  const urls: string[] = []
  if (limit <= 0) return urls

  for (const photo of photos) {
    if (photo.url === heroPicUrl) continue
    urls.push(photo.url)
    if (urls.length === limit) break
  }

  return urls
}
