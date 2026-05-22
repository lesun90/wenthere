'use client'

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { CountrySummary, ProfileIndex, TravelPhoto } from '../../lib/types'

const DRAWER_WIDTH = 380
const ENTER_DURATION = 340
const EXIT_DURATION = 220
const MAX_SUGGESTIONS = 6
const PANEL_SLIDE_MS = 280

interface Props {
  isOpen: boolean
  onClose: () => void
  profileIndex: ProfileIndex
  onImportFiles?: (files: File[]) => void
  onDeletePhoto?: (photoId: string) => void
  onEditPhoto?: (photoId: string, draft: PhotoEditDraft) => void
}

interface Suggestion {
  label: string
  type: 'country' | 'subdivision'
  countryCode: string
  subdivisionCode?: string
}

type FilteredEntry = { country: CountrySummary; subdivisionCodes: string[] }

export interface PhotoEditDraft {
  caption: string
  takenAt: string
  countryName: string
  subdivisionName: string
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function findPhoto(photoId: string, profileIndex: ProfileIndex): TravelPhoto | undefined {
  for (const photos of Object.values(profileIndex.photosBySubdivisionCode)) {
    const p = photos.find(x => x.id === photoId)
    if (p) return p
  }
  for (const photos of Object.values(profileIndex.photosByCountryCode)) {
    const p = photos.find(x => x.id === photoId)
    if (p) return p
  }
  return undefined
}

function draftFromPhoto(photo: TravelPhoto, profileIndex: ProfileIndex): PhotoEditDraft {
  const country = profileIndex.countrySummariesByCode[photo.location.countryCode]
  const subdivision = photo.location.subdivisionCode
    ? profileIndex.subdivisionSummariesByCode[photo.location.subdivisionCode]
    : undefined

  return {
    caption: photo.caption,
    takenAt: photo.takenAt ?? '',
    countryName: country?.name ?? photo.location.countryCode,
    subdivisionName: subdivision?.name ?? photo.location.subdivisionCode ?? '',
  }
}

// ─── sub-components ────────────────────────────────────────────────────────────

function SuggestionInput({
  id,
  value,
  onChange,
  suggestions,
  placeholder,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  suggestions: string[]
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  const visible = open && suggestions.length > 0

  function select(s: string) { onChange(s); setHi(-1); setOpen(false) }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!visible) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && hi >= 0) { e.preventDefault(); select(suggestions[hi]) }
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id}
        ref={inputRef}
        type="text"
        className="photo-edit-input"
        value={value}
        onChange={e => { onChange(e.target.value); setHi(-1) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        style={{ width: '100%', boxSizing: 'border-box' as const }}
      />
      {visible && (
        <div
          className="photo-search-suggestions"
          role="listbox"
          style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20, borderRadius: 10, overflow: 'hidden', padding: 4 }}
        >
          {suggestions.map((s, i) => (
            <div
              key={s}
              role="option"
              aria-selected={i === hi}
              onMouseDown={e => { e.preventDefault(); select(s) }}
              onMouseEnter={() => setHi(i)}
              className={`photo-search-suggestion-item${i === hi ? ' highlighted' : ''}`}
              style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 500, transition: 'background 100ms ease' }}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FormField({ id, label, children }: { id?: string; label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          color: 'var(--text-muted)',
          fontSize: 10,
          letterSpacing: '0.07em',
          textTransform: 'uppercase' as const,
          fontWeight: 600,
          fontFamily: 'var(--font-dm-sans), sans-serif',
          marginBottom: 5,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function EditPhotoPanel({
  photo,
  draft,
  onChange,
  onSave,
  profileIndex,
}: {
  photo: TravelPhoto
  draft: PhotoEditDraft
  onChange: (k: keyof PhotoEditDraft, v: string) => void
  onSave: () => void
  onCancel: () => void
  profileIndex: ProfileIndex
}) {
  const countrySuggestions = useMemo(() => {
    const q = draft.countryName.toLowerCase().trim()
    if (!q) return []
    return Object.values(profileIndex.countrySummariesByCode)
      .map(c => c.name)
      .filter(n => n.toLowerCase().includes(q) && n !== draft.countryName)
      .slice(0, 5)
  }, [draft.countryName, profileIndex])

  const regionSuggestions = useMemo(() => {
    const q = draft.subdivisionName.toLowerCase().trim()
    if (!q) return []
    const matchedCountry = Object.values(profileIndex.countrySummariesByCode)
      .find(c => c.name.toLowerCase() === draft.countryName.toLowerCase())
    const codes = matchedCountry
      ? matchedCountry.subdivisionCodes
      : Object.keys(profileIndex.subdivisionSummariesByCode)
    return codes
      .map(code => profileIndex.subdivisionSummariesByCode[code]?.name)
      .filter((n): n is string => !!n && n.toLowerCase().includes(q) && n !== draft.subdivisionName)
      .slice(0, 5)
  }, [draft.subdivisionName, draft.countryName, profileIndex])

  return (
    <div style={{ padding: '12px 16px 40px' }}>
      {/* Photo preview */}
      <div style={{ width: '100%', height: 130, borderRadius: 14, overflow: 'hidden', marginBottom: 20, background: 'rgba(0,0,0,0.24)' }}>
        <img src={photo.url} alt={photo.caption} decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>

      {/* Caption */}
      <FormField id="edit-caption" label="Caption">
        <textarea
          id="edit-caption"
          className="photo-edit-input"
          value={draft.caption}
          onChange={e => onChange('caption', e.target.value)}
          rows={2}
          placeholder="Describe this memory…"
          style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 60 }}
        />
      </FormField>

      {/* Date taken */}
      <FormField id="edit-date" label="Date taken">
        <input
          id="edit-date"
          type="date"
          className="photo-edit-input"
          value={draft.takenAt}
          onChange={e => onChange('takenAt', e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
      </FormField>

      {/* Location */}
      <div className="photo-edit-section">
        <div className="photo-edit-section-label">Location</div>

        <FormField id="edit-country" label="Country">
          <SuggestionInput
            id="edit-country"
            value={draft.countryName}
            onChange={v => onChange('countryName', v)}
            suggestions={countrySuggestions}
            placeholder="e.g. United States"
          />
        </FormField>

        <FormField id="edit-region" label="Region / State">
          <SuggestionInput
            id="edit-region"
            value={draft.subdivisionName}
            onChange={v => onChange('subdivisionName', v)}
            suggestions={regionSuggestions}
            placeholder="e.g. California"
          />
        </FormField>
      </div>

      {/* Save button */}
      <button
        onClick={onSave}
        className="photo-edit-save-btn"
        style={{ width: '100%', height: 44, borderRadius: 12, cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 600, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: 'none' }}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <path d="M1.5 7L5 10.5L11.5 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Save changes
      </button>
    </div>
  )
}

const PhotoRow = memo(function PhotoRow({
  photo,
  countryName,
  subdivisionName,
  onDelete,
  onEdit,
}: {
  photo: TravelPhoto
  countryName: string
  subdivisionName: string
  onDelete?: (id: string) => void
  onEdit?: (id: string) => void
}) {
  return (
    <div
      className="photo-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 0',
        borderBottom: '1px solid var(--divider)',
      }}
    >
      <img
        src={photo.url}
        alt={photo.caption}
        loading="lazy"
        decoding="async"
        style={{
          width: 72,
          height: 52,
          objectFit: 'cover',
          borderRadius: 8,
          flexShrink: 0,
          display: 'block',
          boxShadow: '0 2px 8px rgba(0,0,0,0.22)',
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          display: 'block',
          color: 'var(--text-primary)',
          fontSize: 12,
          fontFamily: 'var(--font-dm-sans), sans-serif',
          fontWeight: 500,
          lineHeight: 1.35,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {photo.caption}
        </span>
        <span style={{
          display: 'block',
          color: 'var(--text-muted)',
          fontSize: 10,
          fontFamily: 'var(--font-dm-sans), sans-serif',
          marginTop: 3,
          letterSpacing: '0.02em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {countryName} · {subdivisionName}
        </span>
      </div>

      {/* Action buttons — visible on hover */}
      <div className="photo-row-actions" style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {onEdit && (
          <button
            onClick={() => onEdit(photo.id)}
            aria-label={`Edit ${photo.caption}`}
            className="photo-row-edit-btn"
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              background: 'transparent',
              border: '1px solid transparent',
              color: 'var(--text-muted)',
              transition: 'all 180ms ease',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(photo.id)}
            aria-label={`Delete ${photo.caption}`}
            className="photo-row-delete-btn"
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              background: 'transparent',
              border: '1px solid transparent',
              color: 'var(--text-muted)',
              transition: 'all 180ms ease',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
})

// ─── main drawer ───────────────────────────────────────────────────────────────

export function PhotoManagementDrawer({
  isOpen,
  onClose,
  profileIndex,
  onImportFiles,
  onDeletePhoto,
  onEditPhoto,
}: Props) {
  const [mounted, setMounted] = useState(isOpen)
  const [visible, setVisible] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null)
  const [draft, setDraft] = useState<PhotoEditDraft>({ caption: '', takenAt: '', countryName: '', subdivisionName: '' })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  // ── mount / unmount ──
  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    } else {
      setVisible(false)
      const timer = setTimeout(() => setMounted(false), EXIT_DURATION + 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // ── reset state when drawer closes ──
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setHighlightedIndex(-1)
      setEditingPhotoId(null)
    }
  }, [isOpen])

  // ── escape key ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (isOpen) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // ── initialize draft when selecting a photo to edit ──
  useEffect(() => {
    if (!editingPhotoId) return
    const photo = findPhoto(editingPhotoId, profileIndex)
    if (photo) setDraft(draftFromPhoto(photo, profileIndex))
  }, [editingPhotoId, profileIndex])

  // ── file import ──
  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (imageFiles.length > 0) onImportFiles?.(imageFiles)
  }

  // ── drag & drop ──
  function handleDragEnter(e: React.DragEvent) { e.preventDefault(); dragCounterRef.current++; setIsDragOver(true) }
  function handleDragLeave(e: React.DragEvent) { e.preventDefault(); if (--dragCounterRef.current === 0) setIsDragOver(false) }
  function handleDragOver(e: React.DragEvent) { e.preventDefault() }
  function handleDrop(e: React.DragEvent) { e.preventDefault(); dragCounterRef.current = 0; setIsDragOver(false); handleFiles(e.dataTransfer.files) }

  // ── search ──
  const q = query.toLowerCase().trim()

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!q) return []
    const results: Suggestion[] = []
    for (const country of Object.values(profileIndex.countrySummariesByCode)) {
      if (country.name.toLowerCase().includes(q))
        results.push({ label: country.name, type: 'country', countryCode: country.countryCode })
      for (const subCode of country.subdivisionCodes) {
        const sub = profileIndex.subdivisionSummariesByCode[subCode]
        if (sub && sub.name.toLowerCase().includes(q))
          results.push({ label: sub.name, type: 'subdivision', countryCode: country.countryCode, subdivisionCode: subCode })
      }
    }
    return results.slice(0, MAX_SUGGESTIONS)
  }, [q, profileIndex])

  const filteredEntries = useMemo<FilteredEntry[]>(() => {
    const all = Object.values(profileIndex.countrySummariesByCode)
    if (!q) return all.map(c => ({ country: c, subdivisionCodes: c.subdivisionCodes }))
    const result: FilteredEntry[] = []
    for (const country of all) {
      const countryMatches = country.name.toLowerCase().includes(q)
      const matchingSubs = country.subdivisionCodes.filter(sc => {
        const sub = profileIndex.subdivisionSummariesByCode[sc]
        return sub && sub.name.toLowerCase().includes(q)
      })
      if (countryMatches) result.push({ country, subdivisionCodes: country.subdivisionCodes })
      else if (matchingSubs.length > 0) result.push({ country, subdivisionCodes: matchingSubs })
    }
    return result
  }, [q, profileIndex])

  function selectSuggestion(s: Suggestion) { setQuery(s.label); setHighlightedIndex(-1); searchRef.current?.blur() }
  function clearQuery() { setQuery(''); setHighlightedIndex(-1); searchRef.current?.focus() }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!suggestions.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && highlightedIndex >= 0) { e.preventDefault(); selectSuggestion(suggestions[highlightedIndex]) }
  }

  // ── edit ──
  function handleDraftChange(k: keyof PhotoEditDraft, v: string) {
    setDraft(prev => ({ ...prev, [k]: v }))
  }

  function handleSave() {
    if (!editingPhotoId) return
    onEditPhoto?.(editingPhotoId, draft)
    setEditingPhotoId(null)
  }

  // ── derived ──
  const isEmpty = profileIndex.stats.photoCount === 0
  const isFiltered = q.length > 0
  const hasResults = filteredEntries.length > 0
  const editingPhoto = editingPhotoId ? findPhoto(editingPhotoId, profileIndex) : null

  const filteredPhotoCount = useMemo(() => {
    if (!isFiltered) return profileIndex.stats.photoCount
    return filteredEntries.reduce((s, { subdivisionCodes }) =>
      s + subdivisionCodes.reduce((ss, code) => ss + (profileIndex.photosBySubdivisionCode[code]?.length ?? 0), 0), 0)
  }, [filteredEntries, isFiltered, profileIndex])

  const enterTr = `transform ${ENTER_DURATION}ms cubic-bezier(0.16,1,0.3,1), opacity ${ENTER_DURATION}ms ease-out`
  const exitTr = `transform ${EXIT_DURATION}ms cubic-bezier(0.4,0,1,1), opacity ${EXIT_DURATION}ms ease-in`
  const panelTr = `transform ${PANEL_SLIDE_MS}ms cubic-bezier(0.16,1,0.3,1)`

  if (!mounted) return null

  return (
    <div
      className="photo-drawer"
      role="dialog"
      aria-label={editingPhotoId ? 'Edit photo' : 'Photo manager'}
      aria-modal="false"
      style={{
        position: 'fixed',
        right: 0, top: 0, bottom: 0,
        width: DRAWER_WIDTH,
        zIndex: 45,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        opacity: visible ? 1 : 0,
        transition: visible ? enterTr : exitTr,
      }}
    >
      {/* ── Header (dynamic) ── */}
      <div className="photo-drawer-header" style={{ display: 'flex', alignItems: 'center', padding: '14px 16px 12px', flexShrink: 0, gap: 8 }}>
        {editingPhotoId ? (
          <>
            <button
              onClick={() => setEditingPhotoId(null)}
              aria-label="Back to photo list"
              className="gallery-nav-btn"
              style={{ height: 32, borderRadius: 999, display: 'flex', alignItems: 'center', gap: 5, padding: '0 10px', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-dm-sans), sans-serif', color: 'var(--text-secondary)', flexShrink: 0 }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </button>
            <span style={{ flex: 1, textAlign: 'center', color: 'var(--text-primary)', fontSize: 15, fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 600 }}>
              Edit Photo
            </span>
            <button
              onClick={handleSave}
              aria-label="Save photo changes"
              className="photo-edit-header-save"
              style={{ height: 32, borderRadius: 999, display: 'flex', alignItems: 'center', padding: '0 12px', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 600, flexShrink: 0, border: 'none' }}
            >
              Save
            </button>
          </>
        ) : (
          <>
            <span style={{ flex: 1, color: 'var(--text-primary)', fontSize: 22, fontFamily: 'var(--font-caveat), cursive', fontWeight: 600, lineHeight: 1.1 }}>
              My Photos
            </span>
            <button onClick={onClose} aria-label="Close photo manager" className="gallery-nav-btn" style={{ width: 32, height: 32, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M1 1l9 9M10 1L1 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* ── Two-panel sliding content area ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* Panel A — list */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transform: editingPhotoId ? 'translateX(-30%)' : 'translateX(0)',
          opacity: editingPhotoId ? 0 : 1,
          transition: `${panelTr}, opacity ${PANEL_SLIDE_MS}ms ease`,
          pointerEvents: editingPhotoId ? 'none' : 'auto',
        }}>
          {/* Import zone */}
          <div style={{ padding: '0 14px 14px', flexShrink: 0 }} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}>
            <div
              role="button" tabIndex={0}
              aria-label="Import photos — drag and drop or click to browse"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
              className={`photo-import-zone${isDragOver ? ' drag-over' : ''}`}
              style={{ borderRadius: 14, padding: '16px 16px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'background 180ms ease, border-color 180ms ease' }}
            >
              <div style={{ opacity: isDragOver ? 1 : 0.65, transition: 'opacity 180ms ease, transform 180ms ease', transform: isDragOver ? 'scale(1.1) translateY(-2px)' : 'scale(1)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                </svg>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 600, lineHeight: 1.3 }}>
                  {isDragOver ? 'Drop to import' : 'Add photos'}
                </span>
                <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-dm-sans), sans-serif', marginTop: 3, lineHeight: 1.5 }}>
                  Drag & drop or click to browse<br />
                  <span style={{ color: 'var(--text-muted)' }}>Location auto-detected from EXIF</span>
                </span>
              </div>
            </div>
            <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} aria-hidden="true" onChange={e => { handleFiles(e.target.files); e.target.value = '' }} />
          </div>

          {/* Search box */}
          {!isEmpty && (
            <div style={{ padding: '0 14px 10px', flexShrink: 0, position: 'relative' }}>
              <label htmlFor="photo-drawer-search" style={{ display: 'block', color: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-dm-sans), sans-serif', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 5, paddingLeft: 2 }}>
                Filter
              </label>
              <div className="photo-search-box" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', borderRadius: 12, height: 44 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  id="photo-drawer-search" ref={searchRef}
                  type="search" role="combobox"
                  aria-expanded={suggestions.length > 0} aria-haspopup="listbox"
                  aria-autocomplete="list" aria-controls="photo-drawer-suggestions"
                  aria-activedescendant={highlightedIndex >= 0 ? `suggestion-${highlightedIndex}` : undefined}
                  placeholder="Country or region…"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setHighlightedIndex(-1) }}
                  onKeyDown={handleSearchKeyDown}
                  className="photo-search-input"
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-dm-sans), sans-serif', caretColor: 'var(--accent)', minWidth: 0 }}
                  autoComplete="off" autoCorrect="off" spellCheck={false}
                />
                {query && (
                  <button onClick={clearQuery} aria-label="Clear search" style={{ width: 20, height: 20, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.14)', border: 'none', color: 'var(--text-muted)', flexShrink: 0 }}>
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  </button>
                )}
              </div>
              {suggestions.length > 0 && (
                <div id="photo-drawer-suggestions" role="listbox" aria-label="Search suggestions" className="photo-search-suggestions" style={{ position: 'absolute', top: 'calc(100% - 4px)', left: 14, right: 14, zIndex: 10, borderRadius: 12, overflow: 'hidden', padding: 4 }}>
                  {suggestions.map((s, i) => (
                    <div
                      key={`${s.countryCode}-${s.subdivisionCode ?? 'c'}-${i}`}
                      id={`suggestion-${i}`} role="option" aria-selected={i === highlightedIndex}
                      onMouseDown={e => { e.preventDefault(); selectSuggestion(s) }}
                      onMouseEnter={() => setHighlightedIndex(i)}
                      className={`photo-search-suggestion-item${i === highlightedIndex ? ' highlighted' : ''}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', transition: 'background 100ms ease' }}
                    >
                      <span style={{ fontSize: 9, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: 'var(--font-dm-sans), sans-serif', color: s.type === 'country' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 700, flexShrink: 0, width: 48 }}>
                        {s.type === 'country' ? 'Country' : 'Region'}
                      </span>
                      <span style={{ color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stats bar */}
          {!isEmpty && (
            <div style={{ padding: '0 16px 10px', flexShrink: 0 }}>
              <div className="photo-drawer-stats" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5, padding: '7px 10px', borderRadius: 8 }}>
                {isFiltered ? (
                  <>
                    <span style={{ color: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 600 }}>{filteredEntries.length}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-dm-sans), sans-serif' }}>{filteredEntries.length === 1 ? 'match' : 'matches'}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>·</span>
                    <span style={{ color: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 600 }}>{filteredPhotoCount}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-dm-sans), sans-serif' }}>{filteredPhotoCount === 1 ? 'photo' : 'photos'}</span>
                  </>
                ) : (
                  <>
                    <span style={{ color: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 600 }}>{profileIndex.stats.countryCount}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-dm-sans), sans-serif' }}>{profileIndex.stats.countryCount === 1 ? 'country' : 'countries'}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>·</span>
                    <span style={{ color: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 600 }}>{profileIndex.stats.placeCount}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-dm-sans), sans-serif' }}>{profileIndex.stats.placeCount === 1 ? 'place' : 'places'}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>·</span>
                    <span style={{ color: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 600 }}>{profileIndex.stats.photoCount}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-dm-sans), sans-serif' }}>{profileIndex.stats.photoCount === 1 ? 'photo' : 'photos'}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Photo list */}
          <div className="photo-drawer-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '4px 16px 32px' }}>
            {isEmpty ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: 32, textAlign: 'center' }}>
                <div style={{ opacity: 0.28 }}>
                  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="0.9">
                    <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: 16, fontFamily: 'var(--font-caveat), cursive', fontWeight: 600, lineHeight: 1.2 }}>No memories yet</p>
                  <p style={{ margin: '7px 0 0', color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-dm-sans), sans-serif', lineHeight: 1.6 }}>
                    Import your travel photos above<br />to light up the places you've been.
                  </p>
                </div>
              </div>
            ) : !hasResults ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 28, textAlign: 'center' }}>
                <div style={{ opacity: 0.3 }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 600 }}>No photos match</p>
                  <p style={{ margin: '5px 0 0', color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-dm-sans), sans-serif', lineHeight: 1.55 }}>"{query}"<br />Try a different country or region.</p>
                </div>
                <button onClick={clearQuery} style={{ marginTop: 4, background: 'none', border: '1px solid var(--border)', borderRadius: 999, color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-dm-sans), sans-serif', padding: '5px 14px', cursor: 'pointer' }}>
                  Clear filter
                </button>
              </div>
            ) : (
              <div>
                {filteredEntries.map(({ country, subdivisionCodes }) => (
                  <div key={country.countryCode} className="photo-list-country-block" style={{ marginBottom: 22 }}>
                    <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 7, marginBottom: 10, borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 700, letterSpacing: '0.01em' }}>{country.name}</span>
                      <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-dm-sans), sans-serif' }}>{country.photoCount} {country.photoCount === 1 ? 'photo' : 'photos'}</span>
                    </div>
                    {subdivisionCodes.map(subCode => {
                      const sub = profileIndex.subdivisionSummariesByCode[subCode]
                      if (!sub) return null
                      const photos = profileIndex.photosBySubdivisionCode[subCode] ?? []
                      return (
                        <div key={subCode} style={{ marginBottom: 14 }}>
                          <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 10, fontFamily: 'var(--font-dm-sans), sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 6 }}>
                            {sub.name}
                          </span>
                          {photos.map(photo => (
                            <PhotoRow
                              key={photo.id}
                              photo={photo}
                              countryName={country.name}
                              subdivisionName={sub.name}
                              onDelete={onDeletePhoto}
                              onEdit={setEditingPhotoId}
                            />
                          ))}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel B — edit form */}
        <div style={{
          position: 'absolute',
          inset: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          transform: editingPhotoId ? 'translateX(0)' : 'translateX(100%)',
          opacity: editingPhotoId ? 1 : 0,
          transition: `${panelTr}, opacity ${PANEL_SLIDE_MS}ms ease`,
          pointerEvents: editingPhotoId ? 'auto' : 'none',
        }}>
          {editingPhoto && (
            <EditPhotoPanel
              photo={editingPhoto}
              draft={draft}
              onChange={handleDraftChange}
              onSave={handleSave}
              onCancel={() => setEditingPhotoId(null)}
              profileIndex={profileIndex}
            />
          )}
        </div>
      </div>
    </div>
  )
}
