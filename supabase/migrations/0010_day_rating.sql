-- Add a 1-5 day rating to daily_plans so we can chart day quality over time.

alter table daily_plans
  add column if not exists day_rating smallint
  check (day_rating is null or (day_rating between 1 and 5));
