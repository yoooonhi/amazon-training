#!/usr/bin/env node
/**
 * 迁移脚本：把本地 content/playbooks/ads-16-tactics/ 下的 markdown 上传到
 * Supabase Storage 的 course-content bucket。
 *
 * 用法：
 *   1. 确保已先在 Supabase Dashboard 执行 supabase/migrations/001-course-content-rls.sql
 *      （建好 course-content bucket + RLS）
 *   2. 把你的 service_role key 填到下面的 SERVICE_ROLE_KEY（或用环境变量 SUPABASE_SERVICE_ROLE_KEY）
 *      ⚠️ service_role key 拥有完全权限，切勿提交到 git！脚本读完后不会持久化。
 *   3. node scripts/migrate-playbooks.mjs
 *
 * 脚本只做上传，不改本地文件（壳化本地 .md 是另一回事，由你手动或后续脚本处理）。
 * 可重复执行（upsert）。
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// ===== 配置 =====
const SUPABASE_URL = 'https://aljylrkepzwldvaslyfr.supabase.co'
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '在此粘贴你的 service_role key（Project Settings → API → service_role secret）'

const BUCKET = 'course-content'
// ⚠️ 源目录：原始正文备份在 .archive/（content/ 下的已被改成壳）。
// 如果还没有备份（首次迁移其他栏目），把这里改成对应的 content 子目录。
const LOCAL_DIR = '.archive/playbooks-original'
// Storage 内的路径前缀（与 URL 一一对应）
const STORAGE_PREFIX = 'playbooks/ads-16-tactics'

if (SERVICE_ROLE_KEY.startsWith('在此粘贴')) {
  console.error('✗ 请先在脚本顶部填写 SUPABASE_SERVICE_ROLE_KEY，或设置环境变量 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

async function uploadOne(fileName) {
  const localPath = join(LOCAL_DIR, fileName)
  const storagePath = `${STORAGE_PREFIX}/${fileName}`
  // 用 Buffer 取真实字节数（中文 UTF-8 一个字符 3 字节，.length 只算字符数会偏小）
  const buf = readFileSync(localPath)
  const content = buf.toString('utf-8')

  const { error } = await supabase
    .storage
    .from(BUCKET)
    .upload(storagePath, new Blob([content], { type: 'text/markdown' }), {
      upsert: true,
      contentType: 'text/markdown; charset=utf-8',
    })

  if (error) {
    console.error(`  ✗ ${fileName}: ${error.message}`)
    return false
  }
  console.log(`  ✓ ${fileName} → ${storagePath} (${(buf.length / 1024).toFixed(1)} KB)`)
  return true
}

async function main() {
  console.log(`迁移 playbooks → Supabase Storage`)
  console.log(`  本地目录: ${LOCAL_DIR}`)
  console.log(`  Storage : ${BUCKET}/${STORAGE_PREFIX}/`)
  console.log('')

  const files = readdirSync(LOCAL_DIR).filter((f) => f.endsWith('.md'))
  console.log(`发现 ${files.length} 个 md 文件：${files.join(', ')}`)
  console.log('')

  let ok = 0
  let fail = 0
  for (const f of files) {
    const success = await uploadOne(f)
    if (success) ok++
    else fail++
  }

  console.log('')
  console.log(`完成：成功 ${ok} / 失败 ${fail}`)
  if (fail > 0) process.exit(1)

  // 验证：列一下 bucket 里的文件
  console.log('')
  console.log('验证：列出 Storage 中的文件')
  const { data, error } = await supabase.storage.from(BUCKET).list(STORAGE_PREFIX)
  if (error) {
    console.error('  列表失败：', error.message)
  } else {
    data.forEach((f) => console.log(`  - ${STORAGE_PREFIX}/${f.name} (${(f.metadata?.size / 1024).toFixed(1) || '?'} KB)`))
  }
}

main().catch((e) => {
  console.error('迁移异常：', e)
  process.exit(1)
})
