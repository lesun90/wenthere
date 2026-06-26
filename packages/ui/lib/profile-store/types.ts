import type { TravelerProfile } from '../types'

export interface ProfileStore {
  getActiveProfile(): Promise<TravelerProfile | null>
  saveActiveProfile(profile: TravelerProfile): Promise<void>
  putPhotoBlob?(key: string, file: File, onProgress?: (loaded: number, total: number) => void): Promise<void>
  deletePhotoBlob?(key: string): Promise<void>
}
