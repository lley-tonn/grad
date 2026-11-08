-- Add optional guest messages and allow the host to manage RSVP states.
alter table public.graduation_attendance
  add column if not exists guest_message text;

alter table public.graduation_attendance
  drop constraint if exists graduation_attendance_status_check;
alter table public.graduation_attendance
  add constraint graduation_attendance_status_check
  check (status in ('pending', 'attending', 'not_attending', 'maybe'));

alter table public.graduation_attendance
  drop constraint if exists graduation_attendance_guest_message_length;
alter table public.graduation_attendance
  add constraint graduation_attendance_guest_message_length
  check (guest_message is null or length(guest_message) <= 500);

insert into public.graduation_attendance (guest_id, status)
select id, 'pending'
from public.graduation_guests
on conflict (guest_id) do nothing;
