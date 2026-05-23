import type { TravelPhoto } from '@beenthere/domain/lib/types'

export function firstOtherPhotoUrls(photos: TravelPhoto[], heroPicUrl: string, limit: number) {
  const urls: string[] = []

  for (const photo of photos) {
    if (photo.url === heroPicUrl) continue
    urls.push(photo.url)
    if (urls.length === limit) break
  }

  return urls
}
