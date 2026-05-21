# Implementation Plan — Phase 1: Full Subdivision Dataset Support

**Spec:** [2026-05-21-add-photo-unknown-region-design.md](2026-05-21-add-photo-unknown-region-design.md)
**Date:** 2026-05-21

---

## Step 1 — Write `scripts/split-geo.js`

Create `scripts/split-geo.js`. No dependencies beyond Node built-ins and `fs`.

```
node scripts/split-geo.js <path-to-ne_50m_admin_1_states_provinces.geojson>
```

Logic:
1. Read and parse the input GeoJSON file
2. Create `public/geo/subdivisions/` directory if it doesn't exist
3. For each feature, keep only these properties: `adm1_code`, `name`, `name_alt`, `name_en`, `adm0_a3`
4. Write `public/geo/subdivisions/<adm1_code>.geojson` for each subdivision

Add to `package.json` scripts:
```json
"split-geo": "node scripts/split-geo.js"
```

**Done when:** running the script against the full NE 50m file produces per-subdivision files in `public/geo/subdivisions/`.

---

## Step 2 — Verify Huế is in the dataset

After running the script:

```bash
grep -l "Thừa Thiên-Huế\\|Thua Thien-Hue" public/geo/subdivisions/VNM-*.geojson
```

Confirm a feature matching "Thừa Thiên-Huế" (or "Thua Thien-Hue") appears with its `adm1_code`.

**Done when:** Huế's `adm1_code` is known and recorded. If absent, document it and defer to Open Question 2 in the spec.

---

## Step 3 — Update `SubdivisionLayer.tsx`

File: `components/globe/SubdivisionLayer.tsx`

Replace the single monolithic fetch (lines 30–35) with a per-subdivision parallel fetch.

**Before:**
```ts
useEffect(() => {
  fetch('/geo/states-provinces-50m.json')
    .then(r => r.json())
    .then(setData)
    .catch(() => {})
}, [])
```

**After:**
```ts
const subdivisionCodes = useMemo(
  () => profile.countries.flatMap(c => c.subdivisions.map(s => s.subdivisionCode)),
  [profile]
)

useEffect(() => {
  if (subdivisionCodes.length === 0) return
  Promise.all(
    subdivisionCodes.map(code =>
      fetch(`/geo/subdivisions/${code}.geojson`)
        .then(r => r.json() as Promise<Feature>)
        .catch(() => null)
    )
  ).then(results => {
    const features = results.filter((f): f is Feature => f !== null)
    setData({ type: 'FeatureCollection', features })
  })
}, [subdivisionCodes])
```

Everything downstream (`visitedFeatures` useMemo, geometry registration, rendering) is unchanged — same `data` shape.

**Done when:** the globe loads correctly using per-subdivision files, existing subdivisions (California, Guangdong, Đà Nẵng etc.) render as before.

---

## Step 4 — Update `usePredictivePreload.ts`

File: `components/globe/usePredictivePreload.ts`

Add `preloadSubdivisionFile(subdivisionCode: string)`:

```ts
const preloadedSubdivisionFiles = new Set<string>()

export function preloadSubdivisionFile(subdivisionCode: string): void {
  if (preloadedSubdivisionFiles.has(subdivisionCode)) return
  preloadedSubdivisionFiles.add(subdivisionCode)
  fetch(`/geo/subdivisions/${subdivisionCode}.geojson`).catch(() => {})
}
```

Call it for each subdivision in the hovered country from `usePredictivePreload`, alongside the existing texture preload. Check `GlobeScene.tsx` for where `onCountryHover` is wired to confirm the right call site.

**Done when:** hovering a country triggers network requests for its subdivision GeoJSON files (visible in DevTools); the files are in browser cache before the user taps.

---

## Step 5 — Add Huế to `data/seed.ts` and verify rendering

Using the `adm1_code` found in Step 2, add a `SubdivisionMemory` entry for Huế to Vietnam in `data/seed.ts`:

```ts
{
  subdivisionCode: '<adm1_code-from-step-2>',
  name: 'Thừa Thiên-Huế',
  heroPic: '/demo/30.jpg',   // reuse any existing demo photo
  photos: [
    { url: '/demo/30.jpg', caption: 'Hue citadel' },
  ],
},
```

Run `docker compose up` and confirm Huế renders as a lit subdivision on the Vietnam globe.

**Done when:** Huế shape is visible and tappable on the globe.

---

## Step 6 — Keep legacy stress data path

Once Step 5 is confirmed:
1. Keep `public/geo/states-provinces-50m.json` while `data/stressProfile.ts` imports it for generating the stress profile
2. Search the interactive globe path for remaining runtime fetches of that path and remove them

```bash
grep -r "states-provinces-50m" /home/lesun90/workspace/wenthere/components /home/lesun90/workspace/wenthere/app --include="*.ts" --include="*.tsx"
```

**Done when:** no runtime globe fetches remain and the app still works correctly with split subdivision files.

---

## Step 7 — Smoke test

Verify the full scenario end-to-end:

- [ ] Globe loads — all existing subdivisions (USA, CHN, VNM) render correctly
- [ ] Huế renders as a lit subdivision in Vietnam
- [ ] Hovering Vietnam preloads its `VNM-*.geojson` subdivision files (DevTools Network tab — second visit is cached)
- [ ] Stresstest page (`/stresstest`) still works (it injects its own profile — no VNM file needed unless stressProfile includes VNM)
- [ ] No console errors

---

## Sequence

```
Step 1  →  Step 2  →  Step 3  →  Step 4  →  Step 5  →  Step 6  →  Step 7
(script)   (verify)   (SubDiv)   (preload)  (seed)     (cleanup)  (smoke)
```

Steps 3 and 4 are independent and can be done in parallel.
