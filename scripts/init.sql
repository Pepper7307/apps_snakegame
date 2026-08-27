-- ============================================================================
-- 🐍 Snake Game Leaderboard - One-time Initialization Script
-- ============================================================================
-- 功能:
--   1. 用户资料表 profiles (扩展 Supabase Auth)
--   2. 游戏分数表 scores (每局记录)
--   3. 注册触发器 handle_new_user (自动建 profile)
--   4. RLS 策略 (防作弊 + 数据隔离)
--   5. 排行榜 RPC get_leaderboard (含 email 脱敏, 方案2)
--   6. 个人最高分 RPC get_my_best_score
--   7. 个人历史 RPC get_my_history
--   8. 索引
--
-- 用法: 在 Supabase Dashboard SQL Editor 粘贴全文 Run
-- ============================================================================

-- Extensions
create extension if not exists pgcrypto;

-- ============================================================================
-- 1. profiles 表 (用户公开资料, 扩展 auth.users)
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is '用户资料表, 扩展 auth.users 存 username 等公开信息';
comment on column public.profiles.id is '与 auth.users.id 一致 (注册时由触发器自动写入)';
comment on column public.profiles.username is '排行榜显示名 (允许重名, 用 email 脱敏区分; 如需唯一可自行加 unique 约束)';
comment on column public.profiles.avatar_url is '头像 URL (可选)';

alter table public.profiles enable row level security;

-- ============================================================================
-- 2. scores 表 (游戏记录, 每局一条)
-- ============================================================================
create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null check (score >= 0),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  snake_length integer check (snake_length is null or snake_length >= 1),
  beans_eaten integer check (beans_eaten is null or beans_eaten >= 0),
  bean_breakdown jsonb,
  created_at timestamptz not null default now()
);

comment on table public.scores is '贪吃蛇每局游戏记录';
comment on column public.scores.user_id is '玩家 user_id (关联 profiles.id, 间接关联 auth.users.id)';
comment on column public.scores.score is '本局最终分数 (排行榜主排序键)';
comment on column public.scores.duration_ms is '本局游戏时长毫秒 (同分时谁快谁前)';
comment on column public.scores.snake_length is '蛇最终长度 (与 beans_eaten+1 一致)';
comment on column public.scores.beans_eaten is '吃豆总数';
comment on column public.scores.bean_breakdown is '各类豆统计 {normal, golden, speed, slow, ghost} (可选, 用于分析)';

alter table public.scores enable row level security;

-- ============================================================================
-- 3. updated_at 自动维护触发器
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

-- ============================================================================
-- 4. 注册触发器 handle_new_user
-- ============================================================================
-- 用户在 Supabase Auth 注册时自动建 profile
-- username 优先取 metadata.username, 否则取 email 本地部分, 兜底 player_xxx
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_username text;
begin
  if new.raw_user_meta_data ? 'username' then
    v_username := new.raw_user_meta_data->>'username';
  elsif new.email is not null then
    v_username := split_part(new.email, '@', 1);
  else
    v_username := 'player_' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;

  insert into public.profiles (id, username)
  values (new.id, v_username)
  on conflict (id) do nothing;

  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================================
-- 5. RLS 策略 (防作弊核心)
-- ============================================================================

-- profiles: 所有认证用户可读 (排行榜需要看 username); 自己可更新自己
drop policy if exists "profiles read auth" on public.profiles;
create policy "profiles read auth" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- scores: 所有认证用户可读 (看排名); 只能插入自己的; 禁止 update/delete (防篡改)
drop policy if exists "scores read auth" on public.scores;
create policy "scores read auth" on public.scores
  for select to authenticated using (true);

drop policy if exists "scores self insert" on public.scores;
create policy "scores self insert" on public.scores
  for insert to authenticated
  with check (auth.uid() = user_id);

-- 注意: 不创建 update/delete policy, RLS 启用时无 policy = 默认拒绝 (防作弊)

-- ============================================================================
-- 6. RPC: get_leaderboard (排行榜, email 脱敏方案2)
-- ============================================================================
-- security definer: 绕过 RLS, 可连表查 auth.users.email
-- email 脱敏: tom.brady@gmail.com -> t***@gmail.com
create or replace function public.get_leaderboard(p_limit integer default 10)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  email_masked text,
  score integer,
  duration_ms integer,
  snake_length integer,
  beans_eaten integer,
  played_at timestamptz
) language sql security definer set search_path = public as $$
  select
    row_number() over (
      order by s.score desc,
               s.duration_ms asc nulls last,
               s.created_at desc
    ) as rank,
    s.user_id,
    p.username,
    case
      when u.email ~ '@' then left(u.email, 1) || '***@' || split_part(u.email, '@', 2)
      else '***'
    end as email_masked,
    s.score,
    s.duration_ms,
    s.snake_length,
    s.beans_eaten,
    s.created_at as played_at
  from public.scores s
  join public.profiles p on p.id = s.user_id
  join auth.users u on u.id = s.user_id
  order by s.score desc, s.duration_ms asc nulls last, s.created_at desc
  limit greatest(1, p_limit);
$$;

revoke all on function public.get_leaderboard(integer) from public;
grant execute on function public.get_leaderboard(integer) to authenticated;

-- ============================================================================
-- 7. RPC: get_my_best_score (个人最高分)
-- ============================================================================
create or replace function public.get_my_best_score()
returns table (
  score integer,
  duration_ms integer,
  snake_length integer,
  beans_eaten integer,
  played_at timestamptz
) language sql security definer set search_path = public as $$
  select s.score, s.duration_ms, s.snake_length, s.beans_eaten, s.created_at
  from public.scores s
  where s.user_id = auth.uid()
  order by s.score desc, s.duration_ms asc nulls last
  limit 1;
$$;

revoke all on function public.get_my_best_score() from public;
grant execute on function public.get_my_best_score() to authenticated;

-- ============================================================================
-- 8. RPC: get_my_history (个人历史, 分页)
-- ============================================================================
create or replace function public.get_my_history(p_limit integer default 20, p_offset integer default 0)
returns table (
  score integer,
  duration_ms integer,
  snake_length integer,
  beans_eaten integer,
  played_at timestamptz
) language sql security definer set search_path = public as $$
  select s.score, s.duration_ms, s.snake_length, s.beans_eaten, s.created_at
  from public.scores s
  where s.user_id = auth.uid()
  order by s.created_at desc
  limit greatest(1, p_limit)
  offset greatest(0, p_offset);
$$;

revoke all on function public.get_my_history(integer, integer) from public;
grant execute on function public.get_my_history(integer, integer) to authenticated;

-- ============================================================================
-- 9. 索引
-- ============================================================================
create index if not exists idx_scores_user on public.scores(user_id);
create index if not exists idx_scores_rank
  on public.scores(score desc, duration_ms asc nulls last, created_at desc);
create index if not exists idx_profiles_username on public.profiles(username);

-- ============================================================================
-- 10. Backfill: 为已存在的 auth.users 补建 profile
-- ============================================================================
insert into public.profiles (id, username)
select u.id, split_part(u.email, '@', 1)
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict do nothing;

-- 刷新 PostgREST schema 缓存 (让 RPC 立即可用)
select pg_notify('pgrst', 'reload schema');

-- ============================================================================
-- 初始化完成
-- ============================================================================
select 'snake game leaderboard init complete' as status;
