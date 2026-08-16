-- ============================================================
-- 课程反馈统计视图 · lesson_feedback_stats（2026-08-16 修正版）
-- ============================================================
-- 用途：把 lesson_feedback 表聚合成「每课有帮助/无帮助计数」，
--       并对所有用户（含游客）开放只读，用于前端展示「有帮助 X / 无帮助 Y」。
--
-- 安全设计（本版修正）：
--   原表带 user_id，整表开放 select 会泄露「谁投了什么」。
--   旧版脚本曾把原表整表开放、靠「前端只查视图不查原表」兜底 —— 这不成立：
--   任何拿到 anon key 的人都能直接请求 /rest/v1/lesson_feedback?select=*
--   拿到全部 user_id 与投票明细。
--   现改为「行放行 + 列收紧」：
--   1) 视图 security_invoker = true：以调用者身份执行，不绕过底层表权限，
--      同时消除 Supabase Security Advisor 的「Security Definer View」报错；
--   2) 原表收回整表 select，只按列授予 select(lesson_id, helpful)：
--      直接查原表时，凡涉及 user_id / created_at 的请求一律被数据库拒绝（42501）；
--   3) 行级策略保持「所有人可读行」—— RLS 管「行」，列权限管「列」，
--      行放行 + 列收紧 = 游客能看到聚合所需数据，但看不到「谁投的」。
--
-- 使用方法：Supabase 控制台 → SQL Editor → 按步骤逐条单独执行
--   ⚠️ 不能一次全贴：建视图/改权限会在同一事务里互相等锁。
-- 可重复执行（create or replace / drop if exists / 幂等 grant）
--
-- 依赖：已有的 lesson_feedback 表（docs/supabase-feedback-setup.sql）
-- ============================================================

-- 1. 建视图：每课一行，helpful_count / unhelpful_count
--    security_invoker = true：视图以调用者身份执行（不绕过 RLS 与列权限）
create or replace view public.lesson_feedback_stats
with (security_invoker = true) as
select
  lesson_id,
  count(*) filter (where helpful = true)  as helpful_count,
  count(*) filter (where helpful = false) as unhelpful_count
from public.lesson_feedback
group by lesson_id;

-- 兜底：若视图早已存在，create or replace 可能沿用旧的安全属性，
-- 单独 alter 一次确保 security_invoker 生效 —— 这是消除 Advisor 报错的关键。
alter view public.lesson_feedback_stats set (security_invoker = true);

-- 2. 行级：所有人可读行（RLS 管「行」；敏感列的可见性交给第 3 步管）
drop policy if exists "feedback read own" on public.lesson_feedback;
drop policy if exists "feedback read all" on public.lesson_feedback;
create policy "feedback read all"
  on public.lesson_feedback for select
  using (true);

-- 3. 列级：收回整表 select，只授予聚合所需的两列
--    效果：select=* 或 select=user_id 直接查原表 → permission denied（42501）；
--          只有 lesson_id + helpful 可读 —— 与视图公开的聚合信息等价，无隐私增量。
revoke select on public.lesson_feedback from anon, authenticated;
grant select (lesson_id, helpful) on public.lesson_feedback to anon, authenticated;

-- 4. 给 anon / authenticated 角色授予视图读权限
grant select on public.lesson_feedback_stats to anon, authenticated;

-- ============================================================
-- 验证（2026-08-16 已实测通过）：
--   用前端 anon key 以游客身份请求：
--   1) GET /rest/v1/lesson_feedback_stats?select=*  → 200，正常返回计数；
--   2) GET /rest/v1/lesson_feedback?select=*        → 42501 permission denied；
--   3) GET /rest/v1/lesson_feedback?select=user_id  → 42501 permission denied。
--
-- 其他说明：
-- 1. 写权限（insert/delete）不变：仍只能操作自己的记录（auth.uid() = user_id）。
-- 2. service_role / postgres 不受 revoke 影响，后台与控制台照常可读全表。
-- 3. 后续给原表新增列不会自动继承列授权 —— 默认即「不可读」，符合预期。
-- ============================================================
