insert into public.graduation_guests (full_name, normalized_name) values
  ('Ufoyrwoth Keith', 'ufoyrwoth keith'),
  ('Nassanga Cindy Akello', 'nassanga cindy akello'),
  ('Edmond Okumu', 'edmond okumu')
on conflict (normalized_name) do update set full_name = excluded.full_name;

insert into public.graduation_attendance (guest_id, status)
select id, 'pending'
from public.graduation_guests
where normalized_name in ('ufoyrwoth keith', 'nassanga cindy akello', 'edmond okumu')
on conflict (guest_id) do nothing;
