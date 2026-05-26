'use client'

import { FormEvent, ReactElement, useEffect, useMemo, useState } from 'react'

interface AdminProfile {
  id: string
  ownerId: string
  slug: string
  displayName: string
  publicVisible: boolean
  suspendedAt: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  status: 'public' | 'hidden' | 'suspended' | 'deleted'
  photoCounts: { total: number; active: number; uploading: number; failed: number; deleted: number }
  storageBytes: number
  storageAlert: boolean
}

interface AdminProfilesResponse {
  profiles: AdminProfile[]
  page: number
  pageSize: number
  total: number
  summary: { visible: number; hidden: number; suspended: number; storageBytes: number }
}

interface CleanupResponse {
  dryRun: boolean
  candidatePhotoCount: number
  candidateObjectCount: number
  candidateBytes: number
  deletedObjectCount: number
}

const TOKEN_KEY = 'beenthere.admin.supabaseToken'

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function shortDate(value: string | null): string {
  if (!value) return '-'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

/* Geometric SVG patterns */

function GeoGrid() {
  const lines = Array.from({ length: 11 }, (_, i) => i * 10)
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none" className="metric-geo">
      {lines.map(v => <line key={`v${v}`} x1={v} y1="0" x2={v} y2="110" stroke="currentColor" strokeWidth="0.5" />)}
      {lines.map(h => <line key={`h${h}`} x1="0" y1={h} x2="110" y2={h} stroke="currentColor" strokeWidth="0.5" />)}
    </svg>
  )
}

function GeoCircles() {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none" className="metric-geo">
      {[16, 30, 44, 58, 72].map(r => (
        <circle key={r} cx="55" cy="55" r={r} stroke="currentColor" strokeWidth="0.5" />
      ))}
      <line x1="55" y1="0" x2="55" y2="110" stroke="currentColor" strokeWidth="0.4" />
      <line x1="0" y1="55" x2="110" y2="55" stroke="currentColor" strokeWidth="0.4" />
    </svg>
  )
}

function GeoDiagonals() {
  const offsets = [-90, -70, -50, -30, -10, 10, 30, 50, 70, 90, 110, 130, 150, 170, 190]
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none" className="metric-geo">
      {offsets.map(o => (
        <line key={o} x1={o} y1="0" x2={o + 110} y2="110" stroke="currentColor" strokeWidth="0.5" />
      ))}
    </svg>
  )
}

function GeoDots() {
  const dots: ReactElement[] = []
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      dots.push(<circle key={`${r}-${c}`} cx={c * 16 + 9} cy={r * 16 + 9} r="1.4" fill="currentColor" />)
    }
  }
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" className="metric-geo">
      {dots}
    </svg>
  )
}

/* Sidebar icons */

const IconProfiles = () => (
  <svg className="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const IconStorage = () => (
  <svg className="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
)

const IconCleanup = () => (
  <svg className="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
)

const IconAnalytics = () => (
  <svg className="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
)

/* Component */

