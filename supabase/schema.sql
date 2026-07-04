-- =========================================================================
--  Medical AI — Supabase schema (auth profiles, credits, orders)
--  Run this once in the Supabase SQL editor.
-- =========================================================================

-- ---- Profiles (one row per auth user) -----------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  email      text,
  full_name  text,
  plan       text not null default 'free',
  credits    int  not null default 25,        -- free starter credits
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ---- Auto-create a profile when a user signs up -------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---- Atomically spend one credit (called by the logged-in user) ---------
-- Returns remaining credits, or -1 if the user has none left.
create or replace function public.deduct_credit()
returns int language plpgsql security definer set search_path = public as $$
declare remaining int;
begin
  update public.profiles
     set credits = credits - 1, updated_at = now()
   where id = auth.uid() and credits > 0
  returning credits into remaining;
  return coalesce(remaining, -1);
end; $$;

grant execute on function public.deduct_credit() to authenticated;

-- ---- Orders (payment intents) -------------------------------------------
create table if not exists public.orders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete set null,
  plan       text not null,
  amount_pkr int  not null,
  credits    int  not null,
  method     text not null,                    -- jazzcash | easypaisa | bank | card
  status     text not null default 'pending',  -- pending | paid | rejected
  reference  text,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own" on public.orders
  for insert with check (auth.uid() = user_id);

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select using (auth.uid() = user_id);

-- ---- Grant credits after a confirmed payment ----------------------------
-- SECURITY: call this ONLY from the server with the service-role key
-- (e.g. a payment webhook), never from the browser.
create or replace function public.grant_credits(p_user uuid, p_amount int, p_plan text)
returns int language plpgsql security definer set search_path = public as $$
declare newbal int;
begin
  update public.profiles
     set credits = credits + p_amount,
         plan = coalesce(p_plan, plan),
         updated_at = now()
   where id = p_user
  returning credits into newbal;
  return newbal;
end; $$;

revoke execute on function public.grant_credits(uuid, int, text) from authenticated, anon;
