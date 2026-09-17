-- Allow the trusted server client to run the private trigger helpers used by
-- slots and appointments. Browser roles remain explicitly excluded.

grant usage on schema private to service_role;

grant execute on function private.is_valid_iana_timezone(text) to service_role;
grant execute on function private.validate_slot_timezone() to service_role;
grant execute on function private.set_updated_at() to service_role;
