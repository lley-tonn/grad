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

-- Public guests may submit RSVP records. Do not enable public SELECT.
create policy "Anyone can submit graduation RSVP"
on public.graduation_rsvps
for insert
to anon
with check (
  status in ('attending', 'not_attending', 'maybe')
  and length(guest_name) between 1 and 120
);
