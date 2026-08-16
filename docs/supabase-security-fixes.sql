-- ============================================================
-- Supabase Security Advisor 修正存档（2026-08-16，v2 修正版）
-- ============================================================
-- 背景：Security Advisor 报「1 错误 + 11 警告」。
--   错误（Security Definer View · lesson_feedback_stats）已由
--   docs/supabase-feedback-stats-view.sql（修正版）解决，不在本文件重复。
--
-- ⚠️ v2 修正的关键教训：
--   函数的 EXECUTE 权限默认授给角色 PUBLIC（所有角色的并集），
--   `revoke ... from anon, authenticated` 只是收回「直接授权」，
--   而这两个角色根本没有直接授权 → 等于空操作（实测：revoke 后游客
--   调 /rpc/is_mentor 仍返回 200）。
--   必须从 public 收，需要保留的角色再单独 grant 回来。
--
-- 使用方法：Supabase 控制台 → SQL Editor → 按步骤逐条单独执行
--   ⚠️ 不能一次全贴：改策略/改函数属性会互相等锁。
-- 全部语句幂等，可重复执行。
-- ============================================================

-- ------------------------------------------------------------
-- A1. 触发器函数固定 search_path                        【已生效 ✓】
--     消除警告：function_search_path_mutable（touch_comment_updated_at）
--     函数体只用 pg_catalog 的 coalesce/now()，空 search_path 安全。
-- ------------------------------------------------------------
alter function public.touch_comment_updated_at() set search_path = '';

-- ------------------------------------------------------------
-- A2. 新用户注册触发器：从 PUBLIC 收回直接调用权
--     消除警告：handle_new_user ×2（anon + authenticated）
--     该函数只由 auth.users 上的注册触发器调用，触发身份是
--     supabase_auth_admin —— 先显式给它授权兜底（无论触发时是否
--     复查 EXECUTE 都安全），再从 public 收回默认授权。
-- ------------------------------------------------------------
grant execute on function public.handle_new_user() to supabase_auth_admin;
revoke execute on function public.handle_new_user() from public;

-- ------------------------------------------------------------
-- A3. RLS 自动开启函数：从 PUBLIC 收回
--     消除警告：rls_auto_enable ×2（anon + authenticated）
--     只有属主 postgres（SQL Editor）会用到它，属主权限不受影响。
-- ------------------------------------------------------------
revoke execute on function public.rls_auto_enable() from public;

-- ------------------------------------------------------------
-- A4. 埋点表 insert 策略：无条件放行 → 基本格式校验      【已生效 ✓】
--     消除警告：rls_policy_always_true（site_visits「visits insert anyone」）
--     依据 lib/visitTracker.ts 的实际写入格式：
--       path = location.pathname（恒以 / 开头）、visitor_id = 36 位 UUID
-- ------------------------------------------------------------
drop policy if exists "visits insert anyone" on public.site_visits;
create policy "visits insert anyone"
  on public.site_visits for insert
  with check (path like '/%' and char_length(visitor_id) between 8 and 64);

-- ------------------------------------------------------------
-- A5. is_mentor：从 PUBLIC 收回，authenticated 单独补授
--     消除警告：is_mentor（anon 1 条）
--
--     依据（2026-08-16 实查）：
--     1) is_mentor() 被 3 条 RLS 策略引用：checkins / quiz_results /
--        progress 的「导师读所有 ×××」。策略以查询者身份执行，
--        查询者没有 EXECUTE 会直接 permission denied。
--     2) 查这三张表的前端入口全部有登录门禁（LessonCheck /
--        ProgressTracker / DailyGate / SelfTest / MentorDashboard /
--        dashboard 后台），游客从不查询 → anon 不需要 EXECUTE。
--     3) authenticated（学员查自己 + 导师查全部）需要 → 单独 grant。
--        （相应地「authenticated 可执行 definer 函数」警告保留，接受。）
-- ------------------------------------------------------------
revoke execute on function public.is_mentor() from public;
grant execute on function public.is_mentor() to authenticated;

-- ------------------------------------------------------------
-- A6.（可选加固）以后新建的函数默认不再对公网开放
--     本项目前端没有任何 rpc 调用，默认收紧符合现状；
--     若将来要给前端 rpc 用，需手动 grant execute。
-- ------------------------------------------------------------
-- alter default privileges in schema public revoke execute on functions from public;

-- ============================================================
-- B. 控制台开关（非 SQL）——已确认本项目为 Free 计划，无法开启
--    auth_leaked_password_protection：
--    该功能（HaveIBeenPwned 撞库密码拦截）仅 Pro 计划及以上可用，
--    Free 计划下开关为灰色，此警告长期存在、接受。
--    缓解：导师/管理员账号使用强密码且不与其他网站复用。
--
-- C. 接受、不修（剩 3 条警告，属有意设计）
--    1) can_access_course_path ×2（anon + authenticated 可执行 definer 函数）
--       被 storage.objects 的课程内容访问策略引用（supabase/migrations/
--       001~003），两种角色查课程内容时策略都要执行它，EXECUTE 必须保留
--       （即便改成「收 public + 重新授权」，角色实际仍可执行，警告依旧）。
--       对外只暴露「某路径能否访问」的布尔值，无实质风险。
--    2) is_mentor（authenticated 可执行 definer 函数）
--       见 A5 说明：策略必需，保留。
--
-- 执行后预期（2026-08-16 实测达成）：11 条警告 → 剩 4 条
--   （C 类 3 条 + B 类 Free 计划无法开启 1 条），全部长期接受。
-- 验证方式：anon key 调 POST /rest/v1/rpc/is_mentor 应返回
--   42501 permission denied（v1 修复前实测仍返回 200 false，即空操作）。
-- ============================================================
