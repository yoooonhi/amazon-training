---
title: Search Terms
description: 学会写亚马逊后台 Search Terms 隐藏关键词字段，用 250 字节限制塞进尽量多有效的同义词、场景词、人群词和西语法语词，掌握全小写空格分隔、不重复标题词的格式和字节计数方法。
---

# 3.5 Search Terms

> **入门3：Listing搭建基本功**
> **本课目标**：学会写后台 Search Terms，用 250 字节塞进尽量多有效的隐藏关键词

## 这节课解决什么问题

标题、五点装不下的关键词放哪？放后台 Search Terms。这是买家看不到、但 A9 会读取的隐藏关键词字段。写对了，你的 Listing 能被更多搜索词匹配到；写错了，超限直接被亚马逊忽略整段。

## 核心知识

### Search Terms 是什么

Search Terms 是 Listing 后台的一个关键词字段，位置在"关键词"选项卡里。

- **买家看不到**：它不出现在商品页面，只给 A9 算法读。
- **作用**：补全标题和五点没覆盖到的相关搜索词，让你的产品被更多长尾词搜到。
- **本质**：是关键词池的"溢出区"，把所有相关但放不进前台的词塞这里。

### 最重要的规则：250 字节限制

美国站 Search Terms 上限是 **250 字节**（UTF-8 编码）。注意：

| 概念 | 说明 |
|------|------|
| 字节 ≠ 字符 | 英文字母 1 字节，中文/西语特殊字符可能 2-4 字节 |
| 超限后果 | 超过 250 字节，**整段 Search Terms 被亚马逊忽略**，不是只截断超出部分 |
| 必须用工具数 | 肉眼数和实际字节数经常差很多 |

**为什么强调字节**：一个 `é`（法语）是 2 字节，一个中文字是 3 字节。你以为写了 200 个字符，实际可能 400 字节，整段作废。

### 写 Search Terms 的规则

| 规则 | 原因 |
|------|------|
| 全部小写 | 大小写不影响匹配，小写省字节也好管理 |
| 用空格分隔，不用逗号 | 逗号本身占字节，还割裂词组 |
| 不重复标题里已有的词 | 重复不会双重加权，纯属浪费字节 |
| 不写竞品品牌名 | 侵权风险 |
| 不写主观词（best、cheap） | 这些词没人搜，浪费字节 |
| 不写临时促销词（free shipping） | 促销信息不能放关键词字段 |
| 不需要重复单复数 | A9 自动匹配，写一个就够 |

### 常见致命错误

❌ **错误 1：逗号分隔**
> `wireless, earbuds, bluetooth, noise cancelling`

问题：4 个逗号 = 4 字节浪费，而且割裂了词组。正确写法：
> `wireless earbuds bluetooth noise cancelling`

❌ **错误 2：重复标题词**
标题已经写了 "Wireless Earbuds"，Search Terms 又写一遍 "wireless earbuds"。
问题：不会双重加权，纯浪费 16 字节。正确做法：Search Terms 只放标题没有的同义词。

❌ **错误 3：脑数字符超限**
你数了觉得"差不多 240"，实际 UTF-8 算下来 280 字节，整段被忽略。
问题：这是新手最常踩的坑。**永远用工具数，不要用脑子估**。

❌ **错误 4：塞竞品品牌**
> `airpods beats sony bose`

问题：会被亚马逊判定为品牌侵权，轻则删字段，重则下架 Listing。

### 怎么写好 Search Terms

按这个思路填字节：

1. **同义词**：earbuds / earphones / headphones / in-ear
2. **使用场景**：running gym workout office travel sleeping
3. **相关品类**：audiobook podcast music phone call
4. **目标人群**：kids women men senior
5. **西语/法语词**（美国站有大量西语/法语买家）：auriculares inalambricos（西语无线耳机）、écouteurs sans fil（法语无线耳机）

把这些词去重、去标题已有的、按相关性排序，用空格连起来，数到接近 250 字节为止。

### 实例

假设标题是 `SoundCore Wireless Earbuds, Active Noise Cancellation, Bluetooth 5.3, 30H Playtime, IPX7, Black`

那么 Search Terms（避开标题已有的词）可以是：
> `earphones headphones in ear noise reducing bluetooth earbuds for running gym workout android iphone travel commuting podcast audiobooks auriculares inalambricos`

数一下字节，接近 250 就停。

## 实操要点

1. **先列词表，再删重复**：把所有候选词写下来，删掉标题和五点已经出现的。
2. **优先级**：相关性强 > 搜索量适中 > 长尾词。别为了凑字节数塞无关词，会拉低相关性。
3. **用工具数字节**：
   - 亚马逊后台提交时会显示字节数（最准）
   - 在线 UTF-8 字节计数器（搜 "UTF-8 byte counter"）
   - 第三方工具（Helium 10 的 Index Checker 等）
4. **留 5-10 字节余量**：别顶满 250，留点缓冲，避免某个字符算多了导致整段作废。
5. **定期回顾**：上线后看搜索词报表，把没带来曝光的词换掉，把带来转化的相关词补进去。

## 动手练习

接着用你前两节课的产品，给它的 Search Terms 字段填词：

1. 列出 15-20 个相关搜索词（同义词、场景、人群、西语/法语词）。
2. 删掉标题和五点里已经出现的词。
3. 全小写、空格分隔，拼成一段。
4. 用在线 UTF-8 字节计数器数一下，控制在 240 字节以内。
5. 检查：有没有逗号？有没有竞品品牌？有没有重复标题词？

<LessonCheck lessonId="m2-04" :items="['我知道 Search Terms 上限是 250 字节且超限整段作废', '我能用空格分隔、全小写、不重复标题词的格式填写', '我会用字节计数工具而不是脑数来确认没超限']" />

## 自测题

<SelfTest lessonId="m2-04" :questions="[
  { q: '美国站 Search Terms 的字节上限是多少？超限会怎样？', type: 'single', options: ['200 字符，超出部分被截断', '250 字节，超限整段被亚马逊忽略', '500 字节，没有惩罚', '没有限制，越多越好'], answer: 1, explain: '美国站上限 250 字节（UTF-8）。注意是字节不是字符，且超限不是截断而是整段作废——这是新手最容易踩的坑。' },
  { q: '下面哪种 Search Terms 的写法是正确的？', type: 'single', options: ['Wireless, Earbuds, Bluetooth, Noise Cancelling', 'wireless earbuds bluetooth noise cancelling', 'WIRELESS EARBUDS bluetooth noise cancelling', 'wireless earbuds AirPods Beats Sony'], answer: 1, explain: '正确写法是全小写、空格分隔（不用逗号）、不重复。其他三个分别错在用逗号、大小写混乱、塞竞品品牌名（侵权）。' },
  { q: '为什么不能靠「脑数」判断字节数？', type: 'single', options: ['因为脑子容易数错', '因为 UTF-8 里非英文字符可能占 2-4 字节，肉眼数不准', '因为亚马逊规则经常变', '因为字符和字节其实是一回事'], answer: 1, explain: '英文字母 1 字节，但法语 é、西语 ñ、中文等字符占 2-4 字节。你以为写了 200 字符可能实际 300+ 字节，整段被忽略。必须用字节计数工具。' }
]" />
