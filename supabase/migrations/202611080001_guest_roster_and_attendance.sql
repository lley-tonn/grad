-- Add a canonical invited guest roster and one current RSVP per invited guest.
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
  status text not null check (status in ('attending', 'not_attending', 'maybe')),
  confirmed_at timestamptz,
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

-- Preserve prior RSVPs that match a guest in the new canonical roster.
do $$
begin
  if to_regclass('public.graduation_rsvps') is not null then
    execute $migration$
      insert into public.graduation_attendance (guest_id, status, confirmed_at, updated_at)
      select distinct on (g.id)
        g.id,
        r.status,
        case when r.status = 'attending' then r.created_at else null end,
        coalesce(r.created_at, now())
      from public.graduation_rsvps r
      join public.graduation_guests g
        on g.normalized_name = trim(regexp_replace(lower(r.guest_name), '[^a-z0-9]+', ' ', 'g'))
      where r.status in ('attending', 'not_attending', 'maybe')
      order by g.id, r.created_at desc nulls last, r.id desc
      on conflict (guest_id) do nothing
    $migration$;
  end if;
end $$;

alter table public.graduation_guests enable row level security;
alter table public.graduation_attendance enable row level security;
revoke all on public.graduation_guests, public.graduation_attendance from anon, authenticated;
grant all on public.graduation_guests, public.graduation_attendance to service_role;
