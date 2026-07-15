---
title: 广告实操
description: 综合前 9 节课完成一次完整广告优化，读四张报表做毕业、否定、调价、位置加价决策，输出带回滚条件的优化建议。学完你能写出包含关键词、匹配类型、出价、预算、出价策略、TOS%、PD% 七参数的可执行建议，是入门 5 的毕业练习。
---

# 5.11 广告实操

> **入门5：广告体系**
> **本课目标**：综合前 9 节课的知识，完成一次完整的广告优化决策，输出一份带回滚条件的优化建议。

## 这节课解决什么问题

前 9 节课讲了概念和方法，这节课把它们**串起来用一次**。这是入门 4 的毕业练习：给你一份真实（或示例）的广告数据，你要读四张报表、做出毕业/否定/调价/加价决策，最后输出一份别人能照着执行的优化建议。

## 核心知识

### 一次完整广告优化的标准流程

```
1. 读四张报表（Campaign / Targeting / Search Term / Placement）
   ↓
2. 找毕业词（Search Term：≥2 单 + ACOS 可接受）
   ↓
3. 找否定词（Search Term：≥10 点击 0 单 + 词义不相关）
   ↓
4. 调出价（Targeting：≥20 点击，按 ACOS vs BE ACOS 决定升降）
   ↓
5. 调位置加价（Placement：TOS 转化好就加 TOS%）
   ↓
6. 输出优化建议（7 个参数 + 观察期 + 回滚条件）
```

### 优化建议的 7 个必填参数

每一条调整建议都必须写全下面 7 项，别人才能照着执行：

| 参数 | 说明 | 举例 |
|---|---|---|
| **关键词 / 搜索词** | 调整对象 | `thick yoga mat` |
| **匹配类型** | Exact / Phrase / Broad / Negative Exact / Negative Phrase | Exact |
| **出价（旧→新）** | 调整前后的出价 | $0.80 → $0.90（+12%） |
| **预算** | 这个广告活动的每日预算 | $30/天 |
| **出价策略** | Dynamic Down / Dynamic Up-Down / Fixed | Dynamic Down |
| **TOS%** | Top of Search 加价比例 | +50% |
| **PD%** | Product Pages 加价比例 | 0%（不加价） |

> 每条建议都要带"旧→新"，让执行人一眼看出变化幅度。

### 观察期和回滚条件（必须写）

广告调整不是"调完就完"，必须配套：

- **观察期**：给调整多少天显现效果（一般 3-7 天）
- **回滚条件**：什么情况下撤销这次调整

回滚条件示例：

| 调整 | 观察期 | 回滚条件 |
|---|---|---|
| 给 `thick yoga mat` 加价 12% | 7 天 | 7 天后 Spend 涨但 Orders 没涨，或 ACOS 超过 BE ACOS × 1.5 |
| 给 TOS 加价 +50% | 7 天 | 7 天后 TOS 位置 Impressions 没涨，或 TOS ACOS 高于 BE ACOS |
| 否定 `cheap yoga mat` | 3 天 | 否定后整体 Orders 下跌（说明误杀，撤销否定） |

> 没有回滚条件的优化 = 赌博。每次调整都要预设"什么情况下我承认错了，撤回来"。

### 综合判断清单（决策时逐项过一遍）

读数据时，对每个搜索词 / 关键词，按下面顺序判断：

```
1. 这个词有 ≥2 单 + ACOS 可接受吗？
   → 是：毕业到 Exact（+ 在源广告加 Negative Exact）
2. 这个词 ≥10 点击 0 单 + 词义不相关吗？
   → 是：否定（Negative Exact 或 Negative Phrase）
3. 这个词有 ≥20 点击，ACOS vs BE ACOS？
   → ACOS < BE ACOS：加价 10%
   → ACOS > BE ACOS：按公式降价
4. 整体转化主要来自 TOS 吗？
   → 是：考虑加 TOS%
5. 数据不够（<20 点击）？
   → 不动，继续观察
```

## 后台操作：怎么把决策落到广告后台

> 决策做完，要在后台真正改下去。下面是毕业、否定、调价、改预算、改 TOS% 这几个动作的具体点击路径。

### 动作一：把一个词毕业到 Exact 广告

毕业 = 两步，缺一不可（参考 4.6）。

**第 1 步：在 Exact 广告里加这个词**

