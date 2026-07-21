# 2026 亚马逊算法变革深度报告：A9 / COSMO / Rufus→Alexa for Shopping

> **调研主题**：2026 年亚马逊 A9 算法变革——A9 与 COSMO 并行 + Rufus 并入 Alexa for Shopping 对卖家的影响
> **调研截止**：2026 年 7 月
> **适用对象**：亚马逊运营培训课程讲师（作为课件素材）
> **核心原则**：每条关键结论均标注信息源；无法用权威来源证实的，明确标注"存疑"，绝不编造

---

## 0. 一句话结论（TL;DR，给讲师）

**2026 年亚马逊唯一官方确证的变革是：Rufus 于 5 月 13 日被并入 Alexa for Shopping，对话式 AI 已深度嵌入主搜索栏，到 2025 年 11 月已占 Amazon App 会话约 30%（黑五峰值 40%），使用 AI 助手的买家完成购买的概率高出 60% 以上。** 至于"COSMO 替代 A9"是行业话术：COSMO 是亚马逊科学家 2024 年发表的学术论文里的内部系统名（已部署在搜索导航中），官方从未把它当作面向卖家的"新算法品牌"宣传，它本质上是叠加在 A9 之上的"常识知识图谱 + 意图层"，A9 仍是底层基础。所以课程的重点不该是"换了新算法"，而是"加了一层 AI 阅读器"——卖家的 Listing 现在要同时被 A9 和 AI 助手读懂。

---

## 1. A9 / COSMO / Rufus 三者关系图解

```
┌─────────────────────────────────────────────────────────────────┐
│              买家发起一次搜索 / 提问                              │
│                                                                │
│   关键词路径：搜 "wireless earbuds"                              │
│   自然语言路径：问 "best earbuds for small ears while running"   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────────┐
        ▼                                           ▼
┌───────────────────────┐               ┌──────────────────────────┐
│  传统关键词路径         │               │  AI 对话路径（新增主入口） │
│                       │               │                          │
│  ┌─────────────────┐  │               │  Alexa for Shopping       │
│  │   A9 / A10      │  │               │  （原 Rufus，             │
│  │   底层排序引擎    │  │               │   2026-05-13 更名合并）   │
│  │                  │  │               │                          │
│  │ · 关键词相关性    │ │               │  · LLM 语义理解           │
│  │ · 转化率         │  │               │  · 调用 COSMO 知识图谱    │
│  │ · 销售速度       │  │               │    （function/audience/   │
│  │ · 库存/价格      │  │               │     scenario 三类关系）   │
│  └─────────────────┘  │               │  · 调用评论/QA/描述作证据  │
│                       │               │  · 生成自然语言回答 +      │
│  输出：自然排名列表     │               │    推荐商品卡              │
│                       │               │                          │
└──────────┬────────────┘               └─────────────┬────────────┘
           │                                          │
           └──────────────────┬───────────────────────┘
                              ▼
                ┌─────────────────────────────┐
                │  最终触达买家的商品           │
                │                             │
                │  Listing 质量由后台评分：     │
                │   · IDQ（老，Item Data       │
                │     Quality，官方有据）      │
                │   · CDQ（新，Composite Data  │
                │     Quality，社区叫法，      │
                │     存疑，见第 9 节）        │
                └─────────────────────────────┘
```

**核心要点**：
- **A9/A10 是底层地基**（决定候选池和基础排序），亚马逊官方几十年来从未改名地沿用
- **COSMO 是意图理解层**（学术论文披露、已部署在搜索导航中的常识知识图谱），叠加在 A9 之上做语义增强
- **Alexa for Shopping（原 Rufus）是前台 AI 入口**，它会调用 A9 + COSMO 的结果，再用自然语言组织给买家
- **后台 Listing 质量评分体系**从"完整性考核（IDQ）"向"准确性 + AI 可读性考核（社区称 CDQ）"演化

---

## 2. A9 算法的现状

### 2.1 A9 是什么

A9 是亚马逊自有搜索引擎算法（公司早期有 A9.com 子公司），任务只有一句话：**当买家搜一个词时，把"最可能被买掉"的产品排到前面**。不是"质量最好的"，也不是"关键词最多的"，而是"最可能成交的"。亚马逊靠成交赚钱，所以 A9 最看重**转化**和**销量**。

