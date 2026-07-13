-- ============================================================
-- 网站访问统计 · site_visits 表 + RLS
-- ============================================================
-- 用途：记录任何访客（含未登录游客）的访问，导师后台展示统计。
-- 访问定义：同一访客 24 小时内只算 1 次（前端埋点控制）。
--
-- 使用方法：Supabase 控制台 → SQL Editor → 粘贴执行 → Run
-- 可重复执行（带 if not exists / drop policy if exists）
-- ============================================================

-- --------------------------------------------------------
-- 表：site_visits
-- --------------------------------------------------------
create table if not exists site_visits (
  id           uuid primary key default gen_random_uuid(),
  visitor_id   text not null,                   -- 匿名访客 UUID（永久，存 localStorage）
  path         text not null,                   -- 访问的页面路径
  page_type    text not null,                   -- home / lesson / overview / dashboard / other
  is_logged_in boolean not null default false,  -- 访问时是否登录
  user_id      uuid,                            -- 登录用户 id（游客为 null）
  created_at   timestamptz not null default now()
);

create index if not exists site_visits_created_idx on site_visits (created_at desc);
create index if not exists site_visits_visitor_idx on site_visits (visitor_id);
create index if not exists site_visits_pathtype_idx on site_visits (page_type, path);

-- ============================================================
-- RLS：匿名可写、仅管理员可读
-- ============================================================
alter table site_visits enable row level security;

-- 写入：任何人（含匿名）都能写 —— 这是埋点的基础
drop policy if exists "visits insert anyone" on site_visits;
create policy "visits insert anyone"
  on site_visits for insert with check (true);

-- 读取：仅管理员（role = mentor 或 admin）
drop policy if exists "visits read mentor" on site_visits;
create policy "visits read mentor"
  on site_visits for select
  using (exists (select 1 from profiles where id = auth.uid() and role in ('mentor','admin')));

-- 删除：仅管理员（用于清理测试数据/异常数据）
drop policy if exists "visits delete mentor" on site_visits;
create policy "visits delete mentor"
  on site_visits for delete
  using (exists (select 1 from profiles where id = auth.uid() and role in ('mentor','admin')));

-- 说明：
-- 1. 没有 update 策略 —— 访问记录只增不改，防止篡改统计。
-- 2. 即便有人拿 anon key 狂刷写入，也只能造成数据膨胀，看不到/删不掉别人的记录。
-- 3. 前端靠 24h 合并 + visitor_id 去重控制频次，正常情况下不会刷出大量数据。
