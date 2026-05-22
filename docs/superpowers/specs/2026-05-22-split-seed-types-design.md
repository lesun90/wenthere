# Design: Split `data/seed.ts` into types and demo profile

**Date:** 2026-05-22
**Status:** Approved

## Problem

`data/seed.ts` conflates two unrelated concerns:
1. Core domain type definitions (`TravelPhoto`, `TravelerProfile`, `ProfileIndex`, etc.)
2. A hardcoded demo dataset (`travelerProfile`)

10 of 12 importers only need types. Reaching into `data/` for pure type definitions is a leaky abstraction — the types belong in the library layer, not the data layer.

## Solution

Split into two files:

### `lib/types.ts` (new)
All interface and type definitions currently in `data/seed.ts`:
- `PhotoFrameTransform`
- `PhotoLocation`
- `TravelPhoto`
- `PlaceHero`
- `ProfilePresentation`
- `TravelerProfile`
- `CountrySummary`
- `SubdivisionSummary`
- `ProfileIndex`

### `data/demoProfile.ts` (replaces `data/seed.ts`)
Only the demo dataset:
- `photo()` helper function
- `travelerProfile` export

Imports types from `lib/types.ts`.

## Import updates

| File | Change |
|------|--------|
| `lib/geodata.ts` | `from '../data/seed'` → `from './types'` |
| `data/roamerProfile.ts` | `from './seed'` → `from '../lib/types'` |
| `components/globe/GlobeScene.tsx` | types from `lib/types`, `travelerProfile` from `data/demoProfile` |
| `components/IdentityStrip.tsx` | types from `lib/types`, `travelerProfile` from `data/demoProfile` |
| `app/demo/page.tsx` | `from '@/data/seed'` → `from '@/data/demoProfile'` |
| All other type-only importers (7 files) | `from '../../data/seed'` → `from '../../lib/types'` |

## Out of scope
- No behavior changes
- No renames of exported symbols
- `data/seed.ts` is deleted after all imports are migrated
