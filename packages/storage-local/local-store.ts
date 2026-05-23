import type { ProfileStore, TravelerProfile } from '@beenthere/ui'

export class LocalProfileStore implements ProfileStore {
  constructor(private readonly profileId?: string) {}

  private profileUrl(): string {
    if (!this.profileId) return '/api/profile'
    return `/api/profile?profileId=${encodeURIComponent(this.profileId)}`
  }

  async getActiveProfile(): Promise<TravelerProfile | null> {
    const res = await fetch(this.profileUrl())
    if (!res.ok) return null
    return res.json()
  }

  async saveActiveProfile(profile: TravelerProfile): Promise<void> {
    const res = await fetch(this.profileUrl(), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    if (!res.ok) throw new Error(`Failed to save profile: ${res.status}`)
  }

  async putPhotoBlob(key: string, file: File): Promise<void> {
    const form = new FormData()
    form.append('key', key)
    form.append('file', file)
    const res = await fetch('/api/photo', { method: 'POST', body: form })
    if (!res.ok) throw new Error(`Failed to upload photo: ${res.status}`)
  }

  async deletePhotoBlob(key: string): Promise<void> {
    const res = await fetch(`/api/photo/${encodeURIComponent(key)}`, { method: 'DELETE' })
    if (!res.ok && res.status !== 404) throw new Error(`Failed to delete photo: ${res.status}`)
  }
}
