-- ============================================================
-- 付费会员体系：profiles 表新增 is_member 字段
-- ============================================================
-- 作用：
--   1. 给 profiles 加 is_member 布尔字段，标记付费会员身份。
--   2. 加 RLS 策略：只有 mentor / admin 能更新 is_member，
--      学员无法自己把自己改成会员（安全前提）。
--
-- 执行方式：把整段贴进 Supabase Dashboard → SQL Editor → Run。
-- 幂等，可重复执行。
-- ============================================================

-- 1. 加字段（默认非会员）
alter table profiles
  add column if not exists is_member boolean not null default false;

comment on column profiles.is_member is
  '付费会员标记。由导师在后台或本控制台手动置 true。仅 mentor/admin 可更新。';

-- ============================================================
-- 2. RLS 策略：收紧 is_member 的更新权限
-- ============================================================
-- 说明：
--   Supabase 默认的 profiles 更新策略通常允许「用户更新自己的行」。
--   这会导致学员能在浏览器里自己 update is_member = true，绕过付费。
--   下面用一条带 WITH CHECK 的策略，限制 is_member 的写入只能由 mentor/admin 完成。
--
--   实现思路：覆盖 UPDATE 策略——
--     USING：自己或导师能读到旧行（不影响普通字段更新）。
--     WITH CHECK：只有导师能写 is_member；非导师更新时 is_member 必须保持原值。
-- ============================================================

-- 先删可能存在的旧策略（幂等）
drop policy if exists "profiles_update_self_or_mentor" on profiles;
drop policy if exists "profiles_is_member_only_by_mentor" on profiles;

-- 更新策略：本人可改自己的常规字段（昵称等），但 is_member 的变更仅限导师。
-- WITH CHECK 表达式：当操作者不是 mentor/admin 时，要求新行的 is_member 等于旧行的 is_member
-- （即普通用户改昵称时不能顺带改会员状态）。
create policy "profiles_update_self_or_mentor"
  on profiles for update
  using (
    auth.uid() = id
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('mentor', 'admin'))
  )
  with check (
    -- 导师/管理员：任意变更放行
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('mentor', 'admin'))
    -- 非导师本人：只允许在 is_member 保持不变的前提下更新（即不能借改昵称篡改会员状态）
    or (
      auth.uid() = id
      and is_member = (
        select p.is_member from profiles p where p.id = auth.uid()
      )
    )
  );

-- ============================================================
-- 3. （可选）过渡：把现有老学员一键转成会员
-- ============================================================
-- 如果你希望「已有的老用户全部自动成为会员」作为付费上线前的过渡，
-- 取消下面这行注释执行一次；新注册用户仍是非会员。
-- update profiles set is_member = true where role = 'student';
