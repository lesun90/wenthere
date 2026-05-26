-- Multi-user Beenthere beta schema.
-- Access model: admin-created beta users only, owner-isolated edits, live public read-only profiles.

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  display_name text not null,
  public_visible boolean not null default false,
  suspended_at timestamptz null,
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_slug_key on public.profiles (slug);
create index profiles_owner_id_idx on public.profiles (owner_id);
create index profiles_public_visibility_idx on public.profiles (public_visible, suspended_at, deleted_at);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  original_r2_key text not null unique,
  display_r2_key text null unique,
  thumb_r2_key text null unique,
  caption text not null,
  taken_at date null,
  country_code text not null,
  subdivision_code text null,
  mime_type text not null,
  byte_size int not null check (byte_size >= 0),
  width int null check (width is null or width > 0),
  height int null check (height is null or height > 0),
  status text not null default 'uploading' check (status in ('uploading', 'active', 'failed', 'deleted')),
  upload_completed_at timestamptz null,
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index photos_profile_status_deleted_idx on public.photos (profile_id, status, deleted_at);
create index photos_profile_country_idx on public.photos (profile_id, country_code);
create index photos_profile_subdivision_idx on public.photos (profile_id, subdivision_code);
create index photos_status_deleted_idx on public.photos (status, deleted_at);

create table public.profile_presentation (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  country_heroes jsonb not null default '{}'::jsonb,
  subdivision_heroes jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now()
);

create table public.beta_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where admin_users.user_id = is_admin.user_id
  );
$$;

create or replace function public.is_beta_user(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.beta_users
    where beta_users.user_id = is_beta_user.user_id
  );
$$;

alter table public.profiles enable row level security;
alter table public.photos enable row level security;
alter table public.profile_presentation enable row level security;
alter table public.admin_users enable row level security;
alter table public.beta_users enable row level security;

create policy "owners can read own profiles"
on public.profiles for select
using (owner_id = auth.uid());

create policy "public can read visible profiles"
on public.profiles for select
using (
  public_visible = true
  and suspended_at is null
  and deleted_at is null
);

create policy "beta owners can create own profiles"
on public.profiles for insert
with check (owner_id = auth.uid() and public.is_beta_user(auth.uid()));

create policy "owners can update own profiles"
on public.profiles for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "admins can read profiles"
on public.profiles for select
using (public.is_admin(auth.uid()));

create policy "admins can moderate profiles"
on public.profiles for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "owners can read own photos"
on public.photos for select
using (
  exists (
    select 1 from public.profiles
    where profiles.id = photos.profile_id
      and profiles.owner_id = auth.uid()
  )
);

create policy "public can read visible active photos"
on public.photos for select
using (
  status = 'active'
  and deleted_at is null
  and exists (
    select 1 from public.profiles
    where profiles.id = photos.profile_id
      and profiles.public_visible = true
      and profiles.suspended_at is null
      and profiles.deleted_at is null
  )
);

create policy "owners can insert own photos"
on public.photos for insert
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = photos.profile_id
      and profiles.owner_id = auth.uid()
  )
);

create policy "owners can update own photos"
on public.photos for update
using (
  exists (
    select 1 from public.profiles
    where profiles.id = photos.profile_id
      and profiles.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = photos.profile_id
      and profiles.owner_id = auth.uid()
  )
);

create policy "admins can read photos"
on public.photos for select
using (public.is_admin(auth.uid()));

create policy "owners can read own presentation"
on public.profile_presentation for select
using (
  exists (
    select 1 from public.profiles
    where profiles.id = profile_presentation.profile_id
      and profiles.owner_id = auth.uid()
  )
);

create policy "public can read visible presentation"
on public.profile_presentation for select
using (
  exists (
    select 1 from public.profiles
    where profiles.id = profile_presentation.profile_id
      and profiles.public_visible = true
      and profiles.suspended_at is null
      and profiles.deleted_at is null
  )
);

create policy "owners can write own presentation"
on public.profile_presentation for all
using (
  exists (
    select 1 from public.profiles
    where profiles.id = profile_presentation.profile_id
      and profiles.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = profile_presentation.profile_id
      and profiles.owner_id = auth.uid()
  )
);

create policy "admins can read admin users"
on public.admin_users for select
using (public.is_admin(auth.uid()));

create policy "admins can manage beta users"
on public.beta_users for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
