-- Passdown demo seed
--
-- IMPORTANT: everything here is sample data for the demo campus.
-- The UI must label any screen fed by this data as "Demo Campus Preview".
-- Do not present these numbers as real usage anywhere in the video or write-up.
--
-- Steps:
--   1. Sign up two accounts through the app UI (e.g. demo.a@<your-domain>, demo.b@<your-domain>)
--   2. Grab their ids: select id, email from profiles;
--   3. Paste them below, then run this file.

-- \set user_a '00000000-0000-0000-0000-000000000000'
-- \set user_b '11111111-1111-1111-1111-111111111111'

-- ------------------------------------------------ demand counts for the home screen

insert into demo_demand (item_name, waiting) values
  ('Mini fridge',           12),
  ('Desk lamp',              8),
  ('Scientific calculator',  5),
  ('Lab goggles',            4),
  ('Monitor',                3),
  ('Storage bins',           3),
  ('Laundry hamper',         2)
on conflict (item_name) do update set waiting = excluded.waiting;

-- ------------------------------------------------ a few live items from user B

-- insert into items (owner_id, name, category, condition, is_free, price, pickup_location, available_until)
-- values
--   (:'user_b', 'Desk lamp',   'Dorm',        'good',     true, 0, 'Library Entrance',      current_date + 14),
--   (:'user_b', 'Storage bins','Dorm',        'like_new', true, 0, 'Residence Hall Lobby',  current_date + 10),
--   (:'user_b', 'Monitor',     'Electronics', 'good',     false, 1500, 'Student Center',     current_date + 7);

-- ------------------------------------------------ an open need from user A

-- insert into needs (user_id, item_name, category, free_only, needed_by)
-- values (:'user_a', 'Mini fridge', 'Dorm', true, current_date + 14);

-- Leave the mini fridge UNRELEASED. The live demo is: user B releases it,
-- user A's screen shows Match Found, A claims it, the item locks.
