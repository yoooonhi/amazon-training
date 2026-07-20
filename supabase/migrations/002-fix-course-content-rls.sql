-- ======================================================================
-- 修复版 RLS 函数（解决登录用户也被拒绝的 bug）
-- ======================================================================
-- 问题根因：
--   原函数在 security definer + 某些 RLS 上下文下，select from profiles
--   可能返回空或抛异常，导致函数返回 null（被 RLS 当 false）。
--
-- 修复策略：
--   1. 用 LEFT JOIN 一次性把 profile + access_levels 查出来，避免多次查询
--   2. 用 exception 块兜底，任何异常都返回 false（绝不返回 null）
--   3. 显式处理 user_uid is null 的情况（未登录直接走到对应分支）
--
-- 在 Dashboard SQL Editor 整段执行（会覆盖原函数）。
-- ======================================================================

create or replace function public.can_access_course_path(
  path_text text,
  user_uid  uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role          text := null;
  v_is_member     boolean := null;
  v_access_levels text[] := '{}';
  v_slug          text;
  v_count         integer;
begin
  begin
    if path_text is null then
      return false;
    end if;

    -- 一次性把 profile 查出来（LEFT JOIN 避免多次查询）
    if user_uid is not null then
      select p.role, p.is_member
        into v_role, v_is_member
        from public.profiles p
        where p.id = user_uid;

      -- 等级授权列表（用户可能没记录，用 LEFT 查）
      select array_agg(ca.level)
        into v_access_levels
        from public.course_access ca
        where ca.user_id = user_uid;
      if v_access_levels is null then
        v_access_levels := '{}';
      end if;
    end if;

    -- 1. 实战手册：仅管理员
    if path_text like 'playbooks/%' then
      return (v_role = 'mentor' or v_role = 'admin');
    end if;

    -- 2. 主课程五级
    if path_text like 'modules/%' then
      return true;
    end if;
    if path_text like 'beginner/%' then
      if (v_role = 'mentor' or v_role = 'admin') then return true; end if;
      return '初级' = any(v_access_levels);
    end if;
    if path_text like 'intermediate/%' then
      if (v_role = 'mentor' or v_role = 'admin') then return true; end if;
      return '中级' = any(v_access_levels);
    end if;
    if path_text like 'advanced/%' then
      if (v_role = 'mentor' or v_role = 'admin') then return true; end if;
      return '高级' = any(v_access_levels);
    end if;
    if path_text like 'expert/%' then
      if (v_role = 'mentor' or v_role = 'admin') then return true; end if;
      return '进阶' = any(v_access_levels);
    end if;

    -- 3. 技能补给站
    if path_text like 'skills/%' then
      if (v_role = 'mentor' or v_role = 'admin') then return true; end if;
      v_slug := substring(path_text from '^skills/([^/]+)');
      if v_slug = 'excel-for-ops' then
        return coalesce(v_is_member, false);
      end if;
      if v_slug = 'domain-basics' then
        return true;
      end if;
      return v_role is not null;
    end if;

    -- 其它未知路径：默认拒绝
    return false;
  exception when others then
    -- 任何异常都返回 false（绝不返回 null，否则 RLS 行为不可预期）
    return false;
  end;
end;
$$;

-- 重新建策略（确保用上新函数）
drop policy if exists "course_content_read_by_permission" on storage.objects;
create policy "course_content_read_by_permission"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'course-content'
    and public.can_access_course_path(name, auth.uid())
  );

drop policy if exists "course_content_write_by_admin" on storage.objects;
create policy "course_content_write_by_admin"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'course-content'
    and public.can_access_course_path(name, auth.uid())
    and auth.uid() in (select id from public.profiles where role in ('mentor', 'admin'))
  )
  with check (
    bucket_id = 'course-content'
    and auth.uid() in (select id from public.profiles where role in ('mentor', 'admin'))
  );
