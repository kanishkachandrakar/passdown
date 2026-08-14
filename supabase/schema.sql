-- Passdown schema
-- Run in the Supabase SQL editor, top to bottom. Safe to re-run.

-- ---------------------------------------------------------------- enums

do $$ begin
  create type item_status as enum ('available','reserved','claimed','completed','expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type need_status as enum ('open','matched','fulfilled','expired','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type reservation_status as enum ('active','confirmed','expired','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type handoff_status as enum ('scheduled','completed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type item_condition as enum ('new','like_new','good','fair');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- profiles

create table if not exists profiles (
  id                  uuid primary key references auth.users on delete cascade,
  name                text not null,
  email               text not null,
  institution         text not null,          -- email domain, e.g. vit.ac.in
  campus_area         text,                   -- residence block / building, see src/lib/campus.ts
  verified            boolean not null default false,
  successful_handoffs int  not null default 0,
  missed_pickups      int  not null default 0,
  created_at          timestamptz not null default now()
);

-- auto-create a profile row on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, email, institution, verified)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.email,
    split_part(new.email,'@',2),
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------- items

create table if not exists items (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references profiles(id) on delete cascade,
  name            text not null,
  category        text not null,
  description     text,
  condition       item_condition not null default 'good',
  is_free         boolean not null default true,
  price           numeric(10,2) not null default 0,
  photo_url       text,
  pickup_location text not null,
  available_until date not null,
  status          item_status not null default 'available',
  created_at      timestamptz not null default now(),
  constraint price_matches_free check ((is_free and price = 0) or (not is_free and price > 0))
);

create index if not exists items_status_idx     on items(status);
create index if not exists items_category_idx   on items(category);
create index if not exists items_owner_idx      on items(owner_id);
-- the browse query: available items, soonest to lapse first
create index if not exists items_live_idx       on items(available_until) where status = 'available';

-- ---------------------------------------------------------------- needs

create table if not exists needs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references profiles(id) on delete cascade,
  item_name           text not null,
  category            text not null,
  free_only           boolean not null default false,
  max_price           numeric(10,2),
  needed_by           date,
  preferred_condition item_condition,
  status              need_status not null default 'open',
  created_at          timestamptz not null default now()
);

create index if not exists needs_status_idx on needs(status);
create index if not exists needs_user_idx   on needs(user_id);
create index if not exists needs_open_idx   on needs(needed_by) where status = 'open';

-- ---------------------------------------------------------------- matches

create table if not exists matches (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references items(id) on delete cascade,
  need_id     uuid not null references needs(id) on delete cascade,
  match_score int  not null,
  reasons     jsonb not null default '[]'::jsonb,
  seen        boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (item_id, need_id)
);

create index if not exists matches_need_idx on matches(need_id);
create index if not exists matches_item_idx on matches(item_id);

-- ---------------------------------------------------------------- reservations

create table if not exists reservations (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references items(id) on delete cascade,
  claimant_id uuid not null references profiles(id) on delete cascade,
  expires_at  timestamptz not null,
  status      reservation_status not null default 'active',
  created_at  timestamptz not null default now()
);

-- THE important constraint: one live reservation per item, enforced by the database
create unique index if not exists one_active_reservation_per_item
  on reservations (item_id) where status = 'active';

create index if not exists reservations_claimant_idx on reservations(claimant_id);
create index if not exists reservations_sweep_idx    on reservations(expires_at) where status = 'active';

-- ---------------------------------------------------------------- handoffs

create table if not exists handoffs (
  id                 uuid primary key default gen_random_uuid(),
  item_id            uuid not null unique references items(id) on delete cascade,
  giver_id           uuid not null references profiles(id),
  receiver_id        uuid not null references profiles(id),
  location           text not null,
  scheduled_time     timestamptz,
  confirmation_code  text not null,
  giver_confirmed    boolean not null default false,
  receiver_confirmed boolean not null default false,
  status             handoff_status not null default 'scheduled',
  created_at         timestamptz not null default now()
);

create index if not exists handoffs_giver_idx    on handoffs(giver_id);
create index if not exists handoffs_receiver_idx on handoffs(receiver_id);

