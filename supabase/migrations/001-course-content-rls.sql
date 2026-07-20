-- ======================================================================
-- 方案 2 · 课程内容后端化 —— Storage 权限基础设施
-- ======================================================================
-- 作用：为 course-content（private）bucket 配置 RLS，
--       让权限校验下沉到数据库层。
--
-- 判定口径与 lib/accessControl.ts 保持一致：
--   - playbooks/  → 仅 mentor / admin
--   - modules/    → 全员（入门课）
--   - beginner/ intermediate/ advanced/ expert/ → 管理员 + 个人授权
--   - skills/     → 按登录态 / 会员专属 / 公开白名单
--
-- 使用：在 Supabase Dashboard → SQL Editor 整段粘贴执行（可重复执行）。
-- ======================================================================

-- 1) 权限判定函数 ------------------------------------------------------
--     IMMUTABLE 不合适（要查表），用 STABLE + SECURITY DEFINER
--     让 anon/authenticated 调用方也能借函数查 profiles/course_access。

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
  v_role          text;
  v_is_member     boolean;
  v_access_levels text[];
  v_slug          text;
begin
  if path_text is null then
    return false;
  end if;

  -- 取用户档案（未登录则全 null）
  select role, is_member
    into v_role, v_is_member
    from public.profiles
    where id = user_uid;

  -- 该用户的等级授权列表
  select array_agg(level)
    into v_access_levels
    from public.course_access
    where user_id = user_uid;
  if v_access_levels is null then
    v_access_levels := '{}';
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

  return false;
end;
$$;

-- 2) Storage bucket ----------------------------------------------------
insert into storage.buckets (id, name, public)
values ('course-content', 'course-content', false)
on conflict (id) do nothing;

-- 3) Storage RLS 策略 --------------------------------------------------

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
