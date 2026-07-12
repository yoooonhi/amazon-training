# 4.8 广告报表解读

> **模块5：广告体系**
> **本课目标**：分清四张核心广告报表，知道每张报表该看什么、不该用它做什么。

## 这节课解决什么问题

广告后台有十几张报表，新手打开就懵。其实日常优化主要用**四张**，分别管不同的事。这节课把四张报表讲清楚，让你看一眼就知道"我现在要解决的问题，应该打开哪张报表"。

## 核心知识

### 四张核心报表

| 报表 | 中文 | 看什么（粒度） | 主要用途 |
|---|---|---|---|
| **Campaign Report（广告活动报表）** | 广告活动级 | 预算、整体 Impressions / Spend / ACOS | 看哪个广告活动预算不够、整体表现 |
| **Targeting Report（投放报表）** | 关键词 / ASIN 级 | 每个关键词或 ASIN 的表现 | **调出价**（5.7 课用的就是这张） |
| **Search Term Report（搜索词报表）** | 买家实际搜的词 | 真实触发的搜索词 | **找否定词 + 找毕业词**（5.6 课） |
| **Placement Report（展示位置报表）** | TOS / Product Pages / Rest | 不同位置的表现 | **调位置加价** |

### 这四张报表是不同的，别搞混

新手最容易犯的错：以为"关键词"和"搜索词"是一回事。

```
关键词（Keyword）   = 你在广告后台输入的词（你投放的）
搜索词（Search Term） = 买家在亚马逊搜索框实际输入的词（真实发生的）
```

举例：

- 你投放关键词 `yoga mat`（Broad 匹配）
- 买家搜 `thick yoga mat for travel` → 触发你的广告
- 在 **Targeting Report** 里，看到的是 `yoga mat`（你投的词）
- 在 **Search Term Report** 里，看到的是 `thick yoga mat for travel`（买家真实搜的词）

> 一句话：Targeting 报表看"我投的词表现如何"，Search Term 报表看"买家到底搜了什么"。**找否定词和毕业词一定要用 Search Term Report**，因为那才是真实流量。

### Campaign Report：宏观预算与健康度

打开这张报表，重点看：

- 哪些广告活动**预算经常花光**（说明预算不够，可能是好广告被限流）
- 哪些广告活动**预算花不完**（说明流量有问题，或出价太低）
- 每个广告活动的整体 ACOS / TACOS 趋势

> 这张报表不告诉你"哪个词好"，只告诉你"哪个广告活动整体健康"。具体词的问题要看 Targeting。

### Targeting Report：调出价的主战场

这张报表按**你投放的关键词 / ASIN** 列出每个的表现，是 5.7 课调价的主战场。

重点看：

- 哪些词 ACOS 远超 BE ACOS（降价 / 否定）
- 哪些词 ACOS 低、转化好（加价 / 加 TOS）
- 哪些词 CTR 低（不是出价问题，是 Listing 问题）

### Search Term Report：找否定词和毕业词

这张报表是**最常被用错**的报表。关键陷阱：

> **Search Term Report 只显示有 Impressions 的搜索词！零展示的词会被过滤掉！**

这意味着：

- 你投了 100 个关键词，其中 60 个零展示 → 这 60 个**不会出现在 Search Term Report**
- Search Term Report **不是你完整的关键词清单**

后果：如果你只看 Search Term Report 就决定"加哪些词、删哪些词"，你会**漏掉所有零展示的词**。

正确做法：

- 想看完整关键词清单 → 用 **Bulk Export（批量导出）** 或截广告组完整截图
- 想看真实流量和转化 → 用 Search Term Report
- **加 / 删关键词前，一定要先拿到完整清单，不能只靠 Search Term Report**

### Placement Report：调位置加价

这张报表按展示位置（TOS / Product Pages / Rest of Search）拆分数据：

| 位置 | 重点看 |
|---|---|
| TOS | CTR 和 ACOS（如果 TOS ACOS 好 → 加 TOS 加价） |
| Product Pages | CTR（天然偏低，正常） |
| Rest of Search | 作为参照 |

> 如果发现你的转化主要来自 TOS，但默认出价拿不到 TOS 位置 → 加 TOS 加价（如 +50%）。

### 四张报表的快速决策树