-- ---------------------------------------------------------------- demo data flag

-- counts shown in "Students near you need" when running on seeded data.
-- kept in its own table so the UI can label it Demo Campus Preview honestly.
create table if not exists demo_demand (
  item_name text primary key,
  waiting   int not null
);

-- ================================================================ functions

-- helper: caller's institution
create or replace function my_institution() returns text
language sql stable security definer set search_path = public as $$
  select institution from profiles where id = auth.uid()
$$;

-- ---------------------------------------------------------------- maintenance
--
-- Passdown has to keep working on day 40, not just on demo day. Three things
-- rot over time if nothing sweeps them:
--   * reservations nobody confirmed  -> the item is stuck `reserved` forever
--   * items past their available_until -> ghost supply in browse and matching
--   * needs past their needed_by       -> ghost demand, matched against forever
--
-- All three are swept below. Correctness never *depends* on the sweep running,
-- though: claim_item self-heals a lapsed reservation on the row it is already
-- locking, so a claim is always right even if no sweep has run in a month.

-- sweep expired reservations. Safe to call from anywhere, any number of times.
create or replace function expire_reservations()
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_expired uuid[];
  v_claimants uuid[];
begin
  with gone as (
    update reservations set status = 'expired'
    where status = 'active' and expires_at < now()
    returning item_id, claimant_id
  )
  select array_agg(item_id), array_agg(claimant_id) into v_expired, v_claimants from gone;

  if v_expired is null then
    return 0;
  end if;

  update items set status = 'available'
  where id = any(v_expired) and status = 'reserved';

  -- letting a reservation lapse is exactly what "missed pickup" means
  update profiles set missed_pickups = missed_pickups + 1
  where id = any(v_claimants);

  return array_length(v_expired, 1);
end;
$$;

-- items nobody collected before their available_until
create or replace function expire_stale_items()
returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  update items set status = 'expired'
  where status = 'available' and available_until < current_date;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- needs whose date has passed
create or replace function expire_stale_needs()
returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  update needs set status = 'expired'
  where status = 'open' and needed_by is not null and needed_by < current_date;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- one call the app and the cron job can both make
create or replace function run_maintenance()
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  return jsonb_build_object(
    'reservations_expired', expire_reservations(),
    'items_expired',        expire_stale_items(),
    'needs_expired',        expire_stale_needs()
  );
end;
$$;

-- ---------------------------------------------------------------- the claim
--
-- Atomic claim. Called as supabase.rpc('claim_item', { p_item_id }).
-- Two tabs pressing Claim at the same instant must produce exactly one
-- reservation; that is enforced here and by one_active_reservation_per_item,
-- not by anything in React.
create or replace function claim_item(p_item_id uuid)
returns reservations
language plpgsql security definer set search_path = public as $$
declare
  v_item items;
  v_res  reservations;
begin
  -- serialise every claim on this item behind one row lock
  select * into v_item from items where id = p_item_id for update;

  if v_item.id is null then raise exception 'item_not_found'; end if;

  -- self-heal: if this item is held by a reservation that has since lapsed,
  -- release it here rather than waiting for a sweep to come round.
  if v_item.status = 'reserved' then
    update reservations set status = 'expired'
    where item_id = p_item_id and status = 'active' and expires_at < now();

    if found then
      update profiles set missed_pickups = missed_pickups + 1
      where id in (
        select claimant_id from reservations
        where item_id = p_item_id and status = 'expired'
        order by created_at desc limit 1
      );
      update items set status = 'available' where id = p_item_id;
      v_item.status := 'available';
    end if;
  end if;

  if v_item.status <> 'available'  then raise exception 'item_unavailable';      end if;
  if v_item.owner_id = auth.uid()  then raise exception 'cannot_claim_own_item'; end if;
  if v_item.available_until < current_date then
    update items set status = 'expired' where id = p_item_id;
    raise exception 'item_expired';
  end if;

  update items set status = 'reserved' where id = p_item_id;

  insert into reservations (item_id, claimant_id, expires_at)
  values (p_item_id, auth.uid(), now() + interval '10 minutes')
  returning * into v_res;

  return v_res;