来源：[Search Engine Land - Amazon's A9 Product Ranking Algorithm (Beginner's Guide)](https://searchengineland.com/amazons-a9-product-ranking-algorithm-beginners-guide-329801)

### 2.2 传统 A9 的核心排名因素

| 因素 | 通俗解释 | 权重 |
|------|----------|------|
| **搜索相关性**（text match） | Listing 文本是否真的匹配买家搜的词 | 门票，过不了相关性进不了候选池 |
| **转化率**（CVR） | 100 个人点进来几个人下单 | 发动机 |
| **销售速度**（sales velocity） | 近期卖得快不快，近期权重高于历史 | 结果，也是 A9 最看重的最终信号 |
| **价格**（price） | 同类中价格竞争力 | 间接影响转化 |
| **库存/可用性**（availability） | 断货会立刻掉权 | 基础门槛 |

### 2.3 "填满信息即得分"这个旧逻辑

指的是 **IDQ（Item Data Quality，商品数据质量）评分时代**的玩法：亚马逊后台给每个 ASIN 打一个 0–100 的 IDQ 分，分项是"标题填了没、五点填了没、关键属性填了没、A+ 做了没、图片几张"——本质是**清单式完整性考核**。

老打法因此是：把所有空字段填满、属性全勾、A+ 套模板 = IDQ 分数高 = 流量倾斜。这就是所谓"填满即得分"。

- IDQ 官方踪迹：[Amazon Seller Academy IDQ 参考](http://go.amazonservices.com/l/229492/2019-03-31/5k96nw7)；[Seller Central 论坛讨论](https://sellercentral.amazon.com/seller-forums/discussions/t/9f752806-3bea-4c89-8e8e-9d28e466c625)
- 第三方拆解：[Sellerise - Amazon IDQ Score Explained](https://sellerise.com/blog/amazon-idq-score-explained/)

---

## 3. COSMO 是什么（重点澄清，最容易讲错）

### 3.1 COSMO 是亚马逊官方的吗？

**这是培训里最需要纠正的认知误区。**

COSMO **不是**亚马逊对外的"新算法产品名"，也**不是**亚马逊广告官方公告里的术语。它来自一篇**亚马逊科学家发表的学术论文**：

> **论文**：*COSMO: A Large-Scale E-commerce Common Sense Knowledge Generation and Serving System at Amazon*
> **作者**：Yu, Yang 等（亚马逊搜索科学家）
> **发表会议**：SIGMOD/PODS 2024（2024 年 6 月，智利圣地亚哥）
> **⚠️ 纠错**：中文社区常误传为 "SIGIR 2024"，**实际是 SIGMOD 2024**，两个都是顶级 ACM 会议但不是一回事
> **官方收录页**：[ACM Digital Library dl.acm.org/doi/10.1145/3626246.3653398](https://dl.acm.org/doi/10.1145/3626246.3653398)
> **PDF 全文**：[assets.amazon.science/.../cosmo-...pdf](https://assets.amazon.science/1a/a6/44a84fa24574979b066037b4e20b/cosmo-a-large-scale-e-commerce-common-sense-knowledge-generation-and-serving-system-at-amazon.pdf)
> **亚马逊科学官方博客解读**：[Building commonsense knowledge graphs to aid product recommendation](https://www.amazon.science/blog/building-commonsense-knowledge-graphs-to-aid-product-recommendation)

**全称**：COSMO = "**C**ommon **S**ense **M**odel"（常识模型）。官方定位是"大规模电商常识知识生成与服务的工业级系统"。

### 3.2 它具体怎么运作（基于论文 + 官方博客）

- 用 LLM 从海量用户行为数据里挖掘**用户视角的常识知识**，构建**工业级知识图谱**
- 知识图谱主要包含**三类关系**（论文原文）：**function（功能/用途）、audience（适用人群）、scenario（使用场景）**
- 模型 COSMO-LM 跨 **18 个品类、15 种关系类型、5 种任务**训练，只用约 3 万条标注就产出百万级知识条目
- 论文实测：在下游推荐/搜索任务上，性能可提升最高 **60%**
- **官方博客明确**：COSMO 已部署到亚马逊的"搜索导航（search navigation）"应用中

### 3.3 COSMO 和 A9 是替代还是并行？

**学术界 + 行业一致结论：并行，不是替代。** A9 仍是底层地基，COSMO 是叠加在 A9 之上的"意图理解层"。

- 最清晰的类比（行业广泛引用）：**"A9 是前门，决定你能不能进候选池；COSMO 是开门之后发生的事，读上下文和意图做精排"** —— [LinkedIn / Neha Jaiswara](https://www.linkedin.com/posts/neha-jaiswara-3461941bb_how-to-rank-your-product-on-a9-cosmo-activity-7453101546973593600-GaqT)
- [Evolve AMZ - COSMO vs A9 vs A10: The Real Amazon Algorithm in 2026](https://evolveamz.com/cosmo-vs-a9-vs-a10-amazon-algorithm-2026/)："COSMO was built on top of A9"
- 中文行业共识（[CIFNews - COSMO 与 A9 的 5 大区别](https://m.cifnews.com/article/167573)）：COSMO 是升级和补充，A9 依然存在

### 3.4 目前哪个为主？

A9/A10 仍是主排名引擎，COSMO 是增强层。**没有任何官方来源说 COSMO 取代了 A9**——这是中文社区和部分 SaaS 卖家的简化叙事，**存疑，请勿当官方结论传播**。

> **给讲师的话**：讲课时务必说明"COSMO 是学术系统名，不是亚马逊对卖家的官方产品名"，避免学员被一些 SaaS 工具的营销话术带偏。建议表述："亚马逊在 A9 之上叠加了一层基于 LLM 的常识知识图谱（学术论文称其为 COSMO）"。

---

## 4. Rufus 是什么、并入了哪里

### 4.1 Rufus 上线时间线

- **2024 年 2 月**：亚马逊官方发布 Rufus，生成式 AI 购物助手，先小范围灰度
  - 官方公告：[About Amazon - Amazon Rufus](https://www.aboutamazon.com/news/retail/amazon-rufus)
- **2024 年中（Prime Day 前后）**：面向全美用户开放
  - [Retail Dive - Amazon expands access to Rufus](https://www.retaildive.com/news/amazon-expands-access-generative-ai-shopping-tool-rufus/721441/)
  - [ZDNet - Rufus rolls out to all US customers](https://www.zdnet.com/article/amazons-ai-shopping-assistant-rufus-rolls-out-to-all-us-customers-in-time-for-prime-day/)
- **2025 年全年**：用户量爆发，**全年超 3 亿顾客使用**，月活同比 +115%
  - 官方：[About Amazon - Rufus personalized features](https://www.aboutamazon.com/news/retail/amazon-rufus-ai-assistant-personalized-shopping-features)
  - 报道：[Modern Retail - Rufus users up 115%](https://www.modernretail.co/technology/amazon-says-its-ai-shopping-assistant-is-gaining-traction-with-rufus-users-up-115/)

### 4.2 "Rufus 并入 Alexa for Shopping" 出处和时间

**这是 2026 年最确凿、最权威的官方事件**：

- **时间：2026 年 5 月 13 日**
- **官方公告**：[About Amazon - Alexa for Shopping: Amazon's AI assistant for personalized shopping](https://www.aboutamazon.com/news/retail/alexa-for-shopping-ai-assistant)
  > "Amazon brings together Rufus and Alexa+ to create 'Alexa for Shopping' on the Amazon Shopping app and website."
- **亚马逊广告官方博客（2026-06-11，最重要的一手文档）**：[advertising.amazon.com - 智能体式购物对广告主的意义](https://advertising.amazon.com/zh-cn/library/news/agentic-shopping-advertising)
  > "上个月，亚马逊将两项强大的 AI 体验（亚马逊专业购物助手 Rufus，2025 年已有超过 3 亿顾客使用；亚马逊个性化 AI 助手 Alexa+）整合为一个统一的体验：Alexa for Shopping。"
- **亚马逊卖家后台帮助页（简体中文）**：[Alexa for shopping - Seller Central](https://sellercentral.amazon.com/help/hub/reference/external/GYYH9SLHSTHKT3CZ?mons_sel_locale=zh_CN)
- **主流媒体**：[CNBC - Amazon ditches Rufus AI chatbot in favor of Alexa shopping agent](https://www.cnbc.com/amp/2026/05/13/amazon-ditches-rufus-ai-chatbot-in-favor-of-alexa-shopping-agent.html)；[GeekWire - Amazon unifies Alexa+ and Rufus](https://www.geekwire.com/2026/amazon-unifies-alexa-and-rufus-as-ai-rivals-move-into-online-shopping/)；[TechCrunch - Amazon launches AI shopping assistant for the search bar powered by Alexa](https://techcrunch.com/2026/05/13/amazon-launches-an-ai-shopping-assistant-for-the-search-bar-powered-by-alexa/)

**注意**：标题里有"ditches/关停"的说法，但**技术内核没换**——只是品牌名从 Rufus 改成 Alexa for Shopping，背后推荐逻辑、商品知识、触点位置都保留并增强。这一点 Amalytix 的分析讲得很清楚：[Amalytix - Alexa for Shopping (formerly Rufus) 2026](https://www.amalytix.com/en/knowledge/ai/amazon-rufus-guide-2026/)

### 4.3 它怎么影响商品被推荐的概率

**官方实测数据（重磅，来自亚马逊官方新闻稿 + 广告官方博客）**：

- Alexa for Shopping **深度嵌入亚马逊主搜索栏、商品详情页、购物车、Echo Show 设备**
- 顾客可直接在主搜索栏**用自然语言提问**、生成**动态商品对比**、查看**长达一年的价格历史**、**自动发现优惠并构建购物车**
- **官方原话**："Customers who use it while shopping are **over 60% more likely to make a purchase** during that shopping trip." —— 来源：[About Amazon 官方](https://www.aboutamazon.com/news/retail/amazon-rufus-ai-assistant-personalized-shopping-features)
- 广告主新增两种对话式广告入口：
  1. **Alexa for Shopping 中的搜索广告**——现有 SP/SB 广告**自动符合条件**，无需额外设置
  2. **商品推广/品牌推广提示词（Prompts）**——显示在搜索结果页和商品详情页
- **官方广告博客实测**：近 **20%** 与提示词互动的顾客会继续围绕该品牌展开对话；在**品牌推广广告中添加提示词可使转化率提升 6%**

来源：[advertising.amazon.com 智能体式购物](https://advertising.amazon.com/zh-cn/library/news/agentic-shopping-advertising)

### 4.4 "AI 搜索流量已占约 30%" 的出处（多方交叉验证）

这个数字**属实**，但需要讲清是哪一种 30%。最权威的一手来源是 Sensor Tower：

| 数据点 | 数值 | 来源 |
|---|---|---|
| 2025 年 11 月初，Rufus 用户占 Amazon **App 会话**比例 | **30%** | [Sensor Tower - Rufus: How Amazon's AI Chatbot Boosted November Sales](https://sensortower.com/blog/amazon-rufus-black-friday-sales) |
| 2025 黑五当天峰值 | **40%**（比 11/1 基线 +33%） | 同上 Sensor Tower |
| 黑五期间 Rufus 会话 vs 非 Rufus 会话购买增长 | +100% vs +20% | [NovaData - Rufus Black Friday 100% purchase lift](https://novadata.io/resources/news/rufus-ai-black-friday-100-percent-purchase-lift)；[TechCrunch](https://techcrunch.com/2025/12/01/amazons-ai-chatbot-rufus-drove-sales-on-black-friday/) |
| Rufus 会话转化率 vs 非 Rufus | **3.5 倍** | [LinkedIn / Ian Simpson 引用 Sensor Tower](https://www.linkedin.com/posts/iansimpson_sensor-towers-amazon-rufus-analysis-activity-7416758200709885952-qCOw) |
| 全美购物者中使用过 Rufus 的比例 | **约 60%** | [Azoma.ai](https://www.azoma.ai/insights/what-percentage-of-amazon-shoppers-use-rufus-2026) |
| 2025 全年 Rufus 用户 | **超 3 亿**（官方） | [About Amazon 官方](https://www.aboutamazon.com/news/retail/amazon-rufus-ai-assistant-personalized-shopping-features) |

**讲师要澄清的细节**：行业里流传的"38%"、"40%"、"30%"指的是**不同口径**——
- **"30%"** = App 会话占比（Sensor Tower，2025 年 11 月初）
- **"38–40%"** = 黑五当天会话峰值
- **"AI 流量占 30%"** 严格说是 App 会话口径，不是亚马逊官方公布的"搜索量占比"

> **结论**：**"AI 流量占约 30%"这个数字站得住脚，但要注明是 2025 年 11 月 Sensor Tower 的 App 会话口径，不是亚马逊官方公布的搜索量占比。** 早期一些"35%"是 2025 年初的预测值（[Seller Labs](https://www.sellerlabs.com/blog/amazon-rufus-ai-search-optimization-2026/)），现在已被实测数据替代。

---

## 5. 对卖家的 8 条具体影响

### 影响一：词海战术/关键词堆砌加速失效
- **机理**：A9 时代靠"把大词塞满标题/后台 search terms"抢相关性；COSMO + Alexa for Shopping 时代，AI 读的是**语义和场景**，纯堆词反而被识别为低质量内容
- **官方依据**：2026 年 7 月 27 日起标题强制限 **75 字符**（原约 200 字符），就是反关键词堆砌的明信号——[Seller Central 标题新规公告](https://sellercentral.amazon.com/seller-forums/discussions/t/145b6d0f-999c-4555-896c-c694bda2e470)
- **行业共识**：[知乎 - A9 到 COSMO 算法更迭下的运营新法则](https://zhuanlan.zhihu.com/p/2012315330547066397)

### 影响二：出现新的"第二流量入口"——AI 对话推荐
- **机理**：顾客在主搜索栏直接问"best X for Y scenario"，AI 用自然语言给推荐清单，**不再走传统关键词结果页**。研究称只有约 22% 的 Listing 与当前搜索结果重合（[LinkedIn / Mal Hawker](https://www.linkedin.com/posts/malhawker_ai-amazon-cdo-activity-7452680131841708033-T-6-)）——意味着 AI 推荐清单是一套全新的曝光逻辑
- **官方依据**：[advertising.amazon.com 智能体式购物](https://advertising.amazon.com/zh-cn/library/news/agentic-shopping-advertising)——主搜索栏已支持自然语言提问

### 影响三：AI 用户的转化率显著更高，但抢夺更激烈
- 使用 AI 助手的顾客**完成购买概率高出 60% 以上**（亚马逊官方）；Rufus 会话转化率是非 Rufus 的 **3.5 倍**（Sensor Tower）
- 含义：AI 渠道**单位流量更值钱**，但能进入 AI 推荐清单的 SKU 更少，竞争从"关键词竞价"变成"AI 可读性竞价"
- 来源：[About Amazon 官方](https://www.aboutamazon.com/news/retail/amazon-rufus-ai-assistant-personalized-shopping-features)；[Sensor Tower](https://sensortower.com/blog/amazon-rufus-black-friday-sales)

### 影响四：新品冷启动周期明显变长
- **机理**：COSMO + Alexa for Shopping 需要"高质量数据 + 历史用户行为信号"才能精准推荐；新品缺评论、缺 QA、缺使用场景数据，AI 没东西可读，推荐概率低
- **卖家真实反馈**："自从 AI 算法出台后，新品到 FBA 仓库后很难启动销量，绿标 Vine 上了、详情页面优化了、ADS 开了，单量依然难动"——[CIFNews - COSMO 算法下新品冷启动](https://m.cifnews.com/article/165870)
- **官方佐证逻辑**：亚马逊广告官方博客强调"AI 推荐依赖数万亿级购物、浏览和购买信号"，新品天然缺信号

### 影响五：后台评分体系从 IDQ 向 CDQ 演化（2026）
- **变化**：亚马逊 2026 年用 **CDQ（Composite Data Quality，复合数据质量）** 取代老的 IDQ（Item Data Quality）。新体系**不止看"填没填"，更看"填得对不对、准不准、AI 能不能读"**
- 来源：[HeyCross - Amazon Listing Rating Rules, CDQ Algorithm](https://www.heycross.com/article/QQeevm3BVP9Bk)；[知无不言 question/120227](https://www.wearesellers.com/question/120227)
- **⚠️ 注意存疑点（见第 9 节）**：CDQ/IDQ 的"命名"主要来自中文卖家社区和第三方报道，亚马逊官方文档里目前**没有把"CDQ"作为对外正式术语大规模使用**——可以讲，但要说清是行业叫法。IDQ 是官方有据可查的（Seller Academy）。

### 影响六：新增官方字段——Item Highlights（125 字符）
- **新规**：2026 年 7 月 27 日起标题限 75 字符，**同时**亚马逊推出新字段 **Item Highlights**（125 字符、逗号分隔、**可被搜索**、显示在标题下方）
- **意义**：这是官方给卖家的"补偿字段"，用来承载被砍掉的标题信息，且**专门给 AI 读**（材质、使用场景）
- 来源：[Amazon 官方标题要求页](https://sellercentral.amazon.com/help/hub/reference/external/GYTR6SYGFA5E3EQC?locale=en-US)；[Seller Central 标题新规讨论](https://sellercentral.amazon.com/seller-forums/discussions/t/145b6d0f-999c-4555-896c-c694bda2e470)；[Mogoec - 标题 75 字符 Item Highlights 新流量入口](https://www.mogoec.com/archives/1624)

### 影响七：广告结构变了——出现"提示词广告"
- **新形态**：商品推广/品牌推广**提示词（Prompts）**——AI 驱动的对话式广告，显示在搜索结果页和详情页，点击开启与 Alexa for Shopping 的对话
- **官方实测**：近 20% 与提示词互动的顾客继续围绕品牌展开对话；品牌推广加提示词**转化率 +6%**
- **现有 SP/SB 广告自动符合条件**，无需新建
- 来源：[advertising.amazon.com - 智能体式购物](https://advertising.amazon.com/zh-cn/library/news/agentic-shopping-advertising)

### 影响八：评论与 QA 进入 AI"证据库"，差评会被 AI 放大引用
- **机理**：Alexa for Shopping 生成回答时会**调用评论、QA、商品描述**作为证据；差评里的具体缺陷会被 AI 直接转述给买家
- 来源：[Auspia - 2026 Amazon Alexa GEO：产品缺点为何被 AI 放大](https://auspia.ai/zh-hans/blog/amazon-alexa-geo-2026-ai-weaknesses)；[FlyFus 分析工具](https://www.flyfus.com/)
- 含义：**评论管理从"刷好评"升级为"差评治理 + QA 主动布局"**

---

## 6. 可落地的 Listing 优化新打法 SOP

### SOP A：用 Ask Rufus / Alexa 反向挖掘意图词（核心新打法）

**第 1 步：定位"Ask Rufus/Alexa"高频问题**
- 用买家账号打开自己 Listing，主图下方找 **"Ask Rufus"** / "Ask Alexa" 栏，系统会显示**该 ASIN 买家最关心的 3 个问题**
- 同样打开 **Top 3 竞品 ASIN**，记录它们的高频问题
- 用自然语言向 Alexa for Shopping 主动提问 5–10 个核心场景问题（例："租房用的小户型电脑椅有什么建议"），记录 AI 回答里的高频表达和被推荐的竞品
- 来源：[知无不言 question/113768 - Rufus 问答对 Listing 优化的帮助](https://www.wearesellers.com/question/113768)；[知无不言 question/115885](https://www.wearesellers.com/question/115885)

**第 2 步：诊断现有 Listing 是否回答了这些问题**
- 对照第 1 步的问题清单，逐条检查：标题/五点/A+/QA/图片/评论**是否已明确回答**
- 标记三类问题：**未回答 / 回答错误 / 回答不充分**

**第 3 步：针对性补全（语义场景化改写）**
- 把"未回答/回答错误"的问题，用**可验证的事实参数**写进对应字段（见 SOP B 的"语义场景化"规范）
- 工具辅助：用 [FlyFus](https://www.flyfus.com/)（输 ASIN 生成 AI 推荐分析报告）、卖家精灵 MCP 等
- 来源：[AMZ123 - Rufus AI 优化 Listing 实操指南（附案例）](https://m.amz123.com/t/a23gd4zE)；[知乎 - 结合 GEO & 亚马逊 prompt 用 Rufus 优化 listing](https://zhuanlan.zhihu.com/p/1992982320022581353)

**第 4 步：小步快跑，持续验证（遵循"三不原则"）**
- 不要一次性大改 Listing（会掉权）
- 每次只改一个字段，观察 7–14 天 Alexa 回答变化和转化率
- 用 Manage Your Experiments 做 A/B 测试
- 来源：[163 - 如何用亚马逊 Rufus 优化 listing 3 步搞定](https://www.163.com/dy/article/KU9I2RO60556HVDX.html)；[B 站 - 敏哥跨境记视频教程](https://www.bilibili.com/video/BV1HEFCeSEmp/)

### SOP B：语义场景化内容怎么写才算合格

**老式写法（A9 时代，正在失效）**：
> "Wireless Earbuds, Bluetooth Headphones, Noise Cancelling Ear Buds, Deep Bass, Long Battery, Premium Sound Quality" —— 关键词堆砌，全是形容词

**新式写法（COSMO/Alexa 时代，合格）**：
> "Wireless earbuds with 8-hour battery (24h with case). IPX5 sweat-resistant for running and gym. Secure-fit tips for small ears. Touch controls. Includes 3 ear-tip sizes."

**合格的 5 条规则**：
1. **只写可验证的事实参数**（续航 8 小时、IPX5、含 3 个耳套）—— AI 只认事实，拒绝"最好用/最耐用"这类主观形容词
2. **必带使用场景词**（for running, for gym, for small ears）—— 这是 COSMO 知识图谱里 **scenario** 关系的核心
3. **必带适用人群词**（for kids, for seniors, for travelers）—— 对应 COSMO 的 **audience** 关系
4. **必带功能/用途词**（noise cancelling, touch controls）—— 对应 COSMO 的 **function** 关系
5. **每条事实参数尽量配一张图/一段视频佐证**——AI 会优先采信有视觉证据的卖点

来源：[AMZ123 - Rufus 算法只认可可验证事实参数](https://m.amz123.com/t/6V4W3Yxb)；[Surinch - Alexa for Shopping AI 搜索优化指南](https://surinch.com/resources/amazon-rufus-ai-search-optimization)

### SOP C：新品冷启动新打法（应对"启动变慢"）

| 阶段 | A9 时代老打法 | COSMO/Alexa 时代新打法 |
|------|---------------|------------------------|
| 上架前 | 埋大词、堆 search terms | 先做完**场景化内容包**（标题 75 字符 + Item Highlights 125 字符 + 5 点场景化 + Premium A+ + 视频） |
| 0–7 天 | 猛烧大词 SP 广告拉曝光 | 先攻**精准长尾词**（含场景/人群），先拉转化率，不追大词 |
| 评论 | 等开售再慢慢攒 | 上架即报 **Vine**（绿标评论可提升销量高达 30%），抢先建立 AI 可读的"证据库" |
| QA | 被动等买家问 | **主动布局 QA**：用 SOP A 挖到的高频问题，自己提问自己答，埋入场景化答案 |
| 站外 | 可有可无 | **必须做站外引流**（A10 权重提升），给 AI 提供跨渠道行为信号 |
| 广告 | SP 为主 | SP + **品牌推广提示词（Prompts）**，参与 Alexa 对话 |

来源：[CIFNews - COSMO 算法下新品冷启动](https://m.cifnews.com/article/165870)；[亚马逊全球开店 - 新品冷启动高效实战指南](https://gs.amazon.cn/zhishi/article-251003-2)；[Sellfox - 2026 纯白帽新品起量](https://www.sellfox.com/blog/article/yamaxun-xinpin-sellfox)

### SOP D：Listing 必须新增/升级的字段清单（2026 版）

| 字段 | 状态 | 要点 |
|------|------|------|
| **标题** | 改规：≤75 字符（2026-07-27 强制） | 核心词 + 1 个核心场景，不堆词 |
| **Item Highlights**（新） | 必填：125 字符、逗号分隔、可搜索 | 材质 + 使用场景 + 适用人群，给 AI 读 |
| **五点描述** | 升级：每点一个场景 | 用 SOP B 的"事实+场景+人群"格式 |
| **后台属性** | 必填全 | CDQ 评分核心，**填得对**比填得多重要 |
| **A+ → Premium A+** | 强烈推荐升级 | 支持多视频、交互热点、轮播、QA 模块；据称可提销售额约 20%。条件：所有 ASIN 100% 用 A+ + 品牌故事模块 + 过去 12 个月发布≥15 个 A+ |
| **视频** | 必备 | Premium A+ 内可上传多视频；视频是 AI 最强信任信号 |
| **QA** | 主动布局 | 用 Ask Rufus 挖到的高频问题自问自答 |
| **评论** | 差评治理优先 | AI 会引用差评里的具体缺陷，必须回应和改进 |

来源：[Seller Central 标题新规](https://sellercentral.amazon.com/seller-forums/discussions/t/145b6d0f-999c-4555-896c-c694bda2e470)；[AMZ123 - Premium A+ 提升 20% 销售额](https://m.amz123.com/t/aPZ1qjRo)；[出海指南 - 高级 A+ 资格](https://chuhaizhinan.com/2024/10/28/amazon-a-plus-page/)

---

## 7. 课程里该怎么讲

针对现有课件结构（`content/modules/m2-listing/01-a9-algorithm.md`），目前 **3.1 A9 算法与排名逻辑**这一课只讲了 A9 三因素、自然位 vs 广告位，**完全没有 COSMO / Rufus / Alexa for Shopping 的内容**，明显需要升级。

### 7.1 建议更新的模块

**主更新：`m2-listing`（Listing 搭建模块）**
- `01-a9-algorithm.md` → **重写为"01-搜索算法全景：A9 + COSMO + AI 助手"**
- `02-title.md` → **新增标题 75 字符新规 + Item Highlights 字段**
- `03-bullets.md` → **新增"语义场景化"写法**
- `09-brand-a-plus.md` → **新增 Premium A+ 升级路径 + 视频模块**
- **新增一课**：`11-ai-shopping-optimization.md`（Alexa for Shopping / AEO 优化）

**次更新：`m4-ads`（广告模块）**
- 新增"**提示词广告（Prompts）**"子主题

**次更新：`i1-cold-start`（中级冷启动模块）**
- 把 SOP C 的新品冷启动新打法整合进去

### 7.2 建议删除/修正的过时内容

- 任何"**堆 search terms 抢相关性**"的表述 → 降级为"基础操作"，强调收益递减
- 任何"**7 天螺旋法**"的描述 → 标注"AI 算法时代效果减弱"
- 任何"**标题塞满 200 字符**"的模板 → 必须改为 75 字符 + Item Highlights 的双字段策略
- 任何把 **COSMO 称为"亚马逊官方新算法"**的措辞 → 改为"亚马逊科学家在学术论文中披露的、部署在搜索系统中的常识知识图谱"

### 7.3 建议新增的"防忽悠"提示框

讲课时务必加一个**"行业话术辨伪"小节**，告诉学员：
- "COSMO"是学术系统名，不是亚马逊对卖家的官方产品名
- "CDQ"目前主要是中文社区和第三方叫法
- "AI 流量占 30%"是 Sensor Tower 的 App 会话口径（2025-11）
- "标题 75 字符"和"Item Highlights"是**官方确证**的

---

## 8. 所有引用来源 URL 列表

### A. 亚马逊官方 / 一手来源

1. [About Amazon - Alexa for Shopping（2026-05 合并公告）](https://www.aboutamazon.com/news/retail/alexa-for-shopping-ai-assistant)
2. [About Amazon - Amazon Rufus（2024 上线公告）](https://www.aboutamazon.com/news/retail/amazon-rufus)
3. [About Amazon - Rufus personalized features（3 亿用户 + 60% 数据出处）](https://www.aboutamazon.com/news/retail/amazon-rufus-ai-assistant-personalized-shopping-features)
4. [亚马逊广告官方博客 - 智能体式购物对广告主的意义（2026-06-11）](https://advertising.amazon.com/zh-cn/library/news/agentic-shopping-advertising)
5. [Amazon Seller Central - Alexa for shopping 帮助页（简体中文）](https://sellercentral.amazon.com/help/hub/reference/external/GYYH9SLHSTHKT3CZ?mons_sel_locale=zh_CN)
6. [Amazon Seller Central - 标题 75 字符 + Item Highlights 新规讨论](https://sellercentral.amazon.com/seller-forums/discussions/t/145b6d0f-999c-4555-896c-c694bda2e470)
7. [Amazon 官方标题要求页](https://sellercentral.amazon.com/help/hub/reference/external/GYTR6SYGFA5E3EQC?locale=en-US)
8. [Amazon Science - COSMO 论文官方收录页（ACM）](https://dl.acm.org/doi/10.1145/3626246.3653398)
9. [Amazon Science - COSMO 论文 PDF 全文](https://assets.amazon.science/1a/a6/44a84fa24574979b066037b4e20b/cosmo-a-large-scale-e-commerce-common-sense-knowledge-generation-and-serving-system-at-amazon.pdf)
10. [Amazon Science Blog - Building commonsense knowledge graphs](https://www.amazon.science/blog/building-commonsense-knowledge-graphs-to-aid-product-recommendation)
11. [Amazon Seller Academy - IDQ 参考](http://go.amazonservices.com/l/229492/2019-03-31/5k96nw7)
12. [亚马逊全球开店 - 新品冷启动高效实战指南](https://gs.amazon.cn/zhishi/article-251003-2)
13. [亚马逊全球开店 - 旺季前高效优化 listing（基于 Ask Rufus）](https://gs.amazon.cn/icp/article/huanggao-first-fast-listing)
14. [亚马逊全球开店台湾站 - Alexa for shopping 正式登場](https://gs.amazon.com.tw/news/alexa-for-shopping-260626)

### B. 主流媒体

16. [CNBC - Amazon ditches Rufus AI chatbot in favor of Alexa shopping agent（2026-05-13）](https://www.cnbc.com/amp/2026/05/13/amazon-ditches-rufus-ai-chatbot-in-favor-of-alexa-shopping-agent.html)
17. [GeekWire - Amazon unifies Alexa+ and Rufus](https://www.geekwire.com/2026/amazon-unifies-alexa-and-rufus-as-ai-rivals-move-into-online-shopping/)
18. [TechCrunch - Amazon launches AI shopping assistant for the search bar](https://techcrunch.com/2026/05/13/amazon-launches-an-ai-shopping-assistant-for-the-search-bar-powered-by-alexa/)
19. [TechCrunch - Amazon's AI chatbot Rufus drove sales on Black Friday](https://techcrunch.com/2025/12/01/amazons-ai-chatbot-rufus-drove-sales-on-black-friday/)
20. [Retail Dive - Amazon expands access to Rufus](https://www.retaildive.com/news/amazon-expands-access-generative-ai-shopping-tool-rufus/721441/)
21. [ZDNet - Rufus rolls out to all US customers](https://www.zdnet.com/article/amazons-ai-shopping-assistant-rufus-rolls-out-to-all-us-customers-in-time-for-prime-day/)
22. [Modern Retail - Rufus users up 115%](https://www.modernretail.co/technology/amazon-says-its-ai-shopping-assistant-is-gaining-traction-with-rufus-users-up-115/)
23. [Barron's - Amazon Ditches Rufus for New AI Shopping Assistant](https://www.barrons.com/articles/amazon-stock-rufus-alexa-ai-shopping-e6c2a02d)
24. [新浪财经 - 亚马逊战略转向：砍掉 Rufus 推出 Alexa 购物智能助手](https://finance.sina.com.cn/stock/usstock/c/2026-05-13/doc-inhxufvi4505324.shtml)
25. [亿邦动力 - 亚马逊 AI 购物助手 Alexa for Shopping 正式整合主搜索栏](https://www.ebrun.com/20260520/669149.shtml)

### C. 数据/研究机构

26. [Sensor Tower - Rufus: How Amazon's AI Chatbot Boosted November Sales（"30%"出处）](https://sensortower.com/blog/amazon-rufus-black-friday-sales)
27. [NovaData - Rufus AI Black Friday 100% purchase lift](https://novadata.io/resources/news/rufus-ai-black-friday-100-percent-purchase-lift)
28. [LinkedIn / Ian Simpson 引用 Sensor Tower 的 3.5 倍转化数据](https://www.linkedin.com/posts/iansimpson_sensor-towers-amazon-rufus-analysis-activity-7416758200709885952-qCOw)
29. [Azoma.ai - 60% Amazon shoppers use Rufus](https://www.azoma.ai/insights/what-percentage-of-amazon-shoppers-use-rufus-2026)
30. [Perpetua - Alexa for Shopping Complete Guide](https://perpetua.io/blog-alexa-for-shopping-amazon-rufus-the-complete-guide-for-brands-and-sellers/)
31. [Jarvio - Rufus ~14% of Amazon searches, 274M daily queries](https://jarvio.io/blog/amazon-rufus-ai-search)
32. [Seller Labs - 预测 Rufus 可达 35%（早期预测值）](https://www.sellerlabs.com/blog/amazon-rufus-ai-search-optimization-2026/)
33. [Dealroom - Bank of America 预测 Alexa for Shopping 2035 年 $215B GMV](https://app.dealroom.co/news/feed/amazon-s-alexa-for-shopping-could-generate-215b-gmv-by-2035-says-bank-of-america)

### D. 知无不言 / 中文卖家社区

34. [知无不言 question/120227 - 2026 年亚马逊算法变革：CDQ 取代 IDQ](https://www.wearesellers.com/question/120227)
35. [知无不言 question/113768 - Rufus 问答对 Listing 优化的帮助](https://www.wearesellers.com/question/113768)
36. [知无不言 question/115885 - AI 搜索时代如何利用 Rufus 优化 Listing](https://www.wearesellers.com/question/115885)
37. [知无不言 - 优质话题推荐页](https://www.wearesellers.com/question/category-24__is_recommend-1)

### E. 中文行业媒体

38. [CIFNews - 亚马逊 COSMO 算法与 A9 算法的 5 大区别](https://m.cifnews.com/article/167573)
39. [CIFNews - COSMO 算法下新品冷启动](https://m.cifnews.com/article/165870)
40. [CIFNews - Rufus 关停 Alexa 上线：卖家必须读懂的 6 条新规则](https://m.cifnews.com/article/186320)
41. [AMZ123 - Rufus AI 优化 Listing 实操指南（附案例）](https://m.amz123.com/t/a23gd4zE)
42. [AMZ123 - 重磅亚马逊正式上线 Alexa for Shopping](https://m.amz123.com/t/asNFWgy4)
43. [AMZ123 - Premium A+ 可提升 20% 销售额](https://m.amz123.com/t/aPZ1qjRo)
44. [AMZ123 - 2026 年亚马逊新品推广全攻略](https://m.amz123.com/t/LigI8irG)
45. [AMZ123 - Rufus 算法只认可可验证事实参数](https://m.amz123.com/t/6V4W3Yxb)
46. [知乎 - A9 到 COSMO 算法更迭下的运营新法则](https://zhuanlan.zhihu.com/p/2012315330547066397)
47. [知乎 - 2026 年亚马逊爆款起量核心公式](https://zhuanlan.zhihu.com/p/2019374335673017088)
48. [知乎 - 跨境亚马逊 AI 时代（Rufus/COSMO）Listing 深度优化指南](https://zhuanlan.zhihu.com/p/1977062362793145130)
49. [知乎 - 结合 GEO & 亚马逊 prompt 用 Rufus 优化 Listing](https://zhuanlan.zhihu.com/p/1992982320022581353)
50. [Mogoec - 标题 75 字符 Item Highlights 新流量入口](https://www.mogoec.com/archives/1624)
51. [Surinch - Alexa for Shopping AI 搜索优化指南](https://surinch.com/resources/amazon-rufus-ai-search-optimization)
52. [FlyFus - Alexa for Shopping 时代 AI 推荐分析工具](https://www.flyfus.com/)
53. [FlyFus - 告别无脑砸词：Rufus 时代的意图出价](https://www.flyfus.com/resources/operations/ad-guide)
54. [Sellfox - 2026 纯白帽新品起量实操方案](https://www.sellfox.com/blog/article/yamaxun-xinpin-sellfox)
55. [Auspia - 2026 Amazon Alexa GEO：产品缺点为何被 AI 放大](https://auspia.ai/zh-hans/blog/amazon-alexa-geo-2026-ai-weaknesses)
56. [HeyCross - Amazon Listing Rating Rules, CDQ Algorithm](https://www.heycross.com/article/QQeevm3BVP9Bk)
57. [出海指南 - 高级 A+ 资格获取](https://chuhaizhinan.com/2024/10/28/amazon-a-plus-page/)

### F. 英文行业深度解读

58. [Search Engine Land - Amazon's A9 Product Ranking Algorithm Beginner's Guide](https://searchengineland.com/amazons-a9-product-ranking-algorithm-beginners-guide-329801)
59. [Evolve AMZ - COSMO vs A9 vs A10: The Real Amazon Algorithm in 2026](https://evolveamz.com/cosmo-vs-a9-vs-a10-amazon-algorithm-2026/)
60. [SellerForge - Amazon Answer Engine Optimization: Win COSMO in 2026](https://www.sellerforge.ai/blog/amazon-aeo-cosmo-image-aplus-optimization)
61. [ZonGuru - Complete Guide to AI-Driven Listing Optimization 2026](https://www.zonguru.com/blog/amazon-seo-guide)
62. [PPC Ninja - How AI Is Changing Amazon Advertising in 2026](https://www.ppcninja.com/blog/ai-amazon-advertising-2025.html)
63. [Tinuiti - Alexa for Shopping: Optimization Strategies for 2026](https://tinuiti.com/blog/amazon/alexa-for-shopping/)
64. [Amalytix - Alexa for Shopping (formerly Rufus) 2026](https://www.amalytix.com/en/knowledge/ai/amazon-rufus-guide-2026/)
65. [RetailGentic - Amazon Merges Rufus and Alexa: First Look](https://www.retailgentic.com/p/breaking-alexa-for-shopping-launches)

---

## 9. 重要存疑/纠错提示（讲师必读，避免以讹传讹）

1. **"COSMO 是亚马逊官方新算法"——不准确**。COSMO 是亚马逊科学家在 SIGMOD 2024 发表的**学术论文里的系统名**，亚马逊官方博客（Amazon Science）确认它已部署在搜索导航中，但**从未在卖家后台、广告官方博客、全球开店公众号把 COSMO 作为对外算法品牌宣传**。讲课时建议表述为"亚马逊在 A9 之上叠加了一层基于 LLM 的常识知识图谱（学术论文称其为 COSMO）"。

2. **"COSMO 发表于 SIGIR 2024"——错**。**实际是 SIGMOD/PODS 2024**（2024 年 6 月）。中文社区广泛误传为 SIGIR，两个都是顶级 ACM 会议但不是一回事。

3. **"CDQ 取代 IDQ"——主要来自中文社区**。IDQ 是官方有据可查的术语（Seller Academy）；CDQ 目前主要是中文卖家社区（知无不言 question/120227）和第三方报道的叫法，**亚马逊官方英文文档里未把 CDQ 作为正式对外术语大规模使用**。可以讲趋势（Listing 质量评估从"完整性"走向"准确性+AI 可读性"），但术语要标注来源。

4. **"AI 流量占 30%"——口径要讲清**。这是 Sensor Tower 的 **App 会话口径**（2025 年 11 月初），不是亚马逊官方公布的"搜索量占比"。黑五当天峰值是 40%。另有"38%"、"60% 购物者用过 Rufus"等其他口径，不要混为一谈。

5. **"A10"——亚马逊官方从未承认**。A10 是行业对 A9 演化版本的猜测性命名，亚马逊官方只说"搜索算法持续优化"，从未用 A10 这个词。讲课时建议说"A9 的演化版本（行业俗称 A10）"。

6. **"7 天螺旋法失效"——是卖家观察，非官方结论**。社区普遍反映 COSMO+AI 时代堆销量打法效果减弱，但**没有亚马逊官方数据证实**。作为"行业观察"讲，不作为定论。