```
问题：广告整体预算花光太快 / 跑不动？
  └── 看 Campaign Report

问题：哪个词该加价 / 降价？
  └── 看 Targeting Report

问题：哪些真实搜索词该否定 / 毕业？
  └── 看 Search Term Report

问题：TOS 加价到底划不划算？
  └── 看 Placement Report
```

## 后台操作：四张报表分别在哪下载

> 四张报表的下载入口是**同一个**，区别在于"创建报表时选哪个报表类型"。

### 通用路径（四张报表共用）

1. 登录卖家后台（Seller Central）→ 左上角主菜单（三条横线）→ **Advertising（广告）** → **Reports（报表）**。
   - 进入后页面叫 **Advertising Reports（广告报表）**，上半部分是"下载已生成的报表"列表，下半部分（或一个 **Create report（创建报表）** 按钮）用来新建报表。
2. **点 Create report（创建报表）** 按钮，打开一个新建报表的弹窗 / 页面。
3. 在弹窗里要填几项关键设置（下面四张报表的差异主要在第一项）：
   - **Report type（报表类型）**：这一项决定你下载的是哪张报表（见下方四张分别选什么）。
   - **Report period（报表周期）**：选时间范围，如 `Last 7 days`（最近 7 天）、`Last 30 days`、或自定义。
   - **Name（报表名称）**：给它起个清楚的名字（很重要，见下方命名规范）。
   - **Format（格式）**：通常选 **CSV** 或 **Excel**（Excel 更适合新手直接看）。
4. 填完点 **Create report（创建报表）** 或 **Generate（生成）**。
5. 报表不会立刻出来——系统需要几分钟到几十分钟生成。生成好后，回到 **Advertising Reports** 页面顶部的**已生成报表列表**，状态显示 **Ready / Completed（就绪 / 已完成）** 时，点最右边的 **Download（下载）** 即可。

### 四张报表的"Report type"分别选什么

| 你要的报表 | 在 Report type 里选 | 英文名可能是 |
|---|---|---|
| Campaign Report（广告活动报表） | **Campaign** | `Campaign` / `Campaign report` |
| Targeting Report（投放报表） | **Targeting（投放）** | `Targeting` / `Advertised product` 之外的"投放"类型 |
| Search Term Report（搜索词报表） | **Search term（搜索词）** | `Search term` |
| Placement Report（展示位置报表） | **Placement（展示位置）** | `Placement` / `Performance by placement` |

> 如果你在 Report type 下拉里找不到 Placement：部分站点把它放在 Campaign 报表里的一个子视图，或叫 "Placement performance"。也可能在广告活动详情页的 Placement 区块直接看数据，不必导出。

### 拿"完整关键词清单"（含零展示词）的正确方法

Search Term Report 会过滤掉零展示的词，所以"完整清单"**不能靠它**。两个正确做法：

1. **截广告组完整截图**：进 Campaign Manager → 点广告活动 → 点广告组 → **Keywords Tab**，把所有关键词（哪怕没数据的）整页截图或导出。
2. **Bulk Export（批量操作 / 批量导出）**：在 **Advertising → Bulk Operations（批量操作）** 里下载一个包含所有广告活动、广告组、关键词的完整电子表格。这是最完整的"广告全量数据"来源。

> 关键纪律：**在"加关键词 / 删关键词"这类结构性决策之前，先用 Bulk Export 或广告组截图拿到完整清单**，再用 Search Term Report 补充"哪些词有真实流量"。

### 报表命名规范（别下载完就找不到）

下载多张报表后，文件名全是默认的乱码或日期戳，一周后就分不清了。养成命名习惯：

```
[日期]_[站点]_[报表类型]_[周期]
例：20260712_DE_SearchTerm_Last30d
    20260712_DE_Targeting_Last7d
    20260712_DE_Placement_Last14d
    20260712_DE_Campaign_Last30d
```

> 在"Create report"的 Name 栏就填好这个命名，下载下来就是规范的名字，不用再改。

## 实操要点

- **四张报表各管一摊**，别用错地方：调价用 Targeting，找否定词用 Search Term，整体健康用 Campaign，位置加价用 Placement。
- **Search Term Report 不完整**：零展示的词不在里面，要看完整清单用 Bulk Export。
- **养成每周看一次报表的习惯**：四张都过一遍，做一次毕业 + 否定 + 调价。
- **报表数据有延迟**：今天的数据通常明天才完整，别拿半天的数据做判断。
- **看趋势比看单天重要**：单日波动大，至少看 7 天 / 14 天趋势。

