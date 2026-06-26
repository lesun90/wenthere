import type { ProfileStore, TravelerProfile } from '@beenthere/ui'

// XHR (not fetch) so upload progress can drive a per-file progress bar.
function postFormWithProgress(url: string, form: FormData, onProgress?: (loaded: number, total: number) => void): Promise<void> {
  if (!onProgress) {
    return fetch(url, { method: 'POST', body: form }).then(res => {
      if (!res.ok) throw new Error(`Failed to upload photo: ${res.status}`)
    })
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(event.loaded, event.total) }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Failed to upload photo: ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('Network error while uploading photo.'))
    xhr.send(form)
  })
}

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

  async putPhotoBlob(key: string, file: File, onProgress?: (loaded: number, total: number) => void): Promise<void> {
    const form = new FormData()
    form.append('key', key)
    form.append('file', file)
    await postFormWithProgress('/api/photo', form, onProgress)
  }

  async deletePhotoBlob(key: string): Promise<void> {
    const res = await fetch(`/api/photo/${encodeURIComponent(key)}`, { method: 'DELETE' })
    if (!res.ok && res.status !== 404) throw new Error(`Failed to delete photo: ${res.status}`)
  }
}
