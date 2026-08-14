-- Passdown schema
-- Run in the Supabase SQL editor, top to bottom.

-- ---------------------------------------------------------------- enums

create type item_status        as enum ('available','reserved','claimed','completed','expired');
create type need_status        as enum ('open','matched','fulfilled','cancelled');
create type reservation_status as enum ('active','confirmed','expired','cancelled');
create type handoff_status     as enum ('scheduled','completed','cancelled');
create type item_condition     as enum ('new','like_new','good','fair');

-- ---------------------------------------------------------------- profiles

create table profiles (
  id                  uuid primary key references auth.users on delete cascade,
  name                text not null,
  email               text not null,
  institution         text not null,          -- email domain, e.g. vit.ac.in
  campus_area         text,                   -- residence block / building
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
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------- items

create table items (
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

create index items_status_idx   on items(status);
create index items_category_idx on items(category);

-- ---------------------------------------------------------------- needs

create table needs (
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

create index needs_status_idx on needs(status);

-- ---------------------------------------------------------------- matches

create table matches (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references items(id) on delete cascade,
  need_id     uuid not null references needs(id) on delete cascade,
  match_score int  not null,
  reasons     jsonb not null default '[]'::jsonb,
  seen        boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (item_id, need_id)
);

-- ---------------------------------------------------------------- reservations

create table reservations (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references items(id) on delete cascade,
  claimant_id uuid not null references profiles(id) on delete cascade,
  expires_at  timestamptz not null,
  status      reservation_status not null default 'active',
  created_at  timestamptz not null default now()
);

-- THE important constraint: one live reservation per item, enforced by the database
create unique index one_active_reservation_per_item
  on reservations (item_id) where status = 'active';

-- ---------------------------------------------------------------- handoffs

create table handoffs (
  id                uuid primary key default gen_random_uuid(),
  item_id           uuid not null unique references items(id) on delete cascade,
  giver_id          uuid not null references profiles(id),
  receiver_id       uuid not null references profiles(id),
  location          text not null,
  scheduled_time    timestamptz,
  confirmation_code text not null,
  giver_confirmed   boolean not null default false,
  receiver_confirmed boolean not null default false,
  status            handoff_status not null default 'scheduled',
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------- demo data flag

-- counts shown in "Students near you need" when running on seeded data.
-- kept in its own table so the UI can label it Demo Campus Preview honestly.
create table demo_demand (
  item_name text primary key,
  waiting   int not null
);

-- ================================================================ functions

-- helper: caller's institution
create or replace function my_institution() returns text
language sql stable security definer set search_path = public as $$
  select institution from profiles where id = auth.uid()
$$;

-- atomic claim. Called from the client as supabase.rpc('claim_item', { p_item_id })
create or replace function claim_item(p_item_id uuid)
returns reservations
language plpgsql security definer set search_path = public as $$
declare
  v_item items;
  v_res  reservations;
begin
  select * into v_item from items where id = p_item_id for update;

  if v_item.id is null                then raise exception 'item_not_found';       end if;
  if v_item.status <> 'available'     then raise exception 'item_unavailable';     end if;
  if v_item.owner_id = auth.uid()     then raise exception 'cannot_claim_own_item'; end if;

  update items set status = 'reserved' where id = p_item_id;

  insert into reservations (item_id, claimant_id, expires_at)
  values (p_item_id, auth.uid(), now() + interval '10 minutes')
  returning * into v_res;

  return v_res;
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

  if v_res.id is null              then raise exception 'reservation_not_found'; end if;
  if v_res.claimant_id <> auth.uid() then raise exception 'not_your_reservation'; end if;
  if v_res.status <> 'active'      then raise exception 'reservation_not_active'; end if;
  if v_res.expires_at < now()      then raise exception 'reservation_expired';    end if;

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
    select * into v_h from handoffs where id = p_handoff_id;
  end if;

  return v_h;
end;
$$;

-- sweep expired reservations. call from a cron job or on page load.
create or replace function expire_reservations()
returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  with expired as (
    update reservations set status = 'expired'
    where status = 'active' and expires_at < now()
    returning item_id
  )
  update items set status = 'available'
  where id in (select item_id from expired) and status = 'reserved';

  get diagnostics v_count = row_count;
  return v_count;
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

-- profiles: see people at your institution, edit only yourself
create policy profiles_read on profiles for select
  using (institution = my_institution());
create policy profiles_update on profiles for update
  using (id = auth.uid());

-- items: campus-scoped read, owner writes
create policy items_read on items for select
  using (exists (select 1 from profiles p where p.id = items.owner_id and p.institution = my_institution()));
create policy items_insert on items for insert
  with check (owner_id = auth.uid());
create policy items_update on items for update
  using (owner_id = auth.uid());
create policy items_delete on items for delete
  using (owner_id = auth.uid());

-- needs: your own are readable and writable; aggregate counts come from a view
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

-- ================================================================ storage

-- run once, then set the bucket to public in the dashboard
insert into storage.buckets (id, name, public) values ('item-photos','item-photos', true)
on conflict do nothing;
