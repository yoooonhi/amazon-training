/**
 * 从 VitePress sidebar 数据生成「Storage path → 带序号标题」的映射
 *
 * sidebar 数据在运行时通过 useData().themeConfig.sidebar 获取
 * （config.ts 不能被前端直接 import，因为它的 defineConfig 来自 node 端的 vitepress）
 */

type SidebarItem = {
  text?: string
  link?: string
  items?: SidebarItem[]
}

/**
 * 递归 flatten sidebar，返回 storagePath → text 的映射
 * @param sidebarObj themeConfig.sidebar 对象，形如 { '/content/': [...] }
 */
export function buildSidebarTitleMap(sidebarObj: any): Map<string, string> {
  const map = new Map<string, string>()
  if (!sidebarObj) return map

  // sidebar 可能是对象（按路径分组）或数组
  const allItems: SidebarItem[] = []
  if (Array.isArray(sidebarObj)) {
    allItems.push(...sidebarObj)
  } else {
    for (const key of Object.keys(sidebarObj)) {
      const group = sidebarObj[key]
      if (Array.isArray(group)) allItems.push(...group)
    }
  }

  function walk(list: SidebarItem[]) {
    for (const item of list) {
      if (item.link && item.text) {
        // link 形如 '/content/beginner/b1-ads-optimization/01-search-term-attribution'
        // 转成 Storage key 'beginner/b1-ads-optimization/01-search-term-attribution.md'
        let key = item.link
        if (key.startsWith('/content/')) key = key.slice('/content/'.length)
        key = key.replace(/\/$/, '')
        // index 页：link 以 / 结尾，对应 Storage 的 index.md
        if (item.link.endsWith('/') && !key.endsWith('/index')) {
          key = key + '/index'
        }
        map.set(key + '.md', item.text)
      }
      if (item.items) walk(item.items)
    }
  }
  walk(allItems)
  return map
}
