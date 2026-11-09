-- Unsubscribe looks rows up by the lower-cased address: an imported mixed-case row fails here, not silently later.
do $$ begin
  alter table subscribers add constraint subscribers_email_lower check (email = lower(btrim(email)));
exception when duplicate_object then null;
end $$;
