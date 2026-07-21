#!/usr/bin/env node
/**
 * 生成「lessonId → 真实课名 / 课序号」映射，追加到 lib/curriculum.ts
 *
 * 数据源：每节课 markdown frontmatter 的 title: 字段（153 节课全都有）。
 * 之前后台显示 m4-04 这种代号，是因为课名没被采集进数据层。
 *
 * 做两件事：
 *   1. lessonTitles  —— lessonId → 课名（如 'm4-04' → 'BE ACOS'）
 *   2. lessonNumbers —— lessonId → 课序号（如 'm4-04' → '5.4'）
 *      序号 = 模块在课程内的序位(week) + lessonId 第二段(课号)
 *
 * 用法：node scripts/gen-lesson-titles.mjs
 * 可重复执行：每次会替换 curriculum.ts 里两段自动生成的区块。
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, extname } from 'node:path'

const ROOT = process.cwd()
const CURRICULUM_PATH = 'lib/curriculum.ts'

// ============================================================
// 1. 扫描 content/ 下所有 md，提取 path → title
//    path 格式与 pathToLessonId 的 key 一致（去掉 content/ 前缀和 .md）
// ============================================================
const CONTENT_DIRS = ['modules', 'beginner', 'intermediate', 'advanced', 'expert', 'skills', 'playbooks']
const pathToTitle = {} // 'm4-ads/04-be-acos' → 'BE ACOS'

function walkDir(dir) {
  let results = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      results = results.concat(walkDir(full))
    } else if (entry.isFile() && extname(entry.name) === '.md') {
      results.push(full)
    }
  }
  return results
}

function extractTitle(filePath) {
  const content = readFileSync(filePath, 'utf8')
  // 只看文件开头的 frontmatter（--- 包裹）
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) return null
  const titleLine = fmMatch[1].split('\n').find((l) => l.startsWith('title:'))
  if (!titleLine) return null
  // title: BE ACOS  →  BE ACOS（去掉前缀，去引号，去首尾空格）
  return titleLine.replace(/^title:\s*/, '').replace(/^['"]|['"]$/g, '').trim()
}

// 扫描所有 md，记录「相对 content/ 的路径 → title」。
// 之后用多前缀尝试匹配 pathToLessonId 的 key（其 key 格式因栏目而异：
//   modules/ 是 'm1-platform/01-x'（无 modules/ 前缀）
//   skills/  是 'domain-basics'（仅文件名）
//   playbooks/ 是 'ads-16-tactics/index'（含子目录）
// 所以对每个 md 同时记几种 key 形式，匹配哪个用哪个）
const CONTENT_ROOT = join(ROOT, 'content')
const allMd = []
for (const sub of CONTENT_DIRS) {
  const dir = join(CONTENT_ROOT, sub)
  try {
    allMd.push(...walkDir(dir))
  } catch {
    // 目录可能不存在，跳过
  }
}
for (const file of allMd) {
  const title = extractTitle(file)
  if (!title) continue
  // 相对 content/ 的完整路径（含子目录前缀）
  const relFull = file.replace(CONTENT_ROOT + '/', '').replace(/\.md$/, '')
  pathToTitle[relFull] = title
}

// ============================================================
// 2. 读 curriculum.ts，提取 pathToLessonId 表 + curriculum 数组
//    —— 不 import TS，直接用正则解析文本（脚本自洽，不依赖构建）
// ============================================================
const ts = readFileSync(join(ROOT, CURRICULUM_PATH), 'utf8')

// 2a. pathToLessonId:  'm4-ads/04-be-acos': 'm4-04',
const pathToLessonIdBlock = ts.match(/export const pathToLessonId[\s\S]*?^}/m)
const pathLessonRe = /'([^']+)':\s*'([^']+)'/g
const pathToLessonId = {}
let m
while ((m = pathLessonRe.exec(pathToLessonIdBlock[0]))) {
  pathToLessonId[m[1]] = m[2]
}

// 2b. curriculum 数组：解析 level/week/lessons 三元组（靠顺序，模块号=同 level 内第几个）
const curriculumBlock = ts.match(/export const curriculum = \[([\s\S]*?)^\]/m)
// 按 level 边界切分模块
const moduleTexts = curriculumBlock[1]
  .split(/(?=\{[\s\S]*?level:)/)
  .filter((s) => s.includes('level:'))

const levelModuleCount = {} // '入门' → 当前已遇到几个模块
const lessonNumber = {}      // lessonId → 课序号字符串

for (const modText of moduleTexts) {
  const levelM = modText.match(/level:\s*'([^']+)'/)
  const weekM = modText.match(/week:\s*(\d+)/)
  if (!levelM || !weekM) continue
  const level = levelM[1]
  const week = Number(weekM[1])
  // 课序号大号 = week（模块在该等级课程内的序位）
  // 提取本模块所有 lessonId
  const lessonIds = []
  const lidRe = /'([^']+)'/g
  // 只在 lessons: [ ... ] 区块内取
  const lessonsBlock = modText.match(/lessons:\s*\[([\s\S]*?)\]/)
  if (lessonsBlock) {
    let lm
    const re = /'([^']+)'/g
    while ((lm = re.exec(lessonsBlock[1]))) lessonIds.push(lm[1])
  }
  for (const lid of lessonIds) {
    // 课号 = lessonId 第二段（m4-04 → 4；m2-03b → 3b；m1-01-what-is-ops → 1）
    const parts = lid.split('-')
    let courseNum = parts[1] || ''
    // 去掉可能的文件名后缀（如 what-is-ops），只留数字（可能带字母 b）
    const numMatch = courseNum.match(/^(\d+)([a-z]?)/)
    if (numMatch) {
      const num = String(Number(numMatch[1])) // 去前导零：04 → 4，10 → 10
      const letter = numMatch[2] || ''
      lessonNumber[lid] = `${week}.${num}${letter}`
    } else {
      lessonNumber[lid] = `${week}.${courseNum}`
    }
  }
}

