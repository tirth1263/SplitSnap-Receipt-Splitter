-- Monthly scan counter per anonymous device, used to enforce the free tier.
create table if not exists public.scan_usage (
  device_id text not null,
  month     text not null,              -- 'YYYY-MM'
  count     integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (device_id, month)
);

-- Only the Edge Function (service role) touches this table.
alter table public.scan_usage enable row level security;

-- Atomically claim one scan. Returns the new count, or -1 if the limit is reached.
create or replace function public.claim_scan(p_device text, p_month text, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare new_count integer;
begin
  insert into scan_usage (device_id, month, count) values (p_device, p_month, 1)
  on conflict (device_id, month) do update
    set count = scan_usage.count + 1, updated_at = now()
    where scan_usage.count < p_limit
  returning count into new_count;
  return coalesce(new_count, -1);
end $$;

-- Give a scan back if the AI call failed, so users aren't charged for errors.
create or replace function public.refund_scan(p_device text, p_month text)
returns void
language sql
security definer
set search_path = public
as $$
  update scan_usage set count = greatest(count - 1, 0), updated_at = now()
  where device_id = p_device and month = p_month;
$$;

revoke all on function public.claim_scan(text, text, integer) from public, anon, authenticated;
revoke all on function public.refund_scan(text, text) from public, anon, authenticated;
