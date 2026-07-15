-- ============================================================
-- 课程等级授权 · course_access 表 + RLS
-- ============================================================
-- 用途：导师给指定学员单独开放某个等级的课程权限。
--       普通学员默认只能看 publicLevels（入门），被授权后可看对应等级。
--       导师（mentor/admin）始终可看全部，不受此表控制。
--
-- 使用方法：Supabase 控制台 → SQL Editor → 粘贴执行 → Run
-- 可重复执行（带 if not exists / drop policy if exists）
--
-- 依赖：已有的 auth.users、profiles（role 字段区分 mentor/student/admin）
-- ============================================================

-- --------------------------------------------------------
-- 表：course_access
-- --------------------------------------------------------
create table if not exists course_access (
  user_id    uuid not null,                   -- 学员 id（对应 profiles.id）
  level      text not null,                   -- 课程等级：初级 / 中级 / 高级 / 进阶
  granted_by uuid,                            -- 授权操作的导师 id（审计用）
  created_at timestamptz not null default now(),
  primary key (user_id, level)                -- 一个学员一个等级只有一条记录
);

create index if not exists course_access_user_idx on course_access (user_id);

-- ============================================================
-- RLS：本人读自己 + 导师读全部 + 仅导师写
-- ============================================================
alter table course_access enable row level security;

-- 读取：学员读自己的授权 + 导师读所有人的
drop policy if exists "course_access read" on course_access;
create policy "course_access read"
  on course_access for select
  using (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and role in ('mentor','admin'))
  );

-- 写入（insert/update/delete）：仅导师
drop policy if exists "course_access write mentor" on course_access;
create policy "course_access write mentor"
  on course_access for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('mentor','admin')))
  with check (exists (select 1 from profiles where id = auth.uid() and role in ('mentor','admin')));

-- 说明：
-- 1. 主键 (user_id, level) 防重复授权，导师重复点"授权"用 upsert 即可。
-- 2. 取消授权 = delete 对应行。
-- 3. granted_by 记录哪个导师授权的，审计追溯用。
-- 4. 导师判定统一用 role in ('mentor','admin')，与 accessControl.ts 的 isMentorRole 一致。
