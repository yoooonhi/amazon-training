-- ============================================================
-- 实战手册授权 · playbook_access 表 + RLS
-- ============================================================
-- 用途：导师给指定学员单独开放某本「实战手册」的阅读权限。
--       默认只有 mentor/admin 能看 playbook 栏目（广告打法手册、「真实」运营实战经验）；
--       被授权的学员可看对应手册，管理员始终全开。
--
-- 使用方法：Supabase 控制台 → SQL Editor → 粘贴执行 → Run
-- 可重复执行（带 if not exists / drop policy if exists）
--
-- 依赖：已有的 auth.users、profiles（role 字段区分 mentor/student/admin）
-- 配套：还需执行 supabase/migrations/004-playbook-access.sql 更新 Storage RLS 函数
-- ============================================================

-- --------------------------------------------------------
-- 表：playbook_access
-- --------------------------------------------------------
create table if not exists playbook_access (
  user_id    uuid not null,                   -- 学员 id（对应 profiles.id）
  playbook   text not null,                   -- 手册 slug：ads-16-tactics / ops-experience
  granted_by uuid,                            -- 授权操作的导师 id（审计用）
  created_at timestamptz not null default now(),
  primary key (user_id, playbook)             -- 一个学员一本手册只有一条记录
);

create index if not exists playbook_access_user_idx on playbook_access (user_id);

-- ============================================================
-- RLS：本人读自己 + 导师读全部 + 仅导师写
-- （与 course_access 同构，统一用 role in ('mentor','admin') 判定导师）
-- ============================================================
alter table playbook_access enable row level security;

-- 读取：学员读自己的授权 + 导师读所有人的
drop policy if exists "playbook_access read" on playbook_access;
create policy "playbook_access read"
  on playbook_access for select
  using (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and role in ('mentor','admin'))
  );

-- 写入（insert/update/delete）：仅导师
drop policy if exists "playbook_access write mentor" on playbook_access;
create policy "playbook_access write mentor"
  on playbook_access for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('mentor','admin')))
  with check (exists (select 1 from profiles where id = auth.uid() and role in ('mentor','admin')));

-- 说明：
-- 1. 主键 (user_id, playbook) 防重复授权，导师重复点"授权"用 upsert 即可。
-- 2. playbook 字段存手册 slug（ads-16-tactics / ops-experience），与 lib/curriculum.ts 的 PLAYBOOK_SLUGS 一致。
-- 3. 取消授权 = delete 对应行。
-- 4. granted_by 记录哪个导师授权的，审计追溯用。
-- 5. 导师判定统一用 role in ('mentor','admin')，与 accessControl.ts 的 isMentorRole 一致。
