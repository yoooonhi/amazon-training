-- ============================================================
-- 后台「访问分析」聚合 RPC · visit_stats（2026-08-19）
-- ============================================================
-- 背景：VisitsPage.vue 原实现一次拉取 site_visits 最近 5000 条，
--   在浏览器里逐条数出 PV/UV/趋势/Top10/登录占比。但 Supabase 托管
--   PostgREST 有服务端硬上限 db-max-rows=1000（单次查询最多返回
--   1000 行，客户端 limit(5000) 无效，且是静默截断不报错）——
--   site_visits 突破 1000 条后，「总访问(PV)」恒等于 1000，其余
--   指标也只基于最近 1000 条计算。
--
-- 方案：聚合全部下推到服务端（count/group by 在库内完成，只回传
--   十几个数字），单次 RPC 返回全量统计，天然不受行数上限影响。
--   与 admin_feedback_list() 同一模式（docs/supabase-admin-feedback-rpc.sql）。
--
-- 安全设计（照搬 admin_feedback_list 的口径）：
--   1) security definer + 内嵌 public.is_mentor() 判定：
--      非导师/管理员调用 → 返回空集（PostgREST 拿到 null），无泄露；
--   2) set search_path = ''：消除 function_search_path_mutable 警告，
--      函数体内所有引用显式带 public. 前缀；
--   3) EXECUTE 权限：从 PUBLIC 收回（v2 教训），再授予 authenticated；
--      游客调 /rpc/visit_stats → 42501。
--
-- 口径说明：
--   · 趋势/今日按 Asia/Shanghai 时区切日（站点受众与后台使用者
--     均在国内；原前端实现按浏览器本地时区切日，对国内用户等价）；
--   · top_paths 为全时段 Top10（原实现同样只看拉到的样本，改为
--     全量后数字只会更准）。
--
-- 使用方法：Supabase 控制台 → SQL Editor → 逐条单独执行
-- 可重复执行（create or replace / 幂等 revoke+grant）
-- 依赖：site_visits 表、is_mentor() 函数（均已存在）
-- ============================================================

-- 1. 访问统计聚合函数：一次返回全部指标
create or replace function public.visit_stats()
returns json
language sql
security definer
set search_path = ''
stable
as $$
  select json_build_object(
    'total', (select count(*) from public.site_visits),
    'uv', (select count(distinct visitor_id) from public.site_visits),
    'today', (
      select count(*) from public.site_visits
      where (created_at at time zone 'Asia/Shanghai')::date
            = (now() at time zone 'Asia/Shanghai')::date
    ),
    'trend', (
      select coalesce(json_agg(t), '[]'::json) from (
        select to_char((created_at at time zone 'Asia/Shanghai')::date, 'YYYY-MM-DD') as day,
               count(*) as count
        from public.site_visits
        where (created_at at time zone 'Asia/Shanghai')::date
              >= ((now() at time zone 'Asia/Shanghai')::date - 13)
        group by 1
      ) t
    ),
    'top_paths', (
      select coalesce(json_agg(p), '[]'::json) from (
        select path, count(*) as count
        from public.site_visits
        where page_type = 'lesson' and path is not null
        group by path
        order by count(*) desc
        limit 10
      ) p
    ),
    'logged', (select count(*) from public.site_visits where is_logged_in),
    'guest', (select count(*) from public.site_visits where not coalesce(is_logged_in, false))
  )
  where public.is_mentor()
$$;

-- 2. 收紧执行权：默认授给 PUBLIC，必须从 PUBLIC 收（见 admin_feedback_list v2 教训）；
--    若曾被显式 grant 给 anon，也一并收回（v3 教训）。
revoke execute on function public.visit_stats() from public;
revoke execute on function public.visit_stats() from anon;
grant execute on function public.visit_stats() to authenticated;

-- ============================================================
-- 前端配套（本仓库）：
--   components/dashboard/VisitsPage.vue → supabase.rpc('visit_stats')
--   （不再直查 site_visits 表，模板与指标口径不变）
--
-- 验证清单（执行后逐项核对）：
--   1) 未登录 / anon key 调 POST /rest/v1/rpc/visit_stats → 42501；
--   2) 导师或管理员登录 dashboard → 访问分析页「总访问(PV)」
--      跳出 1000，恢复为真实总数（site_visits 全量 count）；
--   3) 普通学员登录 → 页面提示「仅导师/管理员可查看访问统计」。
--   权限自检 SQL（anon 应为 false，authenticated 应为 true）：
--   select has_function_privilege('anon','public.visit_stats()','EXECUTE'),
--          has_function_privilege('authenticated','public.visit_stats()','EXECUTE');
--
-- Advisor 影响：新增 1 条「authenticated 可执行 security definer
--   函数」警告（与 is_mentor / admin_feedback_list 同类，接受）。
-- ============================================================
