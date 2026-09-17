-- Allows Supabase Cron to invoke the protected Vercel email worker.
create extension if not exists pg_net;
