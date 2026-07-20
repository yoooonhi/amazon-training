-- ======================================================================
-- 修复 skills slug 提取 bug
-- ======================================================================
-- 问题：
--   skills/ 是扁平结构（skills/excel-for-ops.md），不像 playbooks 有子目录。
--   原函数 substring(path from '^skills/([^/]+)') 会匹配到 'excel-for-ops.md'
--   （含 .md 后缀），导致 v_slug = 'excel-for-ops' 判定失败，
--   excel-for-ops（会员专属）的保护失效，退回到「任意登录可见」。
--
-- 修复：去掉 .md 后缀后再比较。
-- 用 drop + recreate function 最稳妥。
--
-- 在 Dashboard SQL Editor 整段执行（会覆盖原函数，RLS 策略不用重建）。
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
      -- 提取 slug 并去掉 .md 后缀（skills/excel-for-ops.md → excel-for-ops）
      v_slug := substring(path_text from '^skills/([^/]+)');
      v_slug := replace(v_slug, '.md', '');
      if v_slug = 'excel-for-ops' then
        return coalesce(v_is_member, false);
      end if;
      if v_slug = 'domain-basics' then
        return true;
      end if;
      return v_role is not null;
    end if;

    return false;
  exception when others then
    return false;
  end;
end;
$$;
