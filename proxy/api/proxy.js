// api.pipishou.top → Supabase 全路径反向代理
//
// 背景：*.supabase.co 在大陆直连网络被 SNI 阻断（TLS Client Hello 即被 reset），
// 学生登录报 Safari "Load failed" / Chrome "Failed to fetch"。
// 方案：请求改走自有域名 api.pipishou.top（Vercel Edge），SNI 不再命中黑名单，
// 本函数把 /auth/v1、/rest/v1、/storage/v1 等所有路径原样转发到 Supabase 项目。
export const config = { runtime: 'edge' }

const UPSTREAM = 'https://aljylrkepzwldvaslyfr.supabase.co'

export default async function handler(request) {
  const { pathname, search } = new URL(request.url)
  const upstream = new URL(pathname + search, UPSTREAM)

  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.delete('accept-encoding') // 让 fetch 自行协商压缩
  headers.delete('cdn-loop') // 防 CDN 回环

  // 登录/查询 body 都是小 JSON，整体读入避免流式 body 的运行时兼容问题
  const hasBody = !['GET', 'HEAD'].includes(request.method)
  const body = hasBody ? await request.arrayBuffer() : undefined

  const resp = await fetch(upstream, {
    method: request.method,
    headers,
    body,
    redirect: 'manual',
  })

  // fetch 已自动解压，这三个头与实际 body 不再匹配，必须剔除
  const outHeaders = new Headers(resp.headers)
  outHeaders.delete('content-encoding')
  outHeaders.delete('content-length')
  outHeaders.delete('transfer-encoding')

  return new Response(resp.body, { status: resp.status, headers: outHeaders })
}