1. 主菜单 → **Advertising（广告）** → **Campaign Manager（广告活动管理）**。
2. 点开你的 Exact 广告活动 → 点广告组进入。
3. 找到 **Keywords（关键词）** Tab → 点 **Add keywords（添加关键词）** 按钮。
4. 在输入框里**输入这个搜索词**（比如 `camping chair for adults`）。
5. **匹配类型选 Exact**（精确）。
6. 填**出价**（Bid，参考 4.7，可以从源广告原来的出价起步微调）。
7. 点 **Add（添加）** → **Save changes（保存更改）**。

**第 2 步：在源 Auto / Broad 广告里加 Negative Exact**

1. 回到 Campaign Manager → 点开源广告活动（Auto 或 Broad 那个）→ 点广告组。
2. 找到 **Negative keywords（否定关键词）** Tab（如果没看到，可能在广告组页面的下方，或点 **Add negative keywords**）。
3. 点 **Add negative keywords（添加否定关键词）**。
4. 输入**同一个词** `camping chair for adults`。
5. **否定类型选 Negative Exact**（否定精确，只屏蔽这一个具体词）。
6. 点 **Add** → **Save changes**。

> 两步都做完才算毕业。漏了第 2 步，这个词会在 Exact 和源广告里同时跑，双重烧钱。

### 动作二：否定一个烂词

1. Campaign Manager → 点源广告活动 → 点广告组。
2. **Negative keywords（否定关键词）** Tab → **Add negative keywords**。
3. 输入要否定的词（如 `office chair`）。
4. 选否定类型：
   - 只屏蔽这一个具体词 → **Negative Exact**
   - 屏蔽所有含某个词组的搜索词（如屏蔽所有 `kids`） → **Negative Phrase**，输入 `kids`
5. 点 **Add** → **Save changes**。

### 动作三：调某个词的出价

1. Campaign Manager → 点广告活动 → 点广告组 → **Keywords（关键词）** Tab（ASIN 投放在 **Product targeting** Tab）。
2. 找到那个关键词那一行 → 点 **Bid（出价）** 输入框 → 改成新值。
3. 失焦或按 Tab 自动保存（或点 Save changes）。
4. 记得记下"旧→新"，方便回滚。

### 动作四：改广告活动预算

1. Campaign Manager 列表页，找到该广告活动那行的 **Daily budget（日预算）** 一栏。
2. 点预算数字 → 改新值 → 失焦自动保存。

### 动作五：改出价策略 / 改 TOS% / PD% 加价

1. Campaign Manager → 点广告活动名字进详情页 → **Settings / Edit campaign settings（设置 / 编辑广告活动设置）**。
2. 改出价策略：在 **Bidding strategy（出价策略）** 单选项里重选（Dynamic Down / Up-Down / Fixed）。
3. 改位置加价：在 **Placement（展示位置）** 区块，分别给 Top of Search（TOS%）、Product Pages（PD%）填百分比（如 TOS +50%）。注意 Fixed 模式下位置加价不生效。
4. **Save（保存）**。

### 执行完核对

每条改完，回到 Campaign Manager 列表或广告组页面，确认改动已生效（出价、预算、否定词都已显示新状态）。改完当天到次日数据会有延迟，不要拿半天的数据判断效果（参考 4.8）。

## 实操要点

- **建议要可执行**：每条都写全 7 个参数 + 观察期 + 回滚条件，别人拿到能直接操作。
- **一次别改太多**：一次优化最多动 5-10 个词 / 设置，否则出问题不知道是哪条导致的。
- **改完要复盘**：观察期结束后回来看效果，决定保留 / 撤回 / 再调。
- **数据看 7 天 / 14 天，不看单日**：单日波动太大。
- **永远先备份**：调价前记下旧值（旧→新的"旧"），方便回滚。

## 动手练习（入门 5 毕业练习）

### 示例数据

某 SKU（户外折叠椅），BE ACOS = 22%。最近 14 天 SP 广告数据：

**Targeting Report（节选）**：

| 关键词 | 匹配 | 点击 | Spend | Sales | 位置主力 |
|---|---|---|---|---|---|
| `camping chair` | Exact | 35 | $28 | $210 | TOS |
| `folding chair` | Broad | 28 | $22 | $60 | Rest |
| `outdoor chair` | Phrase | 22 | $18 | $120 | TOS |
| `lightweight chair` | Broad | 18 | $15 | $40 | Rest |

**Search Term Report（节选）**：

| 搜索词 | 点击 | 订单 | Spend | Sales |
|---|---|---|---|---|
| `camping chair for adults` | 25 | 3 | $20 | $180 |
| `office chair` | 14 | 0 | $12 | $0 |
| `kids folding chair` | 16 | 0 | $14 | $0 |
| `folding chair` | 28 | 1 | $22 | $60 |

