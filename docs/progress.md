# Progress

## Milestones

- [ ] Globe loads in under 2 seconds for a user with 20 visited countries
- [ ] Upload flow (EXIF parse + geocode + thumbnail) completes in under 5 seconds per photo
- [ ] Shareable link (`wenthere.app/[username]`) works without login on mobile and desktop
- [ ] Hero thumbnail swap takes one click and reflects on the globe immediately

## Log

| Date | Update |
|------|--------|
| 2026-05-18 | Project scaffold created |
| 2026-05-18 | Core implementation complete: globe renderer (country + region zoom levels, hero thumbnail textures, badge icons, drag-forwarding), upload pipeline (EXIF GPS, Sharp thumbnails, S3, Postgres), lightbox (filmstrip, swipe/arrow nav), login/logout, middleware auth, GlobePinPicker for manual location, Docker Compose dev + prod setup |
