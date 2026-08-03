-- ============================================================
-- comments 表状态变更触发器（置顶/精选时间记录）
-- ============================================================
-- 用途：当 is_pinned / is_featured 被切换时，自动刷新 updated_at。
--       这样 updated_at 就记录了「状态变化时间」，用于「被置顶/被精选」的提醒判断。
--
-- 注意：触发器只在 is_pinned / is_featured 真正变化时才刷新 updated_at，
--       避免其他无关 update（如未来可能的内容编辑）污染时间戳。
--
-- 使用方法：Supabase 控制台 → SQL Editor → 粘贴执行 → Run
-- 可重复执行（带 drop if exists）
--
-- 依赖：已有的 comments 表（docs/supabase-comments-setup.sql）
-- ============================================================

-- 1. 触发器函数：比较 NEW 和 OLD 的 is_pinned / is_featured，有变化才刷新 updated_at
create or replace function public.touch_comment_updated_at()
returns trigger
language plpgsql
as $$
begin
  -- 仅当置顶或精选状态发生变化时，才刷新 updated_at
  if coalesce(NEW.is_pinned, false) is distinct from coalesce(OLD.is_pinned, false)
     or coalesce(NEW.is_featured, false) is distinct from coalesce(OLD.is_featured, false) then
    NEW.updated_at := now();
  end if;
  return NEW;
end;
$$;

-- 2. 触发器：在 comments 表 update 之前调用上面的函数
drop trigger if exists trg_comment_touch_updated on public.comments;
create trigger trg_comment_touch_updated
  before update on public.comments
  for each row
  execute function public.touch_comment_updated_at();

-- 说明：
-- 1. 用 is distinct from 而不是 <>，正确处理 NULL（虽然字段有默认值，稳妥起见）。
-- 2. 其他字段（content 等）的 update 不会刷新 updated_at，避免污染。
-- 3. 之后查询「被置顶/被精选」= 我的评论里 updated_at > 上次查看时间 且对应字段为 true。