end;
$$;

-- hand the item back before the ten minutes are up.
-- Has to live here: the claimant is not the item's owner, and the items RLS
-- policy only lets an owner write. Not a missed pickup — they let it go early.
create or replace function cancel_reservation(p_reservation_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_res reservations;
begin
  select * into v_res from reservations where id = p_reservation_id for update;

  if v_res.id is null                then raise exception 'reservation_not_found'; end if;
  if v_res.claimant_id <> auth.uid() then raise exception 'not_your_reservation';  end if;
  if v_res.status <> 'active'        then raise exception 'reservation_not_active';end if;

  update reservations set status = 'cancelled' where id = p_reservation_id;
  update items set status = 'available'
    where id = v_res.item_id and status = 'reserved';
end;
$$;

-- confirm the claim within the window -> creates the handoff
create or replace function confirm_claim(p_reservation_id uuid)
returns handoffs
language plpgsql security definer set search_path = public as $$
declare
  v_res  reservations;
  v_item items;
  v_h    handoffs;
begin
  select * into v_res from reservations where id = p_reservation_id for update;

  if v_res.id is null                then raise exception 'reservation_not_found'; end if;
  if v_res.claimant_id <> auth.uid() then raise exception 'not_your_reservation';  end if;
  if v_res.status <> 'active'        then raise exception 'reservation_not_active';end if;

  if v_res.expires_at < now() then
    -- lapsed while they sat on the screen: clean up, then say so plainly
    update reservations set status = 'expired' where id = p_reservation_id;
    update items set status = 'available'
      where id = v_res.item_id and status = 'reserved';
    update profiles set missed_pickups = missed_pickups + 1 where id = v_res.claimant_id;
    raise exception 'reservation_expired';
  end if;

  select * into v_item from items where id = v_res.item_id for update;

  update reservations set status = 'confirmed' where id = p_reservation_id;
  update items        set status = 'claimed'   where id = v_item.id;
  update needs        set status = 'matched'
    where user_id = auth.uid() and status = 'open'
      and id in (select need_id from matches where item_id = v_item.id);

  insert into handoffs (item_id, giver_id, receiver_id, location, confirmation_code)
  values (
    v_item.id,
    v_item.owner_id,
    auth.uid(),
    v_item.pickup_location,
    lpad((floor(random()*10000))::int::text, 4, '0')
  )
  on conflict (item_id) do update set status = 'scheduled'
  returning * into v_h;

  return v_h;
end;
$$;

-- both sides confirm at pickup
create or replace function confirm_handoff(p_handoff_id uuid)
returns handoffs
language plpgsql security definer set search_path = public as $$
declare v_h handoffs;
begin
  select * into v_h from handoffs where id = p_handoff_id for update;
  if v_h.id is null then raise exception 'handoff_not_found'; end if;

  if v_h.status = 'completed' then return v_h; end if;

  if auth.uid() = v_h.giver_id then
    update handoffs set giver_confirmed = true where id = p_handoff_id;
  elsif auth.uid() = v_h.receiver_id then
    update handoffs set receiver_confirmed = true where id = p_handoff_id;
  else
    raise exception 'not_a_participant';
  end if;

  select * into v_h from handoffs where id = p_handoff_id;

  if v_h.giver_confirmed and v_h.receiver_confirmed then
    update handoffs set status = 'completed' where id = p_handoff_id;
    update items    set status = 'completed' where id = v_h.item_id;
    update profiles set successful_handoffs = successful_handoffs + 1
      where id in (v_h.giver_id, v_h.receiver_id);
    -- the need this closed is done, not merely matched
    update needs set status = 'fulfilled'
      where user_id = v_h.receiver_id and status in ('open','matched')
        and id in (select need_id from matches where item_id = v_h.item_id);
    select * into v_h from handoffs where id = p_handoff_id;
  end if;

  return v_h;
end;
$$;

-- ================================================================ RLS

alter table profiles     enable row level security;
alter table items        enable row level security;
alter table needs        enable row level security;
alter table matches      enable row level security;
alter table reservations enable row level security;
alter table handoffs     enable row level security;
alter table demo_demand  enable row level security;

drop policy if exists profiles_read       on profiles;
drop policy if exists profiles_update     on profiles;
drop policy if exists items_read          on items;
drop policy if exists items_insert        on items;
drop policy if exists items_update        on items;
drop policy if exists items_delete        on items;
drop policy if exists needs_own           on needs;
drop policy if exists matches_read        on matches;
drop policy if exists reservations_read   on reservations;
drop policy if exists handoffs_read       on handoffs;
drop policy if exists demo_demand_read    on demo_demand;

-- profiles: see people at your institution, edit only yourself
create policy profiles_read on profiles for select
  using (institution = my_institution());
create policy profiles_update on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- items: campus-scoped read, owner writes
create policy items_read on items for select
  using (exists (select 1 from profiles p where p.id = items.owner_id and p.institution = my_institution()));
create policy items_insert on items for insert
  with check (owner_id = auth.uid());
create policy items_update on items for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy items_delete on items for delete
  using (owner_id = auth.uid());

-- needs: your own only. Other students' needs are never readable from the
-- browser. Matching and the "N students already need this" count run in a
-- server action under the service role, which returns a number and never rows.
create policy needs_own on needs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- matches: readable if the need is yours or the item is yours
create policy matches_read on matches for select
  using (
    exists (select 1 from needs n where n.id = matches.need_id and n.user_id = auth.uid())
    or exists (select 1 from items i where i.id = matches.item_id and i.owner_id = auth.uid())
  );

-- reservations: yours, or on your item
create policy reservations_read on reservations for select
  using (
    claimant_id = auth.uid()
    or exists (select 1 from items i where i.id = reservations.item_id and i.owner_id = auth.uid())
  );

-- handoffs: participants only
create policy handoffs_read on handoffs for select
  using (giver_id = auth.uid() or receiver_id = auth.uid());

-- demo demand: readable by anyone signed in
create policy demo_demand_read on demo_demand for select using (auth.uid() is not null);

-- ================================================================ grants
--
-- Supabase no longer auto-exposes new tables to the API roles, so without
-- these the app gets "permission denied" on a fresh project even though RLS
-- is correct. RLS still decides which rows; these decide which tables exist.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on
  profiles, items, needs, matches, reservations, handoffs
  to authenticated, service_role;
grant select on demo_demand to authenticated, service_role;
grant insert, update, delete on demo_demand to service_role;

grant execute on function
  my_institution(), claim_item(uuid), confirm_claim(uuid), confirm_handoff(uuid),
  cancel_reservation(uuid), expire_reservations(), expire_stale_items(),
  expire_stale_needs(), run_maintenance()
  to authenticated, service_role;

-- ================================================================ scheduled sweep
--
-- Optional but recommended for anything past demo day. pg_cron is available on
-- Supabase; if the extension is missing this block is skipped and the app falls
-- back to sweeping on page load plus the self-healing claim above.

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;

    -- pg_cron always puts its objects in the `cron` schema, whatever schema
    -- the extension itself was created in.
    if exists (select 1 from cron.job where jobname = 'passdown-maintenance') then
      perform cron.unschedule('passdown-maintenance');
    end if;

    perform cron.schedule(
      'passdown-maintenance',
      '* * * * *',
      $cron$ select public.run_maintenance() $cron$
    );

    raise notice 'Scheduled passdown-maintenance to run every minute.';
  else
    raise notice 'pg_cron unavailable. Falling back to on-load sweeps + /api/maintenance.';
  end if;
exception when others then
  raise notice 'pg_cron not scheduled (%). Falling back to on-load sweeps + /api/maintenance.', sqlerrm;
end $$;

-- ================================================================ storage

insert into storage.buckets (id, name, public) values ('item-photos','item-photos', true)
on conflict (id) do nothing;

drop policy if exists item_photos_read   on storage.objects;
drop policy if exists item_photos_insert on storage.objects;
drop policy if exists item_photos_delete on storage.objects;

create policy item_photos_read on storage.objects for select
  using (bucket_id = 'item-photos');

-- students upload into a folder named after their own user id
create policy item_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy item_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text);
