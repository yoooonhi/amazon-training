#!/usr/bin/env node
/**
 * 通用内容迁移脚本（方案 2）
 *
 * 把指定的受保护课程目录下的 markdown：
 *   1. 备份原始正文到 .archive/<目录>/（不进 git，本地留底）
 *   2. 上传正文到 Supabase Storage（course-content bucket），保留目录结构
 *   3. 把本地 .md 替换成「壳文件」（frontmatter + <RemoteLesson>）
 *
 * 用法：
 *   SUPABASE_SERVICE_ROLE_KEY="你的key" node scripts/migrate-content.mjs
 *
 * 默认迁移所有受保护目录（见 TARGETS）。
 * 可重复执行（upsert + 备份覆盖 + 壳化幂等）。
 *
 * ⚠️ service_role key 切勿提交到 git！脚本不会持久化它。
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'

// ===== 配置 =====
const SUPABASE_URL = 'https://aljylrkepzwldvaslyfr.supabase.co'
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '在此粘贴你的 service_role key（Project Settings → API → service_role secret）'

const BUCKET = 'course-content'
const PROJECT_ROOT = process.cwd()

// 要迁移的目录（content/ 下的相对路径）
// 不含 modules/（入门课全员公开）、不含 skills/domain-basics.md（全员公开）
const TARGETS = [
  'content/beginner',
  'content/intermediate',
  'content/advanced',
  'content/expert',
  'content/skills', // 脚本会单独跳过 domain-basics
]
// 不迁移的文件名（全员公开课，留在仓库）
const SKIP_FILES = ['domain-basics.md']

if (SERVICE_ROLE_KEY.startsWith('在此粘贴')) {
  console.error('✗ 请先设置环境变量 SUPABASE_SERVICE_ROLE_KEY')
  console.error('  SUPABASE_SERVICE_ROLE_KEY="..." node scripts/migrate-content.mjs')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// 收集所有要迁移的 md 文件
function collectFiles(dir, base = dir) {
  const results = []
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      results.push(...collectFiles(full, base))
    } else if (name.endsWith('.md')) {
      if (SKIP_FILES.includes(name)) continue
      // content/ 下的相对路径，去掉 content/ 前缀就是 Storage key
      const relToContent = relative('content', full).replace(/\\/g, '/')
      results.push({
        absPath: full,
        // Storage 里的路径（如 beginner/b1-ads-optimization/01-xxx.md）
        storagePath: relToContent,
      })
    }
  }
  return results
}

// 备份原始正文到 .archive/<顶层目录>/
function backupOriginal(file) {
  const topDir = file.storagePath.split('/')[0] // beginner / intermediate / ...
  const archiveDir = join(PROJECT_ROOT, '.archive', topDir)
  mkdirSync(archiveDir, { recursive: true })
  // 保持子目录结构
  const sub = file.storagePath.split('/').slice(1).join('/')
  const archivePath = join(archiveDir, sub)
  mkdirSync(dirname(archivePath), { recursive: true })
  writeFileSync(archivePath, readFileSync(file.absPath))
  return archivePath
}

// 上传到 Storage
async function uploadToStorage(file) {
  const buf = readFileSync(file.absPath)
  const content = buf.toString('utf-8')
  const { error } = await supabase
    .storage
    .from(BUCKET)
    .upload(file.storagePath, new Blob([content], { type: 'text/markdown' }), {
      upsert: true,
      contentType: 'text/markdown; charset=utf-8',
    })
  if (error) throw new Error(error.message)
  return buf.length
}

// 把本地 .md 改成壳
function writeShell(file) {
  const original = readFileSync(file.absPath, 'utf-8')
  // 提取 frontmatter
  let frontmatter = ''
  let body = original
  if (original.startsWith('---')) {
    const end = original.indexOf('\n---', 3)
    if (end !== -1) {
      frontmatter = original.slice(0, end + 4)
      body = original.slice(end + 4)
    }
  }
  // 检查是否已经是壳（幂等：避免重复执行把壳再壳化）
  if (body.trim().startsWith('<ClientOnly>') || body.includes('<RemoteLesson')) {
    return false // 已经是壳，跳过
  }
  // 在 frontmatter 加 gated + storage_path（如果还没有）
  let newFm = frontmatter
  if (!newFm.includes('gated:')) {
    newFm = newFm.replace(/---\s*$/, `\ngated: true\nstorage_path: ${file.storagePath}\n---`)
  } else if (!newFm.includes('storage_path:')) {
    newFm = newFm.replace(/---\s*$/, `\nstorage_path: ${file.storagePath}\n---`)
  }
  const shell = `${newFm}\n\n<ClientOnly>\n  <RemoteLesson storage-path="${file.storagePath}" />\n</ClientOnly>\n`
  writeFileSync(file.absPath, shell)
  return true
}

async function main() {
  console.log('内容迁移（方案 2）：受保护课程 → Supabase Storage\n')

  // 收集所有文件
  const allFiles = []
  for (const target of TARGETS) {
    const dir = join(PROJECT_ROOT, target)
    if (!existsSync(dir)) {
      console.log(`⚠️  目录不存在，跳过：${target}`)
      continue
    }
    const files = collectFiles(dir)
    console.log(`  ${target}: ${files.length} 个文件`)
    allFiles.push(...files)
  }
  console.log(`\n共 ${allFiles.length} 个文件待迁移\n`)

  let ok = 0
  let fail = 0
  let shellSkipped = 0
  const failed = []

  for (const file of allFiles) {
    process.stdout.write(`  ${file.storagePath} ... `)
    try {
      // 1. 备份
      backupOriginal(file)
      // 2. 上传
      const bytes = await uploadToStorage(file)
      // 3. 壳化
      const shellWritten = writeShell(file)
      console.log(`✓ ${(bytes / 1024).toFixed(1)} KB${shellWritten ? '' : ' (已是壳)'}`)
      ok++
    } catch (e) {
      console.log(`✗ ${e.message}`)
      fail++
      failed.push({ path: file.storagePath, error: e.message })
    }
  }

  console.log(`\n完成：成功 ${ok} / 失败 ${fail}`)
  if (failed.length) {
    console.log('\n失败清单：')
    failed.forEach((f) => console.log(`  - ${f.path}: ${f.error}`))
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('迁移异常：', e)
  process.exit(1)
})