// ============================================================
// 3. 组装 lessonTitles：lessonId → 课名
//    主课来自 pathToLessonId + pathToTitle；
//    skill / playbook 已在 curriculum.ts 有 title，复用之（单一数据源）
// ============================================================
const lessonTitles = {}
// skillLessons / playbookLessons 是对象数组，匹配到独占一行的 ] 为止
// （数组声明结尾不带分号）
const skillBlock = ts.match(/export const skillLessons[\s\S]*?\n\]/)?.[0]
if (skillBlock) {
  const re = /\{[^}]*lessonId:\s*'([^']+)'[^}]*title:\s*'([^']+)'[^}]*\}/g
  let sm
  while ((sm = re.exec(skillBlock))) {
    lessonTitles[sm[1]] = sm[2]
  }
}
const pbBlock = ts.match(/export const playbookLessons[\s\S]*?\n\]/)?.[0]
if (pbBlock) {
  const re = /\{[^}]*lessonId:\s*'([^']+)'[^}]*title:\s*'([^']+)'[^}]*\}/g
  let pm
  while ((pm = re.exec(pbBlock))) {
    lessonTitles[pm[1]] = pm[2]
  }
}
// 主课（入门 + 受保护等级）：pathToLessonId 反查
// pathToLessonId 的 key 格式因栏目而异（见上方注释），pathToTitle 的 key 统一含
// 子目录前缀（如 'modules/m1-platform/01-x'）。所以用前缀尝试匹配。
const SUB_PREFIXES = ['modules/', 'beginner/', 'intermediate/', 'advanced/', 'expert/', 'skills/', 'playbooks/', '']
for (const [path, lid] of Object.entries(pathToLessonId)) {
  if (pathToTitle[path]) {
    lessonTitles[lid] = pathToTitle[path]
    continue
  }
  // 尝试补子目录前缀
  for (const prefix of SUB_PREFIXES) {
    const candidate = prefix + path
    if (pathToTitle[candidate]) {
      lessonTitles[lid] = pathToTitle[candidate]
      break
    }
  }
}

// skill / playbook 的序号：skill 用「技能N」，playbook 用「手册N」
if (skillBlock) {
  const ids = [...skillBlock.matchAll(/lessonId:\s*'([^']+)'/g)].map((x) => x[1])
  ids.forEach((id, i) => (lessonNumber[id] = `技能${i + 1}`))
}
if (pbBlock) {
  const ids = [...pbBlock.matchAll(/lessonId:\s*'([^']+)'/g)].map((x) => x[1])
  ids.forEach((id, i) => (lessonNumber[id] = `手册${i + 1}`))
}

// ============================================================
// 4. 输出：替换 curriculum.ts 里两段「自动生成」区块
// ============================================================
const BEGIN = '// ===== 以下由 scripts/gen-lesson-titles.mjs 自动生成，请勿手改 ====='
const END = '// ===== 自动生成区块结束 ====='

function genBlock() {
  const titlesLines = Object.keys(lessonTitles)
    .sort()
    .map((k) => `  '${k}': ${JSON.stringify(lessonTitles[k])},`)
    .join('\n')
  const numbersLines = Object.keys(lessonNumber)
    .sort()
    .map((k) => `  '${k}': '${lessonNumber[k]}',`)
    .join('\n')
  return `${BEGIN}
// lessonId → 真实课名（从各 .md 的 title: frontmatter 扫描得来）
// 重新生成：node scripts/gen-lesson-titles.mjs
export const lessonTitles: Record<string, string> = {
${titlesLines}
}

// lessonId → 课序号（如 'm4-04' → '5.4'），用于后台展示
export const lessonNumbers: Record<string, string> = {
${numbersLines}
}
${END}`
}

let newTs
const blockRe = new RegExp(`${BEGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
if (blockRe.test(ts)) {
  newTs = ts.replace(blockRe, genBlock())
} else {
  // 首次生成：追加到文件末尾
  newTs = ts.replace(/\s*$/, '') + '\n\n' + genBlock() + '\n'
}

writeFileSync(join(ROOT, CURRICULUM_PATH), newTs, 'utf8')

// ============================================================
// 5. 报告
// ============================================================
const missing = Object.keys(pathToLessonId)
  .filter((p) => pathToLessonId[p].startsWith('m') || pathToLessonId[p].startsWith('b') || pathToLessonId[p].startsWith('i') || pathToLessonId[p].startsWith('a') || pathToLessonId[p].startsWith('e'))
  .map((p) => pathToLessonId[p])
  .filter((lid) => !lessonTitles[lid])

console.log(`✓ 生成完成`)
console.log(`  课名映射：${Object.keys(lessonTitles).length} 条`)
console.log(`  课序号映射：${Object.keys(lessonNumber).length} 条`)
console.log(`  写入：${CURRICULUM_PATH}`)
if (missing.length > 0) {
  console.log(`  ⚠ 以下主课未找到 title（md 可能缺 frontmatter）：`)
  missing.forEach((lid) => console.log(`     ${lid}`))
} else {
  console.log(`  全部主课课名已采集 ✓`)
}
