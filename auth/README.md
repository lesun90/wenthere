# Auth

## Purpose

Supabase-backed authentication layer for Wenthere. Supports email and Google OAuth sign-in via the Supabase Auth client. Determines whether the current viewer is the globe owner (authenticated, viewing their own `/dashboard`) or a visitor (unauthenticated, viewing `/[username]`). Exposes session state to the globe and upload components so they can conditionally show or hide the upload button and management controls.

## Interface

- Session context: provides `user` (null if unauthenticated) and `isOwner(username)` helper.
- Routes: `/login` (sign in), `/register` (sign up + choose username).
- Protects `/dashboard` and `/api/upload`, `/api/geocode` routes — unauthenticated requests are rejected.

## Dependencies

- Supabase Auth (email + Google OAuth)
- Supabase Postgres `users` table (username lookup)
- Next.js middleware (route protection)

## Status

- [ ] Not started
