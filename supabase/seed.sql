-- Passdown demo seed
--
-- IMPORTANT: everything here is sample data for the demo campus.
-- The UI labels any screen fed by this data "Demo Campus Preview".
-- Do not present these numbers as real usage in the video or the write-up.
--
-- This file runs automatically on `npm run db:reset`. It only fills the
-- demand list — accounts, needs and items are created through the app so
-- that every row in the demo went through the real code path.

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

-- ------------------------------------------------ setting up the live demo
--
-- 1. Sign up two accounts through the app at the same institutional domain,
--    e.g. demo.a@vit.ac.in and demo.b@vit.ac.in. Locally, the six-digit codes
--    arrive in Mailpit at http://127.0.0.1:54324.
-- 2. Put them in different blocks during onboarding — A in Block A, B in
--    Block B — so the walk time on the match card is a real number.
-- 3. As A, post a Need for a mini fridge, free only, needed in two weeks.
-- 4. Leave it there. The live demo is: B releases the fridge, A's screen shows
--    the match, A claims it, and the item locks in front of the audience.
--
-- `pickup_location` values are ids from src/lib/campus.ts, not free text —
-- 'block-b-lobby', 'library-entrance', and so on. That is what makes the walk
-- time computable instead of decorative.

-- Optional extra supply, so Browse isn't empty on camera. Fill in a real
-- owner id from `select id, email from profiles;` before running these.
--
-- insert into items (owner_id, name, category, condition, is_free, price, pickup_location, available_until)
-- values
--   ('<user_b_id>', 'Desk lamp',    'Dorm',        'good',     true,  0,    'library-entrance', current_date + 14),
--   ('<user_b_id>', 'Storage bins', 'Dorm',        'like_new', true,  0,    'block-b-lobby',    current_date + 10),
--   ('<user_b_id>', 'Monitor',      'Electronics', 'good',     false, 1500, 'student-center',   current_date + 7);