## 动手练习

下面是 5 个常见问题，请回答应该打开哪张报表：

| 问题 | 用哪张报表？ |
|---|---|
| 想知道 `camping chair` 这个词该加价还是降价 | ? |
| 想知道 `cheap chair` 这种烂词要不要否定 | ? |
| 想知道哪个广告活动预算总是不够 | ? |
| 想知道 TOS 位置的转化好不好、要不要加价 | ? |
| 想拿到这个广告组所有关键词的完整清单（含零展示） | ? |

<LessonCheck lessonId="m4-08" :items="[
  '我能说出四张核心报表（Campaign / Targeting / Search Term / Placement）各自看什么',
  '我理解关键词（Keyword）和搜索词（Search Term）的区别',
  '我知道 Search Term Report 不含零展示的词，看完整清单要用 Bulk Export',
  '我知道调价用 Targeting、找否定词用 Search Term',
  '我知道四张报表都在 Advertising → Reports → Create report 里下载，区别在选哪个 Report type',
  '我知道加/删关键词前要先用 Bulk Export 或广告组截图拿到完整清单'
]" />

## 自测题

<SelfTest lessonId="m4-08" :questions="[
  {
    q: '你想知道某个关键词该加价还是降价，应该打开哪张报表？',
    type: 'single',
    options: ['Campaign Report', 'Targeting Report', 'Search Term Report', 'Placement Report'],
    answer: 1,
    explain: '调出价看 Targeting Report（投放报表），它按你投放的关键词/ASIN 列出每个的表现。Search Term 是真实搜索词，用于找否定和毕业词。'
  },
  {
    q: '下面关于 Search Term Report 的说法，哪个是对的？',
    type: 'single',
    options: ['它包含你投放的所有关键词', '它只显示有 Impressions 的搜索词，零展示的词被过滤掉了', '它和 Targeting Report 是一回事', '它用来调展示位置加价'],
    answer: 1,
    explain: 'Search Term Report 只显示有展示的搜索词，零展示的关键词不会出现。所以它不是完整关键词清单。要看完整清单要用 Bulk Export。'
  },
  {
    q: '你投了 100 个关键词，但 Search Term Report 里只看到 40 个搜索词。下面哪种理解正确？',
    type: 'single',
    options: ['另外 60 个词被系统删掉了', '另外 60 个词可能零展示，没出现在报表里，要看 Bulk Export 才完整', '说明你的广告出问题了，立刻关掉', '说明另外 60 个词转化很差'],
    answer: 1,
    explain: 'Search Term Report 不显示零展示的词。少了 60 个不代表它们被删，而是它们没产生展示。要看完整清单必须用 Bulk Export 或广告组截图。'
  },
  {
    q: '你想知道 TOS 位置加价划不划算，应该看？',
    type: 'single',
    options: ['Campaign Report', 'Targeting Report', 'Search Term Report', 'Placement Report'],
    answer: 3,
    explain: 'Placement Report 按展示位置（TOS / Product Pages / Rest）拆分数据，是判断位置加价的依据。'
  },
  {
    q: '四张广告报表在后台分别从哪里下载？',
    type: 'single',
    options: ['四张报表各有完全不同的下载入口，要分别找', '都在 Advertising → Reports → Create report 里，下载时选不同的 Report type 即可', '只有 Campaign Report 能下载，其他只能在线看', '在卖家后台首页的搜索框里搜报表名'],
    answer: 1,
    explain: '四张报表共用一个下载入口：Advertising → Reports → Create report。区别在于创建报表时在 Report type 下拉里选 Campaign / Targeting / Search term / Placement 中哪一个。'
  },
  {
    q: '你要做「增加或删除关键词」的结构性决策，但 Search Term Report 只有 40 个词。下面哪种做法对？',
    type: 'single',
    options: ['就以这 40 个词为准，加删都看它', '先去 Advertising → Bulk Operations 下载 Bulk Export，或截广告组 Keywords Tab 完整截图，拿到含零展示词的完整清单，再决定', '把没有出现在 Search Term Report 的词全部删掉', '把 Search Term Report 导入 Excel 排序就够了'],
    answer: 1,
    explain: 'Search Term Report 会过滤零展示词，所以它不是完整关键词清单。结构性决策（加/删词）必须先拿 Bulk Export 或完整截图，避免漏掉所有零展示的词。'
  }
]" />
