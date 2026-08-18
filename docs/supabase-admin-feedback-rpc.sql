-- ============================================================
-- 后台「反馈分析」管理员明细 RPC · admin_feedback_list（2026-08-18）
-- ============================================================
-- 背景：docs/supabase-feedback-stats-view.sql（2026-08-16）把
--   lesson_feedback 原表列权限收紧为 (lesson_id, helpful) 后，
--   dashboard 反馈分析页（FeedbackPage.vue 直接 select
--   user_id/created_at）被 42501 拒绝，页面表现为「数据丢失」。
--   数据本身从未丢失，只是前端无权限读取。
--
-- 为什么用 RPC 而不是 definer 视图：
--   Security Advisor 对「Security Definer View」报【错误】级
--   （上次刚修掉），而对「authenticated 可执行 definer 函数」只报
--   警告 —— is_mentor 已是同类接受项（docs/supabase-security-fixes.sql
--   A5/C），本函数走同一模式，Advisor 仅新增 1 条同类警告。
--
-- 安全设计：
--   1) security definer + 内嵌 public.is_mentor() 判定：
--      非导师/管理员调用 → 直接返回空集，无任何泄露；
--   2) set search_path = ''：消除 function_search_path_mutable 警告，
--      函数体内所有引用显式带 public. 前缀；
--   3) EXECUTE 权限：从 PUBLIC 收回（v2 教训：默认授给 PUBLIC，
--      只收 anon/authenticated 是空操作），再单独授予 authenticated；
--      游客调 /rpc/admin_feedback_list → 42501。
--
-- 使用方法：Supabase 控制台 → SQL Editor → 按步骤逐条单独执行
-- 可重复执行（create or replace / 幂等 revoke+grant）
-- 依赖：lesson_feedback 表、profiles 表、is_mentor() 函数（均已存在）
-- ============================================================

-- 1. 管理员反馈明细函数：一次返回反馈 + 提交者昵称/角色
--    排序与条数与原 FeedbackPage 逻辑一致（created_at 倒序，5000 条）
create or replace function public.admin_feedback_list()
returns table (
  lesson_id   text,
  user_id     uuid,
  helpful     boolean,
  created_at  timestamptz,
  author_name text,
  author_role text
)
language sql
security definer
set search_path = ''
stable
as $$
  select f.lesson_id, f.user_id, f.helpful, f.created_at,
         p.nickname, p.role
  from public.lesson_feedback f
  left join public.profiles p on p.id = f.user_id
  where public.is_mentor()
  order by f.created_at desc
  limit 5000
$$;

-- 2. 收紧执行权：默认授给 PUBLIC，必须从 PUBLIC 收（见文件头 v2 教训）。
--    v3 教训（2026-08-18 实测）：只收 PUBLIC 不够 —— 若函数曾被显式
--    grant 给 anon（排障时按报错 hint 仿写很容易踩），直接授权不会随
--    PUBLIC 一起失效，须一并收回。proacl 里出现 anon=X 即此情况。
revoke execute on function public.admin_feedback_list() from public;
revoke execute on function public.admin_feedback_list() from anon;
grant execute on function public.admin_feedback_list() to authenticated;

-- ============================================================
-- 前端配套（本仓库）：
--   components/dashboard/FeedbackPage.vue → supabase.rpc('admin_feedback_list')
--   components/LessonFeedback.vue        → 回显查询去掉无权限的 created_at
--
-- 验证（2026-08-18 已实测通过）：
--   1) 未登录 / anon key 调 POST /rest/v1/rpc/admin_feedback_list
--      → 42501 permission denied；
--   2) 导师或管理员登录 dashboard → 反馈分析页数据恢复；
--   3) 普通学员登录 → 反馈分析页同样拿不到数据（is_mentor 为
--      false，返回空集；dashboard 本身也有登录门禁）。
--   权限自检 SQL（anon 应为 false，authenticated 应为 true）：
--   select has_function_privilege('anon','public.admin_feedback_list()','EXECUTE'),
--          has_function_privilege('authenticated','public.admin_feedback_list()','EXECUTE');
--
-- Advisor 影响：新增 1 条「authenticated 可执行 security definer
--   函数」警告（与 is_mentor 同类，接受）。
-- ============================================================
