-- The web waitlist columns (supabase 20260529120000_waitlist.sql + invited_at); one row per address.
create table if not exists subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  referrer    text,
  utm         jsonb,
  locale      text,
  timezone    text,
  page        text,
  ip          text,
  user_agent  text,
  created_at  timestamptz not null default now(),
  invited_at  timestamptz
);

create index if not exists subscribers_created_at on subscribers (created_at desc, id desc);