export function AdminConsole() {
  const [token, setToken] = useState('')
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [data, setData] = useState<AdminProfilesResponse | null>(null)
  const [cleanup, setCleanup] = useState<CleanupResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token])

  useEffect(() => {
    setToken(sessionStorage.getItem(TOKEN_KEY) ?? '')
  }, [])

  async function loadProfiles(nextFilter = filter) {
    if (!token) { setMessage('Paste a Supabase admin access token first.'); return }
    setLoading(true)
    setMessage('')
    sessionStorage.setItem(TOKEN_KEY, token)
    try {
      const params = new URLSearchParams({ filter: nextFilter, pageSize: '25' })
      if (query.trim()) params.set('q', query.trim())
      const res = await fetch(`/api/admin/profiles?${params}`, { headers: authHeaders })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? `Request failed: ${res.status}`)
      setData(body)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Admin request failed.')
    } finally {
      setLoading(false)
    }
  }

  async function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await loadProfiles()
  }

  async function patchProfile(profileId: string, patch: Record<string, unknown>) {
    setBusyId(profileId)
    setMessage('')
    try {
      const res = await fetch('/api/admin/profiles', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ profileId, ...patch }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? `Request failed: ${res.status}`)
      await loadProfiles()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Profile update failed.')
    } finally {
      setBusyId(null)
    }
  }

  async function toggleVisibility(profile: AdminProfile) {
    await patchProfile(profile.id, { publicVisible: !profile.publicVisible })
  }

  async function toggleSuspension(profile: AdminProfile) {
    await patchProfile(profile.id, { suspended: !profile.suspendedAt })
  }

  async function runCleanup(dryRun: boolean) {
    if (!token) { setMessage('Paste a Supabase admin access token first.'); return }
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/storage-cleanup', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ dryRun, limit: 50 }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? `Request failed: ${res.status}`)
      setCleanup(body)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Cleanup request failed.')
    } finally {
      setLoading(false)
    }
  }

  const profiles = data?.profiles ?? []

  return (
    <div className="admin-root">

      <aside className="admin-sidebar">
        <div className="sidebar-logo">
          <div className="logo-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <div>
            <span className="logo-label">Beenthere</span>
            <span className="logo-title">Beta operations</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div>
            <span className="nav-group-label">Management</span>
            <div className="nav-item active"><IconProfiles /><span>Profiles</span></div>
            <div className="nav-item"><IconStorage /><span>Storage</span></div>
          </div>
          <div>
            <span className="nav-group-label">Operations</span>
            <div className="nav-item"><IconCleanup /><span>Cleanup</span></div>
            <div className="nav-item"><IconAnalytics /><span>Analytics</span></div>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sys-row">
            <span className="sys-dot" />
            <span className="sys-label">System OK</span>
          </div>
          <div className="sys-build">v0.1.0-beta</div>
        </div>
      </aside>

      <div className="admin-main">

        <header className="admin-header">
          <div className="header-bc">
            <span className="bc-part">Admin</span>
            <span className="bc-sep">/</span>
            <span className="bc-part current">Profiles</span>
            {data ? (
              <>
                <span className="bc-sep">/</span>
                <span className="bc-part" style={{ color: '#9CA3AF' }}>
                  {data.total} records
                </span>
              </>
            ) : null}
          </div>
          <form className="header-controls" onSubmit={onSearch}>
            <input
              className="hdr-input"
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Supabase access token"
              autoComplete="off"
            />
            <button className="hdr-btn" type="submit" disabled={loading}>
              {loading ? 'Loading' : 'Load data'}
            </button>
            <div className="admin-avatar">ADM</div>
          </form>
        </header>

        <div className="admin-content">

          {message ? <p className="admin-message" role="alert">{message}</p> : null}

          <div className="metrics-grid">
            <div className="metric-card">
              <GeoGrid />
              <span className="metric-label">Visible</span>
              <span className="metric-value">{data?.summary.visible ?? 0}</span>
              <span className="metric-sub">public profiles</span>
            </div>
            <div className="metric-card">
              <GeoCircles />
              <span className="metric-label">Hidden</span>
              <span className="metric-value">{data?.summary.hidden ?? 0}</span>
              <span className="metric-sub">not discoverable</span>
            </div>
            <div className="metric-card">
              <GeoDiagonals />
              <span className="metric-label">Suspended</span>
              <span className="metric-value">{data?.summary.suspended ?? 0}</span>
              <span className="metric-sub">access revoked</span>
            </div>
            <div className="metric-card">
              <GeoDots />
              <span className="metric-label">Page storage</span>
              <span className="metric-value" style={{ fontSize: data?.summary.storageBytes ? '22px' : '30px' }}>
                {formatBytes(data?.summary.storageBytes ?? 0)}
              </span>
              <span className="metric-sub">this result set</span>
            </div>
          </div>

          <div className="content-section">
            <div className="section-hd">
              <span className="section-title">Profile Directory</span>
              <span className="section-meta">
                {data ? `page ${data.page} / ${data.pageSize} per page` : 'authenticate to load'}
              </span>
            </div>

            <form onSubmit={onSearch}>
              <div className="filter-row">
                <input
                  className="filter-search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search slug or display name"
                />
                <select
                  className="filter-select"
                  value={filter}
                  onChange={e => { setFilter(e.target.value); void loadProfiles(e.target.value) }}
                >
                  <option value="all">All profiles</option>
                  <option value="public">Visible</option>
                  <option value="hidden">Hidden</option>
                  <option value="suspended">Suspended</option>
                  <option value="deleted">Deleted</option>
                </select>
                <button className="filter-btn" type="submit" disabled={loading}>
                  Refresh
                </button>
              </div>
            </form>

            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Profile</th>
                    <th>Status</th>
                    <th>Photos</th>
                    <th>Storage</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map(profile => (
                    <tr key={profile.id}>
                      <td>
                        <div className="td-primary">{profile.displayName}</div>
                        <div className="td-secondary">/u/{profile.slug}</div>
                      </td>
                      <td>
                        <span className={`badge ${profile.status}`}>{profile.status}</span>
                      </td>
                      <td>
                        <div className="td-mono">{profile.photoCounts.active}/{profile.photoCounts.total}</div>
                        <div className="td-sub">{profile.photoCounts.failed} failed / {profile.photoCounts.uploading} uploading</div>
                      </td>
                      <td>
                        <div className={`td-mono${profile.storageAlert ? ' storage-alert' : ''}`}>
                          {formatBytes(profile.storageBytes)}
                        </div>
                        <div className="td-sub">{profile.storageAlert ? 'over threshold' : 'within range'}</div>
                      </td>
                      <td>
                        <div className="td-mono">{shortDate(profile.updatedAt)}</div>
                        <div className="td-sub">created {shortDate(profile.createdAt)}</div>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="act-btn"
                            type="button"
                            onClick={() => toggleVisibility(profile)}
                            disabled={busyId === profile.id || profile.status === 'deleted'}
                          >
                            {profile.publicVisible ? 'Hide' : 'Show'}
                          </button>
                          <button
                            className="act-btn danger"
                            type="button"
                            onClick={() => toggleSuspension(profile)}
                            disabled={busyId === profile.id || profile.status === 'deleted'}
                          >
                            {profile.suspendedAt ? 'Restore' : 'Suspend'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {profiles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-cell">
                        No profiles loaded. Authenticate and press Load data to begin.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="content-section">
            <div className="section-hd">
              <span className="section-title">Storage Cleanup</span>
              <span className="section-meta">failed &amp; deleted photo objects only</span>
            </div>
            <div className="cleanup-body">
              <div className="cleanup-stat">
                <div className="cleanup-stat-label">Candidate objects</div>
                <div className="cleanup-stat-value">
                  {cleanup ? `${cleanup.candidateObjectCount} objects` : 'Not scanned'}
                </div>
                <div className="cleanup-stat-sub">
                  {cleanup
                    ? `${formatBytes(cleanup.candidateBytes)} reclaimable${cleanup.dryRun ? ' - dry run' : ''}`
                    : 'Run a scan to identify orphaned objects'}
                </div>
              </div>
              <div className="cleanup-actions">
                <button className="act-btn" type="button" onClick={() => runCleanup(true)} disabled={loading}>
                  Dry run
                </button>
                <button className="act-btn danger" type="button" onClick={() => runCleanup(false)} disabled={loading}>
                  Delete objects
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
