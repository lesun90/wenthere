import type { TravelPhoto } from '../../data/seed'

export function firstOtherPhotoUrls(photos: TravelPhoto[], heroPicUrl: string, limit: number) {
  const urls: string[] = []

  for (const photo of photos) {
    if (photo.url === heroPicUrl) continue
    urls.push(photo.url)
    if (urls.length === limit) break
  }

  return urls
}
