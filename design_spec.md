# Beenthere Product Design Spec

**Date:** 2026-05-19
**Status:** Approved for implementation planning

---

## Overview

Beenthere is a public travel-photo globe for everyday travelers who want to show where they have been. The product turns a traveler's memories into an interactive 3D world map: visited countries are covered with meaningful hero photos instead of flat colors, and viewers can zoom in to see which states or provinces contain photos.

The first version is a seeded demo profile, not a full multi-user platform. It should feel like a future shareable `/username` profile, but it does not need accounts, uploads, private sharing, comments, social graphs, or monetization.

## Target User

The primary user is a regular traveler who wants a beautiful way to show friends, family, or followers where they went. They are not trying to manage a professional photography archive. They want the experience to feel personal, visual, and easy to share.

## First-Version Goal

Build a polished demo showcase that proves the core product promise:

- A viewer lands directly on a public travel profile.
- The main experience is an interactive globe.
- Visited countries are represented with travel photos.
- Zooming into supported countries reveals state/province-level photo coverage.
- Selecting a place opens the photos and basic context for that place.

The demo should use seeded sample content from the United States, China, and Vietnam. The sample data should include multiple states or provinces in each country so the layered country-to-subdivision behavior is visible during testing.

## Core Experience

The profile opens on a cleanly framed 3D globe with visible photo-covered countries. The viewer can rotate and zoom naturally. At world scale, countries are the main visual unit. When a country has visited memories, its surface uses a hero travel photo treatment.

As the viewer zooms closer, supported countries resolve into state or province detail. The viewer can then see exactly which subregions have photos. For example, the United States can reveal visited states, China can reveal visited provinces, and Vietnam can reveal visited provinces or province-level municipalities. When the viewer zooms back out, subdivision detail collapses into the country-level photo treatment.

Hovering or tapping a photo-covered place shows its name and a small preview. Clicking or tapping a place focuses the globe on it and opens a lightweight gallery panel with photos, captions, and location names. The gallery supports the travel story, but the globe remains the primary screen.

## Demo Data

The first version uses seeded data that models the future product shape:

- traveler profile
- memories or trips
- photos
- country codes
- optional state/province codes
- optional coordinates
- captions
- hero-photo selection

Location resolution is explicit in the seed data. The prototype should not depend on reading EXIF metadata or geocoding uploaded images. Future versions can add photo-first upload flows where location metadata is extracted when available and users can fix or choose the location manually.

Sample photos should be gathered or generated for test use, preferably representing varied places in the United States, China, and Vietnam. If public sample images are used, the project should keep source and license attribution with the data. Owned, generated, or otherwise license-safe demo assets are preferred.

## Geography Model

The globe supports two geographic levels:

1. Country
2. State/province

Countries are available at the default world view. State/province geography activates only for supported countries and only when the viewer is close enough for the added detail to be useful. The first supported subdivision countries are the United States, China, and Vietnam.

If subdivision data is missing for a country, or if a visited country has country-level memories but no mapped subregion memories, the country-level photo remains visible. The globe should never zoom into an empty-looking country just because subdivision data is unavailable or incomplete.

## Architecture

The first version should stay deliberately small:

- a Next.js public profile route
- a client-side globe scene
- static GeoJSON assets
- seeded profile and photo data
- a gallery overlay for selected places

The globe renderer owns camera state, zoom thresholds, geographic feature visibility, and selection behavior. A separate data layer maps memories to country and subdivision identifiers, then derives which features are visited and which hero photo belongs to each visible geographic unit.

Seeded memories should not be hardcoded inside the globe component. Product data, geography data, and rendering behavior should remain separate so the prototype can later accept real uploads, multiple users, or server-loaded profile data without rewriting the interaction model.

## Visual Behavior

Beenthere's visual identity comes from photo-covered geography. The country-level view should create the immediate "places I went" effect. Subdivision views should feel like the same idea becoming more precise, not a separate mode.

The design should prioritize:

- strong photo presence on visited places
- readable country and subdivision boundaries
- smooth transition between country and state/province detail
- clear selected and hovered states
- no empty gaps when data is missing
- a globe-first layout without a marketing landing page

## Error Handling And Fallbacks

If a photo fails to load, the place still renders as visited with a neutral fallback color or placeholder texture. If subdivision GeoJSON fails or is missing, the globe keeps the country-level photo visible. If a memory has incomplete location data, it can appear in the gallery but should not be mapped until it has at least a country.

If a device struggles with photo rendering, the fallback visual can use flat thumbnail cards while keeping the same seeded data model. The product behavior should remain understandable even when the full visual treatment is degraded.

## Testing Expectations

Testing should prove the product behavior rather than only checking component existence:

- the demo profile loads at the public profile route
- visited countries render with photo treatment
- zooming into supported countries reveals visited states/provinces
- unsupported or missing subdivision data falls back to country-level display
- selecting a place opens the expected photo content
- seeded US, China, and Vietnam memories are represented at both country and subdivision levels

## Implementation Milestones

### Milestone 1: Scaffold And Environment

Set up the project foundation so every future milestone can run consistently. This includes creating the Next.js app structure, installing core packages, defining npm scripts, adding Docker support, and preferring Docker Compose for local development. Success means a developer can clone the repo, run one documented Docker Compose command, and open the app locally.

Deliverables:

- Next.js app scaffold
- package setup and scripts
- Dockerfile
- `docker-compose.yml`
- environment variable template if needed
- basic `/username` or demo profile route
- README run instructions

### Milestone 2: Globe UI/UX

Build the core Beenthere visual experience. The screen should open directly into the 3D globe, render seeded visited countries, support rotate and zoom interactions, and reveal subdivision detail when zooming into supported countries. Photo display begins here as the visual treatment for visited places. The base globe uses solid colors (no texture): ocean in `#C0C0C0`, land/visited areas in lighter palette shades.

Deliverables:

- client-side 3D globe scene
- seeded travel data connected to geography identifiers
- country-level visited photo display
- zoom in and zoom out behavior
- supported subdivision layer for the United States, China, and Vietnam
- hover or tap preview behavior
- fallback display when photos or subdivision data are missing

### Milestone 3: Gallery

Add the lightweight photo gallery that appears when a viewer selects a visited country, state, or province. The gallery should show relevant photos, captions, and location names while keeping the globe as the primary experience.

Deliverables:

- selected-place state
- gallery overlay or side panel
- photo list for selected geography
- captions and location labels
- close or back behavior
- responsive behavior for desktop and mobile

### Milestone 4: Testing And Hardening

Add tests around the core product behavior and stabilize the demo. This milestone should prove the public profile loads, seeded data renders, zoom behavior reveals subdivisions, selection opens the right gallery content, and fallback states remain understandable.

Deliverables:

- unit tests for data mapping
- component or integration tests for profile and gallery behavior
- end-to-end tests for core globe flows where feasible
- Docker-based verification command
- fallback and error-state checks
- final polish pass for responsiveness and loading states

### Milestone 5: Add User

Move from a single seeded demo toward a real profile model. This does not need to become a full social platform, but it should introduce a user and profile concept cleanly enough that future upload, account, and public sharing work can build on it.

Deliverables:

- user and profile data model
- route support for profile-specific pages
- seeded multiple-user data or one real user profile shape
- separation between user, memories, photos, and geography data
- basic user and profile display metadata
- documented path toward real auth and persistence

## Out Of Scope For First Version

- real user accounts
- photo upload UI
- EXIF metadata extraction
- reverse geocoding
- private or unlisted sharing
- comments, likes, follows, or social feeds
- payment or subscription flows
- exhaustive global subdivision coverage

## Future Product Path

After the demo proves the showcase experience, Beenthere can grow into a real multi-user product. The likely next steps are photo-first uploading, metadata-assisted location selection, public username profiles, profile editing, persistent storage, and broader subdivision coverage. The demo data model should be close enough to that future shape that seeded memories can later be replaced by real user memories.
