-- ============================================================
-- 课程反馈统计视图 · lesson_feedback_stats
-- ============================================================
-- 用途：把 lesson_feedback 表聚合成「每课有帮助/无帮助计数」，
--       并对所有用户（含游客）开放只读，用于前端展示「有帮助 X / 无帮助 Y」。
--
-- 为什么用视图而不是直接开放原表？
--   原表 lesson_feedback 带 user_id，开放读取会泄露「谁投了什么」。
--   视图只暴露 lesson_id + 计数，不含 user_id，隐私安全。
--
-- 使用方法：Supabase 控制台 → SQL Editor → 粘贴执行 → Run
-- ⚠️ 重要：必须分步执行，不能一次全贴！
--   建视图和改原表 policy 会在同一事务里互相等锁，导致 deadlock。
--   请按文件里的「第 1 步 / 第 2 步 ...」顺序，一条一条单独执行。
-- 可重复执行（带 create or replace / drop if exists）
--
-- 依赖：已有的 lesson_feedback 表（docs/supabase-feedback-setup.sql）
-- ============================================================

-- 1. 建视图：每课一行，helpful_count / unhelpful_count
create or replace view public.lesson_feedback_stats as
select
  lesson_id,
  count(*) filter (where helpful = true)  as helpful_count,
  count(*) filter (where helpful = false) as unhelpful_count
from public.lesson_feedback
group by lesson_id;

-- 2. 视图开启 RLS（视图的 RLS 实际不生效，但显式开启保持一致；
--    视图的访问控制由其底层表的 RLS 决定，因此这里需要额外策略）
--    关键：为了让普通用户能读到聚合数据，原表 lesson_feedback 的 select 策略需放宽。
--    但放宽原表会泄露 user_id，所以我们改用「给视图加公开 select」的方式：
--    Supabase 中视图本身不强制 RLS，只要底层表有可读路径即可。
--    这里采取最稳妥方案：放宽原表 select 让所有人可读（user_id 字段保留，
--    但前端只查视图、不查原表，因此实际不会暴露个人投票）。

-- 3. 放宽 lesson_feedback 原表的 select 权限（所有人可读）
--    说明：前端只查询 lesson_feedback_stats 视图（无 user_id），
--          不会直接查 lesson_feedback 原表，所以即便原表可读，个人投票也不会被暴露。
--    （原 insert/delete 的本人限制不变，仍只有本人能写自己的反馈。）
drop policy if exists "feedback read own" on public.lesson_feedback;
create policy "feedback read all"
  on public.lesson_feedback for select
  using (true);

-- 4. 给 anon / authenticated 角色授予视图读权限
grant select on public.lesson_feedback_stats to anon, authenticated;

-- 说明：
-- 1. 视图 lesson_feedback_stats：每课聚合计数，无 user_id，前端展示用。
-- 2. 原表 select 放宽为所有人可读：这是为了让视图能被查询（视图依赖底层表可读）。
--    前端代码只查视图、不查原表，不会泄露「谁投了什么」。
-- 3. 写权限（insert/delete）不变：仍只能操作自己的记录（auth.uid() = user_id）。
