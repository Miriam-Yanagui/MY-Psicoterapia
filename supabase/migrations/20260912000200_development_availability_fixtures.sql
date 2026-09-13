-- DEVELOPMENT / TEST FIXTURES ONLY.
-- Approved Batch 4B-1 availability for 2026-09-16 in America/Mexico_City.

insert into public.slots (starts_at, ends_at, timezone, availability_status)
values
  ('2026-09-16 10:00:00-06', '2026-09-16 10:50:00-06', 'America/Mexico_City', 'open'),
  ('2026-09-16 12:30:00-06', '2026-09-16 13:20:00-06', 'America/Mexico_City', 'open'),
  ('2026-09-16 18:00:00-06', '2026-09-16 18:50:00-06', 'America/Mexico_City', 'open')
on conflict (starts_at, ends_at) do nothing;