**Placement Report（节选）**：

| 位置 | Impressions | CTR | ACOS |
|---|---|---|---|
| TOS | 8000 | 1.8% | 14% |
| Product Pages | 12000 | 0.4% | 35% |
| Rest of Search | 6000 | 0.9% | 22% |

### 你的任务

输出一份**优化建议**，包含至少 5 条调整，每条都要写全 7 个参数 + 观察期 + 回滚条件。需要覆盖：

1. 至少 1 条毕业（加 Exact + 在源广告否定）
2. 至少 2 条否定（Negative Exact 或 Negative Phrase）
3. 至少 1 条出价调整（加价或降价，注明旧→新）
4. 至少 1 条位置加价调整（TOS% 或 PD%）

把建议整理成一张表（参考 7 参数表格式），最后写一段"整体策略说明"：这次优化的核心目的是什么、预期效果、风险点。

<LessonCheck lessonId="m4-10" :items="[
  '我能按标准流程读四张报表并做出综合优化决策',
  '我能写出包含 7 个参数的完整优化建议',
  '我每条建议都配套了观察期和回滚条件',
  '我理解一次优化不应改动过多（最多 5-10 条）',
  '我知道在后台怎么毕业（加 Exact + 源广告加 Negative Exact）、否定、调价、改预算、改 TOS%'
]" />

## 自测题

<SelfTest lessonId="m4-10" :questions="[
  {
    q: '一条合格的广告优化建议，至少要包含哪些参数？',
    type: 'single',
    options: ['只要写关键词和新出价', '关键词、匹配类型、出价（旧→新）、预算、出价策略、TOS%、PD%，共 7 项', '只要写关键词和 ACOS', '只要写预算和出价策略'],
    answer: 1,
    explain: '完整建议必须 7 项齐全（关键词、匹配类型、出价旧→新、预算、出价策略、TOS%、PD%），否则执行人无法照做。'
  },
  {
    q: '给一个词加价 12%，正确的配套应该包含？',
    type: 'single',
    options: ['只需要写出价新值', '写出价旧→新 + 观察期（如 7 天）+ 回滚条件（如 ACOS 超过 BE ACOS × 1.5 就撤回）', '只需要写观察期', '加价不需要回滚条件'],
    answer: 1,
    explain: '每次调整必须配套观察期（给调整多少天显现效果）和回滚条件（什么情况下承认错了撤回）。没有回滚条件的调整等于赌博。'
  },
  {
    q: '示例数据里，`office chair`（14 点击 0 单，你卖户外椅）该怎么处理？',
    type: 'single',
    options: ['加到 Exact', '加价放量', '加 Negative（词义不相关 + ≥10 点击 0 单，满足否定条件）', '继续观察 7 天'],
    answer: 2,
    explain: '`office chair` 满足否定条件：≥10 点击（14）、0 单、词义不相关（你卖户外椅不是办公椅）。直接加 Negative，避免继续浪费。'
  },
  {
    q: '示例数据里，Placement Report 显示 TOS 的 ACOS 14%（低于 BE ACOS 22%），Product Pages ACOS 35%。合理的调整是？',
    type: 'single',
    options: ['给 Product Pages 加价', '给 TOS 加价（如 +50%），因为 TOS 转化好且低于 BE ACOS', '把所有位置都加价', '关闭广告'],
    answer: 1,
    explain: 'TOS 位置 ACOS 14%（赚钱），Product Pages ACOS 35%（亏钱）。应该给 TOS 加价（把预算集中到赚钱的位置），同时可以考虑不给 Product Pages 加价甚至通过否定/调价减少那部分浪费。'
  },
  {
    q: '决定把 `camping chair for adults` 从 Broad 毕业到 Exact。在后台的操作是？',
    type: 'single',
    options: ['只在 Exact 广告组加这个词就够了', '在 Exact 广告组 Keywords Tab 加这个词（Exact 匹配），同时在 Broad 广告组 Negative keywords Tab 加 Negative Exact，两步都做', '把 Broad 广告活动整个关掉', '在 Search Term Report 里直接点毕业按钮'],
    answer: 1,
    explain: '毕业必须两步：① Exact 广告组 Keywords Tab 加词（Exact 匹配）；② 源 Broad 广告组 Negative keywords Tab 加 Negative Exact。漏掉第 2 步，这个词在 Exact 和 Broad 同时跑，会和自己的广告竞价，双重烧钱。'
  }
]" />
