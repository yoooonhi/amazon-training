-- ============================================================
-- 打卡上云 · checkins 表 RLS 策略补全
-- ============================================================
-- 背景：checkins 表已存在（user_id + checkin_date），
--   但之前只有读策略、没有写入策略，所以登录用户也写不进去，
--   导致 DailyGate 只能存 localStorage，导师后台永远读到空数据。
--
-- 使用方法：Supabase 控制台 → SQL Editor → 粘贴执行 → Run
-- 可重复执行（带 if not exists / drop policy if exists）
-- ============================================================

-- 确保 checkin_date 是 date 类型（如果建表时已是则跳过）
-- 如果你的表 checkin_date 已经是 date，这行会报错可忽略；
-- 若是 text，可执行：alter table checkins alter column checkin_date type date using checkin_date::date;

-- 复合主键（一人一天只能一条），如果已有主键请先调整
-- 保险起见：先尝试加，若已存在会报错可忽略
-- do $$ begin
--   alter table checkins add constraint checkins_pkey primary key (user_id, checkin_date);
-- exception when duplicate_object then null;
-- end $$;

-- 确保已开 RLS
alter table checkins enable row level security;

-- ---------- 读策略 ----------
-- 所有人可读（导师后台需要读全部学员的打卡）
drop policy if exists "checkins read all" on checkins;
create policy "checkins read all"
  on checkins for select using (true);

-- ---------- 写入策略：登录用户只能写自己的 ----------
-- 插入：必须登录，且 user_id 是自己
drop policy if exists "checkins insert own" on checkins;
create policy "checkins insert own"
  on checkins for insert
  with check (auth.uid() = user_id);

-- 删除：只能删自己的（防止误删/补打卡场景）
drop policy if exists "checkins delete own" on checkins;
create policy "checkins delete own"
  on checkins for delete
  using (auth.uid() = user_id);

-- 说明：
-- 1. 不设 update 策略 —— 打卡记录只增不改，需要"取消今日打卡"时用 delete。
-- 2. 导师不需要写学员的打卡（学员自己点按钮），所以不给 mentor 写权限。
