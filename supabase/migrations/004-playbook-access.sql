-- ======================================================================
-- 实战手册按用户授权（playbook_access）
-- ======================================================================
-- 改动：can_access_course_path 的 playbooks/% 分支，由「仅管理员」改为
--       「管理员全开，或该用户在 playbook_access 表里被授权了对应手册」。
--
-- 前置：先执行 docs/supabase-playbook-access-setup.sql 建 playbook_access 表。
-- 在 Dashboard SQL Editor 整段执行（会覆盖原函数，RLS 策略不用重建）。
--
-- slug 提取：playbooks/ads-16-tactics/01-xxx.md → ads-16-tactics
--           （取 playbooks/ 后第一个 / 之前的部分，与 lib/curriculum.ts 的 PLAYBOOK_SLUGS 一致）
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
  v_pb_slug       text;
  v_has_pb        boolean := false;
begin
  begin
    if path_text is null then
      return false;
    end if;

    if user_uid is not null then
      select p.role, p.is_member
        into v_role, v_is_member
        from public.profiles p
        where p.id = user_uid;

      select array_agg(ca.level)
        into v_access_levels
        from public.course_access ca
        where ca.user_id = user_uid;
      if v_access_levels is null then
        v_access_levels := '{}';
      end if;
    end if;

    -- 1. 实战手册：管理员全开，否则查 playbook_access 是否授权了对应手册
    if path_text like 'playbooks/%' then
      if (v_role = 'mentor' or v_role = 'admin') then
        return true;
      end if;
      -- 提取手册 slug：playbooks/ads-16-tactics/01-xxx.md → ads-16-tactics
      v_pb_slug := substring(path_text from '^playbooks/([^/]+)');
      if v_pb_slug is null then
        return false;
      end if;
      select exists(
        select 1 from public.playbook_access pa
        where pa.user_id = user_uid and pa.playbook = v_pb_slug
      ) into v_has_pb;
      return coalesce(v_has_pb, false);
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
      -- 提取 slug 并去掉 .md 后缀（skills/excel-for-ops.md → excel-for-ops）
      v_slug := substring(path_text from '^skills/([^/]+)');
      v_slug := replace(v_slug, '.md', '');
      if v_slug = 'domain-basics' then
        return true;
      end if;
      -- 其余技能课（含 excel-for-ops）：登录即可访问
      return v_role is not null;
    end if;

    return false;
  exception when others then
    return false;
  end;
end;
$$;
