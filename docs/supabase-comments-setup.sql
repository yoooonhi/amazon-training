-- ============================================================
-- 课程评论/问答功能 · Supabase 建表 + RLS 脚本
-- ============================================================
-- 使用方法：
--   1. 登录 Supabase 控制台 → SQL Editor → New query
--   2. 整份粘贴本文件 → Run
--   3. 可重复执行（带 if not exists）
--
-- 依赖：已有的 auth.users、profiles（role 字段区分 mentor/student）
-- ============================================================

-- --------------------------------------------------------
-- 表 1：comments —— 主评论 + 回复统一一张表
--   parent_id 为 NULL = 主评论（提问/讨论）
--   parent_id 指向某条评论 = 对它的回复（回答）
-- --------------------------------------------------------
create table if not exists comments (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     text not null,                                   -- 复用现有 lessonId（如 m4-04）
  user_id       uuid not null references auth.users(id) on delete cascade,
  parent_id     uuid references comments(id) on delete cascade,  -- NULL=主评论，有值=回复
  content       text not null,                                   -- Markdown 源文本
  is_pinned     boolean not null default false,                  -- 导师置顶
  is_featured   boolean not null default false,                  -- 导师精选（已解决/优质回答）
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists comments_lesson_idx     on comments(lesson_id);
create index if not exists comments_parent_idx     on comments(parent_id);
create index if not exists comments_created_idx    on comments(created_at desc);

-- --------------------------------------------------------
-- 表 2：comment_likes —— 点赞（轻量计数）
--   主键 (comment_id, user_id) 天然防重复点赞
-- --------------------------------------------------------
create table if not exists comment_likes (
  comment_id  uuid not null references comments(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists comment_likes_comment_idx on comment_likes(comment_id);

-- ============================================================
-- 行级安全 RLS（评论功能必须开）
-- ============================================================

alter table comments       enable row level security;
alter table comment_likes  enable row level security;

-- ---------- comments 策略 ----------

-- 读取：所有人可见（游客也能看，但只有登录用户能发）
drop policy if exists "comments read"     on comments;
create policy "comments read"     on comments for select using (true);

-- 新增：必须登录，且只能用自己的身份发
drop policy if exists "comments insert"   on comments;
create policy "comments insert"   on comments for insert
  with check (auth.uid() = user_id);

-- 删除：作者删自己的
drop policy if exists "comments delete own"    on comments;
create policy "comments delete own"    on comments for delete
  using (auth.uid() = user_id);

-- 删除：导师删任何人的（role = 'mentor'）
drop policy if exists "comments delete mentor" on comments;
create policy "comments delete mentor" on comments for delete
  using (exists (select 1 from profiles where id = auth.uid() and role = 'mentor'));

-- 更新：仅导师能改（置顶/精选）；作者不能改内容（防止改口）
drop policy if exists "comments update mentor" on comments;
create policy "comments update mentor" on comments for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'mentor'));

-- ---------- comment_likes 策略 ----------

-- 读取：全公开（展示点赞数需要）
drop policy if exists "likes read"   on comment_likes;
create policy "likes read"   on comment_likes for select using (true);

-- 点赞：登录用户可给任意评论点赞
drop policy if exists "likes insert" on comment_likes;
create policy "likes insert" on comment_likes for insert
  with check (auth.uid() = user_id);

-- 取消点赞：只能取消自己的
drop policy if exists "likes delete" on comment_likes;
create policy "likes delete" on comment_likes for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 说明
-- ============================================================
-- 1. 删除评论时，on delete cascade 会自动级联删除它的所有回复和点赞。
-- 2. 删除用户时，该用户的评论、回复、点赞会一并级联清除。
-- 3. RLS 策略是真隔离：即便 anon key 泄露，匿名/伪造身份也无法删改他人评论。
--    前端按钮只是体验控制，真正的安全边界在这里。
