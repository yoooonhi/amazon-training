-- ============================================================
-- 课程「本文是否对你有帮助」反馈功能 · Supabase 建表 + RLS 脚本
-- ============================================================
-- 使用方法：
--   1. 登录 Supabase 控制台 → SQL Editor → New query
--   2. 整份粘贴本文件 → Run
--   3. 可重复执行（带 if not exists）
--
-- 依赖：已有的 auth.users、profiles（role 字段区分 mentor/student）
-- 业务规则：每个登录用户对每节课最多保留一条反馈（有帮助/无帮助）。
--   该约束由复合主键 (lesson_id, user_id) 在数据库层强保证：
--   - 点一次 → insert
--   - 再点同一项 → delete（取消反馈）
--   - 点另一项 → delete 旧的 + insert 新的（切换选择）
--   与 comment_likes 的点赞/取消点赞交互完全一致。
-- ============================================================

-- --------------------------------------------------------
-- 表：lesson_feedback —— 课程反馈（可取消、可切换）
--   helpful = true  → 有帮助
--   helpful = false → 无帮助
--   复合主键 (lesson_id, user_id) 保证每用户每课最多一条
-- --------------------------------------------------------
create table if not exists lesson_feedback (
  lesson_id   text not null,                                       -- 复用现有 lessonId（如 m4-04）
  user_id     uuid not null references auth.users(id) on delete cascade,
  helpful     boolean not null,                                    -- true=有帮助 false=无帮助
  created_at  timestamptz not null default now(),
  primary key (lesson_id, user_id)
);

create index if not exists lesson_feedback_lesson_idx on lesson_feedback(lesson_id);
create index if not exists lesson_feedback_user_idx   on lesson_feedback(user_id);

-- ============================================================
-- 行级安全 RLS（反馈属运营数据，仅本人 + 管理员可见）
-- ============================================================

alter table lesson_feedback enable row level security;

-- 读取：本人能看自己的（用于回显已选状态）+ 导师/管理员能看全部
drop policy if exists "feedback read own"    on lesson_feedback;
create policy "feedback read own"    on lesson_feedback for select
  using (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and role in ('mentor', 'admin'))
  );

-- 新增：登录用户只能用自己身份提交
drop policy if exists "feedback insert own"  on lesson_feedback;
create policy "feedback insert own"  on lesson_feedback for insert
  with check (auth.uid() = user_id);

-- 取消反馈：用户可撤销自己的反馈（再点当前已选项即取消，或点另一项切换选择）
-- 与 comment_likes 的点赞/取消点赞完全一致，无需额外 update 权限。
drop policy if exists "feedback delete own" on lesson_feedback;
create policy "feedback delete own" on lesson_feedback for delete
  using (auth.uid() = user_id);

-- 不开放 update —— 改选走「删除旧记录 + 插入新记录」，靠 delete + insert 两步实现。

-- ============================================================
-- 说明
-- ============================================================
-- 1. 复合主键 (lesson_id, user_id) 保证每用户每课最多一条反馈。
--    交互走 delete + insert 两步：
--      - 取消反馈（再点当前项）= delete
--      - 切换选择（点另一项）  = delete 旧 + insert 新
--    并发重复 insert 会被数据库拒掉（抛 23505 unique_violation），前端捕获后回查回显。
-- 2. 删除用户时，该用户的全部反馈会随 auth.users 级联清除。
-- 3. RLS 真隔离：即便 anon key 泄露，匿名/伪造身份既看不到他人反馈，也无法替他人提交或取消。
