-- Base schema for a new Supabase project.
create table if not exists public.graduation_rsvps (
  id bigint generated always as identity primary key,
  guest_name text not null,
  guest_id text,
  status text not null check (status in ('attending', 'not_attending', 'maybe')),
  phone text,
  note text,
  created_at timestamptz not null default now()
);

alter table public.graduation_rsvps enable row level security;

drop policy if exists "Anyone can submit graduation RSVP" on public.graduation_rsvps;
create policy "Anyone can submit graduation RSVP"
on public.graduation_rsvps
for insert
to anon
with check (
  status in ('attending', 'not_attending', 'maybe')
  and length(guest_name) between 1 and 120
);

create table if not exists public.graduation_guests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  normalized_name text not null unique,
  created_at timestamptz not null default now(),
  constraint graduation_guests_full_name_not_blank check (length(trim(full_name)) > 0),
  constraint graduation_guests_normalized_name_not_blank check (length(trim(normalized_name)) > 0)
);

create table if not exists public.graduation_attendance (
  guest_id uuid primary key references public.graduation_guests(id) on delete cascade,
  status text not null check (status in ('pending', 'attending', 'not_attending', 'maybe')),
  confirmed_at timestamptz,
  guest_message text check (guest_message is null or length(guest_message) <= 500),
  updated_at timestamptz not null default now(),
  constraint graduation_attendance_confirmation_time check (status <> 'attending' or confirmed_at is not null)
);

insert into public.graduation_guests (full_name, normalized_name) values
  ('Mugisa Lionel Casey', 'mugisa lionel casey'),
  ('Kissa Lucky Jordan', 'kissa lucky jordan'),
  ('Emilyn Afoyocan', 'emilyn afoyocan'),
  ('Tingo Alfred', 'tingo alfred'),
  ('Jolly Okumu', 'jolly okumu'),
  ('Aber Nelly', 'aber nelly'),
  ('Aluku Lucky Keila', 'aluku lucky keila'),
  ('Thiwe Patricia', 'thiwe patricia'),
  ('Walter Pimego', 'walter pimego'),
  ('Piracel Peace Pimego', 'piracel peace pimego'),
  ('Pimego Edward', 'pimego edward')
on conflict (normalized_name) do update set full_name = excluded.full_name;

insert into public.graduation_attendance (guest_id, status)
select id, 'pending'
from public.graduation_guests
on conflict (guest_id) do nothing;

alter table public.graduation_guests enable row level security;
alter table public.graduation_attendance enable row level security;
revoke all on public.graduation_guests, public.graduation_attendance from anon, authenticated;
grant all on public.graduation_guests, public.graduation_attendance to service_role;
