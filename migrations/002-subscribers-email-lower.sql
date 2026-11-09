-- Backstop: unsubscribe deletes by the lower-cased address; the cutover import writes lower(btrim(email)) with on conflict (email) do nothing.
do $$ begin
  alter table subscribers add constraint subscribers_email_lower check (email = lower(btrim(email)));
exception when duplicate_object then null;
end $$;
