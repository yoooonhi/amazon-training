---
title: 关键词匹配类型
description: 搞懂手动广告的四种匹配类型 Exact、Phrase、Broad 和否定匹配，知道每种适合什么场景。学完你能判断同一个搜索词在不同匹配下会不会触发广告，理解精准和流量的权衡，学会用否定词屏蔽不相关流量降低 ACOS。
---

# 5.2 关键词匹配类型

> **入门5：广告体系**
> **本课目标**：搞懂手动广告的四种匹配类型，知道每种适合什么场景。

## 这节课解决什么问题

开手动广告时，你输入一个关键词（比如"yoga mat"），系统到底会让哪些搜索词触发你的广告？匹配类型决定了"你的广告会被谁看到"。选错匹配类型，要么流量太少、要么钱烧在不相关的词上。

## 核心知识

### 四种匹配类型（针对 SP 手动 - 关键词投放）

设关键词为 **`yoga mat`**，下面是四种匹配类型的对比：

| 匹配类型 | 触发的搜索词举例 | 不触发的举例 | 精准度 | 流量范围 |
|---|---|---|---|---|
| **Exact（精确匹配）** | `yoga mat`、`mats yoga`（语序/单复数/介词变化） | `thick yoga mat`、`yoga mat for travel` | 最高 | 最小 |
| **Phrase（词组匹配）** | `yoga mat`、`thick yoga mat`、`yoga mat for travel`（词序不能乱，前后可加词） | `mat for yoga`（顺序变了） | 中 | 中 |
| **Broad（广泛匹配）** | `yoga mat`、`yoga mat thick`、`exercise mat`、`gym mat`（词序可变，可能扩到同义/相关词） | 完全不相关的才不触发 | 最低 | 最大 |
| **Negative Exact / Negative Phrase（否定匹配）** | （用来"屏蔽"，不算正向匹配） | — | — | — |

> 简单记忆：
> - **Exact** = "必须几乎一模一样才触发" → 精准但流量小
> - **Phrase** = "顺序对就行，前后能加词" → 折中
> - **Broad** = "怎么变都行，沾边就触发" → 流量大但容易跑偏
> - **Negative** = "看到这些词，千万别展示我的广告"

### 否定匹配（Negative Keywords）两种用法

| 否定类型 | 作用 | 举例（关键词 `yoga mat`） |
|---|---|---|
| **Negative Exact（否定精确）** | 屏蔽**一个具体搜索词** | 否定 `cheap yoga mat` → 只有这个词不触发 |
| **Negative Phrase（否定词组）** | 屏蔽**所有包含这个词组的搜索词** | 否定 `cheap` → 所有带 `cheap` 的搜索词都不触发（`cheap yoga mat`、`cheap mat` 全屏蔽） |

### 精准 vs 流量的权衡

```
流量大小：       Broad  >  Phrase  >  Exact
精准度：         Exact  >  Phrase  >  Broad
转化率（一般）： Exact  >  Phrase  >  Broad
CPC（一般）：    Exact  >  Phrase  >  Broad
```

- 想要**稳定转化、控成本**：用 Exact。
- 想要**发现新词、扩大覆盖**：用 Broad（但必须配合否定词）。
- **Broad 匹配会非常宽松**：可能匹配到意思相近但你完全没想过的词。这是为什么 Broad 必须配合 Search Term Report（5.8 课）做否定。

### 匹配类型怎么影响"谁看到你"

假设你的产品是"高端瑜伽垫"，定价 60 美金：

- 用 Broad 投 `yoga mat`：可能被搜 `cheap yoga mat`、`yoga mat walmart`、`kids yoga mat` 的人看到 → 大量不相关点击 = 浪费钱。
- 用 Exact 投 `yoga mat`：只被精准搜 `yoga mat` 的人看到 → 但漏掉了 `thick yoga mat`、`extra long yoga mat` 这些精准长尾。

> 没有最好的匹配类型，只有"在什么阶段用什么"。新品探索期多用 Broad/Auto 找词，词验证后再用 Exact 收割。

## 实操要点

- **Broad 一定要配否定词**：开 Broad 等于打开水龙头，否定词就是滤网。每周看一次 Search Term Report 加否定。
- **别一开始就全部用 Exact**：新品你根本不知道哪些词好，全 Exact 等于"自己骗自己"，广告基本跑不起来。
- **同一个词可以同时投多种匹配**：比如 `yoga mat` 同时投 Broad 和 Exact，分别放在不同广告组，互相不冲突（出价可以不同）。
- **Negative 是省钱神器**：定期把"花了很多点击但不出单"的词加否定，是新手最快降低 ACOS 的方法。

## 动手练习

假设你卖的是"户外露营用的折叠椅"，关键词是 `camping chair`。请判断下面这些搜索词，分别在 Broad / Phrase / Exact 下会不会触发广告：

| 搜索词 | Broad | Phrase | Exact |
|---|---|---|---|
| `camping chair` | ? | ? | ? |
| `lightweight camping chair` | ? | ? | ? |
| `chair for camping` | ? | ? | ? |
| `office chair` | ? | ? | ? |

填完后想一想：如果你想屏蔽所有带 `office` 的搜索词，该用 Negative Exact 还是 Negative Phrase？

<LessonCheck lessonId="m4-02" :items="[
  '我能说出 Exact / Phrase / Broad 三种匹配类型的区别',
  '我知道 Broad 匹配最宽松，必须配合否定词使用',
  '我能区分 Negative Exact 和 Negative Phrase 的用法'
]" />

## 自测题

<SelfTest lessonId="m4-02" :questions="[
  {
    q: '关键词 `water bottle`，下面哪个搜索词**不会**被 Phrase 匹配触发？',
    type: 'single',
    options: ['water bottle', 'insulated water bottle', 'bottle for water', 'water bottle for kids'],
    answer: 2,
    explain: 'Phrase 匹配要求词组顺序不变（water bottle），前后可加词。`bottle for water` 把顺序颠倒了，不会触发。其余三个都保持了 water bottle 的顺序。'
  },
  {
    q: '下面关于 Broad 匹配的说法，哪个是对的？',
    type: 'single',
    options: ['只能匹配完全一样的词', '只匹配顺序一致的词组', '匹配范围最广，可能扩到同义/相关词，必须配合否定词', '不会产生任何不相关流量'],
    answer: 2,
    explain: 'Broad 是最宽松的匹配，可能扩到相关或同义词，所以容易跑出不相关流量，必须配合 Search Term Report 加否定词。'
  },
  {
    q: '你想屏蔽所有包含 `cheap` 的搜索词（比如 cheap yoga mat、cheap mat 等），应该用？',
    type: 'single',
    options: ['Negative Exact 加 cheap yoga mat', 'Negative Phrase 加 cheap', '把 yoga mat 改成 Exact', '降低 Broad 的出价'],
    answer: 1,
    explain: 'Negative Phrase 加 `cheap` 会屏蔽所有包含 cheap 的搜索词。Negative Exact 只能屏蔽某一个具体词，不够全面。'
  }
]" />
