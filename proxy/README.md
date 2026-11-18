# api.pipishou.top 反代（Vercel）

解决 `*.supabase.co` 在大陆被 SNI 阻断导致登录报 "Load failed" 的问题。
请求走自有域名 → Vercel Edge → Supabase，SNI 换成 `api.pipishou.top` 不再命中黑名单。

## 目录用途

- `api/proxy.js`：全路径反代函数（edge runtime），透传 /auth/v1、/rest/v1、/storage/v1
- `vercel.json`：所有路径 rewrite 到函数
- 主仓库构建（VitePress → GitHub Pages）完全不经过本目录

## 首次部署（已完成的话忽略）

1. vercel.com 用 GitHub 登录 → Add New Project → Import `amazon-training` 仓库
2. **Root Directory 选 `proxy`**，Framework Preset 选 Other，Build/Install Command 留空 → Deploy
3. Vercel 项目 Settings → Domains → 添加 `api.pipishou.top`，按提示在阿里云 DNS 加记录：
   - 类型 CNAME，主机记录 `api`，记录值 `cname.vercel-dns.com`
4. 验证：`curl https://api.pipishou.top/auth/v1/health` 返回 `{"name":"GoTrue"...}` 即通

## 换上游 / 换平台

上游地址硬编码在 `api/proxy.js` 的 `UPSTREAM`（与 `lib/supabase.ts` 的 supabaseUrl 保持同步）。
