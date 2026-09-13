-- Keep existing environments aligned with the corrected E.164 constraints in
-- the Batch 4B-3 migration after the original recovery migration was applied.

alter table public.appointments
  drop constraint appointments_country_code_format,
  add constraint appointments_country_code_format
    check (country_code is null or country_code ~ '^[+][1-9][0-9]{0,3}$'),
  drop constraint appointments_phone_e164_format,
  add constraint appointments_phone_e164_format
    check (phone is null or phone ~ '^[+][1-9][0-9]{7,14}$');
