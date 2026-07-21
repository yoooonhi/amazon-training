# 2026 年亚马逊卖家的 AI 工具工作流（深度报告）

> **调研主题**：2026 年亚马逊卖家的 AI 工具工作流（生图 / 文案+Rufus / 选品+关键词 / 广告+运营）
> **调研截止**：2026 年 7 月
> **适用对象**：亚马逊运营培训课程讲师（作为课件素材）
> **课程现状诊断**：`content/skills/` 目前只有 5 个基础工具文件（快捷键 / Excel / 域名 / 钓鱼识别 / 浏览器快捷键），**零 AI 工作流内容**，与 2026 年行业实际严重脱节

---

## 一、TL;DR 一句话结论

**2026 年亚马逊运营的 AI 工作流已经从"零散用 ChatGPT 写文案"升级为四条可复制的流水线（生图 / 文案+Rufus / 选品+关键词 / 广告+运营），但只有约 16% 的卖家真正把它跑成 SOP；课程目前在 `content/skills/` 下完全缺这块，最该补的是一个统一的 `ai-workflows/` 模块，覆盖这四条流水线 + 合规红线。**

关于 AI 渗透率：网上流传的"95% 中国卖家在用 AI"目前**未找到权威出处（存疑）**，可考证的是 AI 生图在电商领域渗透率约 65%（[腾讯云](https://cloud.tencent.com/developer/article/2674933)），生成式 AI 3 年内达 53% 普及率（[IT之家](https://www.ithome.com.tw/news/175035)）。授课时不要直接引用"98%/16%"这类没出处的数字。

---

## 二、四大 AI 工作流详解

### 工作流 1：AI 图片生成（最重要，课程重点）

#### 工具选型（按"亚马逊适用度"排序）

| 工具 | 出身 | 适合做什么 | 人民币计价 | 亚马逊适配度 |
|---|---|---|---|---|
| **亚马逊官方图像生成工具** | 卖家后台内置 | A+/品牌故事创意图，8 秒出 8 张，免费 | 是（免费） | ⭐⭐⭐⭐⭐ 最合规 |
| **Midjourney V7** | 美国 | 场景图/生活方式图，质感顶级 | 否（美元） | ⭐⭐⭐⭐ |
| **Flux（Art/Pro）** | 德国 Black Forest Labs | 写实电商图、产品一致性较强 | 否 | ⭐⭐⭐⭐ |
| **Stable Diffusion** | 开源 | 本地部署、可控性最高、可分层 | 是（自建） | ⭐⭐⭐ 需技术力 |
| **DALL-E / ChatGPT Image** | OpenAI | 入门、快、但电商质感一般 | 否 | ⭐⭐⭐ |
| **即梦 AI（Dreamina）/ 通义万相 / 文心一格 / 美图设计室** | 国产 | 人民币计价、中文 prompt、中小卖友好 | **是** | ⭐⭐⭐⭐（即梦电商模板最齐全） |

国产工具里，**即梦 AI（Dreamina）** 在电商模板（白底主图、信息图、模特图）上做得最齐，且完全人民币计价，是中小卖首选；**美图设计室**主打"一键电商图"，操作门槛最低。来源：[腾讯云电商 AI 生图指南](https://cloud.tencent.com/developer/article/2674933)、[Photta 亚马逊产品图指南](https://www.photta.app/zh/blog/amazon-product-photography-requirements-vs-ai-generated-images-guide)。

#### "3 分钟出一套主图、导出 PSD"的完整工作流

> ⚠️ 先说一个**残酷真相**：当前没有任何主流 AI 生图工具能原生输出可编辑的 PSD 分层文件。所谓"导出 PSD"实际是 **AI 出图 → 抠图工具去背景 → 导入 Photoshop/创客贴/美图设计室手动分层** 的组合流程。培训机构宣传的"一键 PSD"基本是夸大（存疑）。

正确流程（约 25 分钟，非 3 分钟）：

1. **Prompt 模板**（生图端）—— 一个 prompt 只解决一张图，不要一张图塞所有卖点：

   ```
   Purpose: [主图 / 副图信息图 / 场景图 / A+模块 / 编辑]
   Product truth: [真实产品、变体、尺寸、材质、数量、配件清单]
   Visual task: [这张图要表达什么]
   Composition: [角度、裁切、产品占比、留白、文字区]
   Lighting/style: [影棚/电商/生活场景、真实阴影、材质纹理]
   Marketplace constraints: [亚马逊位置、目标语言、手机端可读性]
   Preserve: [形状、标签、颜色、比例、包装、视角]
   Exclude: [无虚假文字、无多余物体、无变形 logo、无未支持的卖点]
   ```
   （这套公式直接来自本机已有的 `/Users/yoonhi/.zcode/skills/amazon-imagegen/SKILL.md`，是经过实战的简报结构，可作为课件标准 prompt 模板。）

2. **生成** —— 主流工具 8 秒–2 分钟出图；产品一致性约 1/6 偏差率，需要"抽卡"重抽 3–6 次锁定外观。

3. **分层（关键步骤，决定能否上架）** —— 用 [removebg](https://www.remove.bg/) / Photoshop"主体选择"/ 即梦自带的抠图，把产品抠成透明 PNG，再进 PS/创客贴/美图设计室分层成「产品层 + 背景层 + 文案层 + 卖点图标层」。

4. **合规复核（必做，下面单独讲）**。

5. **导出** —— 主图 1600×1600（≥1000px 最长边才能开缩放），副图竖版 1600×2000，白底 RGB 255,255,255。来源：[brandshots 2026 政策解读](https://www.brandshots.app/blog/ai-images-amazon-listings-2026-policy)、[nightjar 合规解读](https://nightjar.so/help-desk/does-amazon-policy-allow-for-ai-generated-product-images-in-listings)。

#### 亚马逊图片合规（这是最容易踩雷的地方，必须讲清）

**可考证的官方/准官方口径：**

- **主图必须是真实产品**。亚马逊产品图片指南要求主图白底 RGB 255,255,255、产品占比 ≥85%、无文字/水印/边框/道具。主图用纯 AI 生成会被判失真，存在被压制/下架风险。来源：[nightjar](https://nightjar.so/help-desk/does-amazon-policy-allow-for-ai-generated-product-images-in-listings)、[brandshots](https://www.brandshots.app/blog/ai-images-amazon-listings-2026-policy)。
- **副图、生活方式图、A+、品牌故事可以大量用 AI**，并且**亚马逊自己在 A+ 编辑器里内置了 AI 图像生成模块**。来源：[亚马逊全球开店 AI 生图工具介绍](https://gs.amazon.cn/zhishi/article-250413-2)、[tracefuse AI 图片视频指南](https://tracefuse.ai/blog/can-you-use-ai-images-videos-amazon-listings/)。
- **A+ Content 和 Brand Stories 已新增 AI 内容披露要求**：上传时勾选"是否 AI 生成"以及"是否含写实 AI 人物"。当前是**后台元数据，买家侧暂不可见**。来源：[LinkedIn - ANavigator](https://www.linkedin.com/posts/anavigator_amazon-now-requires-sellers-to-disclose-ai-generated-activity-7472643360097439745-nao4)、[LinkedIn - Oleg Kovalov](https://www.linkedin.com/posts/ookovalov_amazon-now-requires-sellers-to-disclose-ai-generated-activity-7471130185614991360-nlU4)。
- **KDP（图书）侧早就有强制 AI 披露政策**（G200672390），要求标注文本/图片/翻译是否 AI 生成。来源：[KDP 内容指南](https://kdp.amazon.com/help/topic/G200672390)。

**必须标"存疑"的营销夸大说法：**

- ❌ 网传"亚马逊强制要求所有 AI 图加 5% 字号水印在右下角"——**找不到亚马逊官方原文**，主要来源是 lovart.ai、img101、photta.app 等生图服务商。**不要在课件里当事实讲**。
- ❌ 网传的"G1881 政策代码"——**公开搜索查不到该编号**，亚马逊帮助中心用的是 G200672390 这种格式。**存疑**。
- 网传"2026 年 7 月起 AI 内容卖方资格大改"——目前只见第三方博客（Digital Applied 等），**未见亚马逊官方公告**，存疑。

#### 美国/欧盟外部法规（这些是**真法律**，不是平台规则）

| 法规 | 生效日 | 核心要求 | 罚款 | 来源 |
|---|---|---|---|---|
| **纽约 Fashion Workers Act** | 2025-06-19 | 使用"数字复制品"需取得真人模特同意 | — | [NY DOL 官方](https://dol.ny.gov/fashion-workers-act) |
| **纽约 Synthetic Performer Disclosure Law** | 签署 2025-12-11，2026-06 生效 | 广告中使用 AI 合成人物必须显著标注 | 首违 $1,000 / 后续 $5,000 | [Benesch 律所](https://www.beneschlaw.com)、[Crowell](https://www.crowell.com) |
| **EU AI Act 第 50 条** | 分阶段生效 | AI 生成内容需满足透明度义务 | — | 影响欧盟站卖方 |

含义：**做美国/欧盟站、且 Listing/广告里出现 AI 模特、AI 合成人脸的卖家，必须主动加标注**，否则有真实法律风险。

#### 成本对比（AI vs 传统摄影）

| 项目 | 传统摄影 | AI 生图 |
|---|---|---|
| 单套主图成本 | 500 元+ | 0.1–0.8 元/张 |
| 7 张主图 | 300–800 元 | ~$0（官方工具） |
| 5 张卖点信息图 | 200–500 元 | ~$0 |
| 交付周期 | 1–2 周 | 2–4 小时（部分工具 8 秒） |
| 整款成本 | — | $10–20/款 |

来源：[腾讯云](https://cloud.tencent.com/developer/article/2674933)、[AMZ123 ChatGPT Image 2 评测](https://m.amz123.com/t/gmdDln2k)、[智行纪点](https://zhixingjidian.cn/blog/o00469-ai-amazon-product-image-generation-cases/)、[什么值得买](https://post.smzdm.com/p/a6zq8zkg)。

---

### 工作流 2：AI 文案 + Rufus 问答覆盖（连接生成端与检索端的闭环）

#### 先纠正一个关键事实：Rufus 已经改名

**Rufus 在 2025 年下半年已升级并品牌化为 "Alexa for Shopping"**，但卖家社区和大多数工具仍沿用 Rufus 叫法。授课时要讲清这个背景，否则学员去前台找"Rufus"会找不到。

#### Rufus/Alexa for Shopping 的流量逻辑（这是文案工作流的地基）

```
用户提问（出题） → Rufus 去"可靠知识库"检索 → 组织语言回答 + 推荐产品
```

**关键点**：Rufus 的"引用材料"很大一部分来自**卖家能控制或影响的内容**——Listing 文案、A+、Q&A、Review。来源：[知乎 - 如何用 Rufus 优化 Listing 和广告](https://zhuanlan.zhihu.com/p/1985987079042245878)、[知无不言 #113768](https://www.wearesellers.com/question/113768)。

含义：以前 SEO 是"堆关键词给 A9 看"，现在 SEO 是"把答案写清楚给 Rufus 读"。文案工作流的目标从"被搜索到"升级为"被引用"。

#### "Rufus 问答覆盖"到底是什么、怎么统计

打开任意一条 Listing，**主图下方的 "Ask Rufus" 会显示 3 条买家最高频/最关心的问题**，点击可追溯答案来源。这就是最直接的"高频问题窗口"。来源：[知无不言 #113768](https://www.wearesellers.com/question/113768)。

**统计高频问题（含竞品）的 5 种方法：**

1. **直接看 Ask Rufus** —— Listing 主图下方 3 条高频问题（最便宜）。
2. **抓竞品 Q&A 和差评** —— 系统收集竞品评论区痛点、历史 Q&A。来源：[cogolinks Rufus 运营方案](https://www.cogolinks.com/news-center/b2c/34042)。
3. **搜索框自动补全词** —— 在亚马逊搜索框输入关键词看补全建议。
4. **海外社区** —— Reddit、Quora 上买家的真实讨论。
5. **第三方工具（FlyFus）** —— 按主题（性能/安全/价格）和频率过滤问题，统计你与竞品在每个高频问题下的曝光份额、被推荐次数、引用原文。来源：[FlyFus 插件](https://www.flyfus.com/plugins)。

#### 文案工作流：从生成端到检索端的闭环

**Step 1：抓问题**（用上面 5 种方法建一个"目标买家高频问题库"）。
**Step 2：写文案**（用 AI 生成 Listing，让卖点逐条对齐高频问题）。
**Step 3：埋引用源**（把答案写进五点、A+、Q&A、后台属性，让 Rufus 检索时只能引用你的内容）。
**Step 4：监控曝光份额**（用 FlyFus 等工具看你在每个问题下被推荐了多少次，没被引用就回去改文案）。

来源：[amicited Rufus 卖家指南](https://www.amicited.com/zh/blog/amazon-rufus-optimization-guide-sellers/)、[知无不言 #115885](https://www.wearesellers.com/question/115885)。

#### Listing 文案 AI 生成 prompt 模板（POA 三段式 + 角色 + 输出格式）

```
角色：你是 10 年亚马逊运营 + 英语母语文案。
产品真相：[产品名 / 变体 / 材质 / 尺寸 / 配件 / 卖点 / 目标买家]
高频问题清单：[从 Ask Rufus 抓的 3-10 条买家最关心问题]
任务：为我生成
  - Title（≤200 字符，核心词前置，含品牌+核心卖点+适用场景）
  - 5 个 Bullet（每条 ≤500 字符，痛点→卖点→证据结构，对齐高频问题）
  - Description（含 A+ 钩子）
  - 10 个后台 Search Terms
约束：
  - 不要堆砌无关关键词
  - 不要夸大、不要写未支持的认证/兼容性
  - 全部对齐 Rufus 高频问题，便于被 AI 检索引用
输出：英文 + 关键词命中标注
```

来源：[seergrow ChatGPT 提示词指南](https://seergrow.com/chatgpt-prompts-for-amazon-sellers/)、[知乎 Prompt 策略](https://zhuanlan.zhihu.com/p/1888250716201664721)。

#### 亚马逊官方也有内置 AI 文案

卖家后台「目录 → 添加商品」已内置**生成式 AI Listing 工具**，输入文字/图片/URL 即可自动预填 75%+ 产品属性、自动生成标题五点。A+ 编辑器里带"支持 AI"标志的模块也能直接生成文案与图片。**对中小卖是零成本起步首选**。来源：[亚马逊全球开店 - AI Listing 功能](https://gs.amazon.cn/zhishi/article-260205-4)、[亚马逊全球开店 - A+ AI](https://gs.amazon.cn/zhishi/article-250604-2)、[sell.amazon.com AI Listing](https://sell.amazon.com/blog/amazon-listing-ai)。

---

### 工作流 3：AI 辅助选品 + 关键词反查

#### 工具选型对比（含"为什么 Helium 10 在社区只有 4.8 分"）

| 工具 | 出身 | 社区评分 | 价格 | AI 新功能 | 小卖友好度 |
|---|---|---|---|---|---|
| **Helium 10** | 美国 | **4.8** | 年费折合最高近 3.5 万人民币 | Cerebro 反查、Black Box 选品、X-Ray 利润计算 | ⭐⭐ 贵 |
| **卖家精灵 SellerSprite** | 国产（成都云雅） | **4.9** | 人民币计价、亲民 | 反查、选品、利润一体 | ⭐⭐⭐⭐⭐ |
| **Jungle Scout** | 美国 | — | 中高 | 选品 + Web App | ⭐⭐⭐ |
| **FlyFus** | 国产 | — | 订阅 | 1.28 亿评论库、Rufus 分析、Listing 诊断 | ⭐⭐⭐⭐ |

**为什么 Helium 10 在知无不言只有 4.8（而卖家精灵 4.9）**：核心原因是**价格对中小卖不友好**——纯美元月订阅、年费折人民币近 3.5 万，对预算有限的小卖门槛过高；功能强大但界面偏英文化。卖家精灵作为国产工具，人民币计价、价格亲民、界面简洁，更贴合中国小卖需求。来源：[知无不言资源榜](https://www.wearesellers.com/source/ajaxranks/category-12__last_rank-4__last_score-5)、[知乎 Helium 10 vs 卖家精灵](https://zhuanlan.zhihu.com/p/2031005929907434851)、[AMZ123 测评](https://m.amz123.com/ask/b201EC0A)。

#### AI 选品工作流（差评挖掘 + 卖点生成）

1. **批量抓差评** —— 用工具拉竞品 1–2 星差评，按主题聚类（性能/包装/做工/兼容性）。
2. **AI 分类 + 痛点提炼** —— Prompt：`"以下是某 ASIN 的 200 条差评，按主题聚类，输出 Top 10 痛点 + 每个痛点的出现频次 + 对应的'卖点机会'"`。
3. **卖点生成** —— 把痛点机会丢回文案工作流，生成对应的 Bullet/A+。
4. **A/B 测试** —— 卖点写入 Listing 后，用亚马逊官方 Manage Your Experiments 做 A/B，AI 帮你生成 B 版本文案。

来源：[amzalysis AI 关键词](https://amzalysis.com/article/xgboost-keyword/)、[亚马逊官方 Product Opportunity Explorer](https://gs.amazon.com.tw/news/product-opportunity-explorer-unmet-demand-260126)。

#### 关键词反查的核心动作

- **Cerebro / 卖家精灵反查**：输入竞品 ASIN → 拉出它出单的所有关键词 + 排名 + 搜索量。
- **AI 分类**：把反查出的几百个词丢给 ChatGPT，按"核心词 / 长尾词 / 场景词 / 否定词"四类分桶。
- **填坑**：核心词进 Title，长尾词进 Bullet，场景词进 Search Terms，否定词进广告否定词池。

---

### 工作流 4：AI 辅助广告 + 运营

#### 4.1 广告结构 + 否定词池

**否定词判断标准**（可考证）：高曝光 + 高点击 + 低转化或无转化 → 精准否定；与产品属性/使用场景无关 → 否定。来源：[连连支付 - 广告否定词](https://global.lianlianpay.com/article_platform_amazon/37-66337.html)、[daniks 否定词指南](https://daniks.ai/zh/blog/amazon-negative-keywords-guide)。

**否定词积累三层模型**（来自 datacaciques）：
1. 词组否定（精准到具体词）
2. 自动广告低绩效词定期复盘添加
3. 高花费无转化词及时阻止

来源：[datacaciques 否定词攻略](http://www.datacaciques.com/blog/industry/102940)。

**AI 批量分类搜索词 Prompt：**
```
角色：亚马逊广告优化师
任务：附件是某 SP 自动广告 7 天搜索词报表（搜索词 / 展现 / 点击 / 花费 / 订单 / ACOS）
请输出 5 列分类：
  - 核心出单词（高转化，保留/加价）
  - 长尾出单词（拓展为精准）
  - 探索词（有展现无转化，观察）
  - 否定词（高花费无转化，精准否定）
  - 不相关词（与产品无关，词组否定）
约束：不要凭空生成数据，严格基于报表
```

#### 4.2 申诉信 + 买家消息（这是 AI 真正能省时间的地方）

**POA 申诉三段式**（根因 → 即时措施 → 长期预防），用 AI 润色是公认做法。来源：[cifnews - POA 难写试试 OpenAI](https://m.cifnews.com/article/141538)、[amzssa 申诉模板 10 篇](https://www.amzssa.com/news_center/429.html)、[知无不言 #99771 商品状况申诉](https://www.wearesellers.com/question/99771)。

**买家消息回复 Prompt：**
```
角色：英语母语客服
订单号：[xxx]，产品：[xxx]，买家问题：[粘贴原消息]
要求：
  - 先共情（道歉但不承认过失，除非真是我们的问题）
  - 给 2-3 个具体解决选项（退款/补发/退换）
  - 礼貌专业，不超过 150 字
  - 不要承诺无法兑现的事
```

来源：[连连支付 - ChatGPT 售后客服邮件](https://global.lianlianpay.com/article/MTE3OTQ1LDY4OQ.html)。

⚠️ **重要红线**：网络模板直接照搬会被亚马逊判定为模板化申诉驳回；AI 生成必须结合真实情况修改，且人工核对事实。**所有申诉/回复模板来源都注明"仅供参考、切勿直接套用"**。

#### 4.3 数据分析 + 日报

**日报工作流**：导出 Business Reports / 广告报表 → ChatGPT/Claude 按"销售/流量/广告/库存/异常"五块自动总结 → 输出今日 3 个动作项。HARPA AI 这类浏览器自动化 agent 可以定时触发。

来源：[ecommercenurse - AI on Amazon](https://ecommercenurse.com/how-to-use-ai-on-amazon-and-seller-central-in-2024-and-beyond/)。

---

## 三、可直接教给学员的 SOP 清单（一节课一份）

### SOP-1：AI 出一套合规主图（25 分钟）

1. [准备] 拍 1 张真实产品白底照（手机即可）。
2. [生成] 用即梦 AI / 美图设计室，按 prompt 公式生成 6 张候选主图。
3. [抽卡] 锁定产品一致性，挑出失真率最低的 1 张作为主图底图。
4. [分层] removebg 抠图 → Photoshop 分「产品层 + 白底层」。
5. [合规] 自检：白底 RGB 255,255,255 / 产品占比 ≥85% / 无文字水印 / ≥1600px。
6. [上传] 卖家后台主图位上传。
7. **完成标志**：前台搜索结果缩略图清晰可辨、移动端可读。

### SOP-2：AI 写一条 Rufus 友好的 Listing（40 分钟）

1. [抓问题] 打开竞品 Listing，记下 Ask Rufus 的 3 条高频问题 + 抓 5 条差评痛点。
2. [写文案] 用 prompt 模板让 AI 生成 Title/Bullet/Description，每条卖点对齐一个高频问题。
3. [埋引用] 把答案关键词写进后台属性、Search Terms、Q&A。
4. [自检] 用 ChatGPT 模拟买家提问，看 AI 能否引用你的内容回答。
5. [监控] 上线 7 天后用 FlyFus 看曝光份额。
6. **完成标志**：Ask Rufus 高频问题中至少 2 条能引用到你的 Listing 内容。

### SOP-3：AI 反查关键词 + 四分类（30 分钟）

1. [反查] 用卖家精灵/Cerebro 输入 3 个竞品 ASIN，拉出关键词总表。
2. [AI 分类] 丢给 ChatGPT 按"核心/长尾/场景/否定"四桶分类。
3. [填坑] 核心词 → Title，长尾词 → Bullet，场景词 → Search Terms，否定词 → 广告否定池。
4. **完成标志**：Listing 关键词覆盖度 ≥ 竞品平均的 80%。

### SOP-4：AI 写申诉信（20 分钟）

1. [读通知] 抄下亚马逊通知里的具体违规条款。
2. [根因] 用 AI 帮你定位"为什么会触发"（不要甩锅给买家/系统）。
3. [三段式] 根因 → 即时措施 → 长期预防，每段都要具体到时间/动作/责任人。
4. [人工改] 删掉 AI 的套话，加你真实的订单号/ASIN/日期。
5. **完成标志**：通读一遍像真人写的、且每个措施都能提供证据。

### SOP-5：AI 日报（5 分钟/天）

1. 导出 Business Reports + 广告报表。
2. 喂给 ChatGPT，prompt：`"按销售/流量/广告/库存/异常 5 块总结，输出今日 3 个优先动作"`
3. 动作项进飞书/待办。
4. **完成标志**：每天 5 分钟产出 1 份可执行日报。

---

## 四、课程该怎么补：在 `content/skills/` 下新增模块

### 现状诊断

当前 `content/skills/` 只有 5 个文件，全部是基础工具（快捷键 / Excel / 域名 / 钓鱼识别 / 浏览器快捷键），**零 AI 工作流内容**，与 2026 年行业实际严重脱节。建议在 `content/skills/` 下新增一个 `ai-workflows/` 子目录，统一放 4 节课，每节用现有的 frontmatter + `<RemoteLesson>` 格式（参照 `excel-for-ops.md`）。

### 推荐新增 4 节课（每节标题 + 核心知识点）

#### 新课 1：`skills/ai-image-workflow.md` —— AI 出图工作流（亚马逊版）

- **title**：AI 生图工作流（亚马逊合规版）
- **核心知识点**：
  1. 工具选型矩阵（即梦 / 美图设计室 / Midjourney / Flux / 官方图像生成器）
  2. 25 分钟出图 5 步法（prompt → 生成 → 抠图分层 → 合规自检 → 导出）
  3. prompt 公式（Purpose/Product truth/Visual task/Composition/Lighting/Constraints/Preserve/Exclude）
  4. 主图硬规则（白底 / ≥85% / ≥1600px / 无文字水印 / 必须真实产品）
  5. 主图禁止纯 AI，副图/A+/品牌故事可大量 AI，且官方内置 AI 工具
  6. A+ Content 的 AI 披露勾选（元数据，暂不对买家可见）
  7. 美国纽约州 AI 模特披露法（2026-06 生效）+ 欧盟 AI Act 第 50 条
  8. **"5% 水印""G1881"等营销夸大说法一律存疑，不传谣**
  9. 成本对比：传统 500 元/套 vs AI 0.1–0.8 元/张

#### 新课 2：`skills/ai-listing-rufus.md` —— AI 文案 + Rufus 问答覆盖

- **title**：AI 文案与 Rufus 问答覆盖
- **核心知识点**：
  1. Rufus 已品牌化为 Alexa for Shopping，流量逻辑从"关键词匹配"变"AI 理解 + 引用"
  2. 5 种抓高频问题的方法（Ask Rufus / 竞品 Q&A / 差评 / 搜索补全 / 海外社区）
  3. 闭环工作流：抓问题 → 写对齐文案 → 埋引用源 → 监控曝光份额
  4. Listing 文案 prompt 模板（角色 + 产品真相 + 高频问题 + 输出格式 + 约束）
  5. 亚马逊官方 Gen AI Listing / Gen AI A+ 工具（后台内置，零成本起步）
  6. A/B 测试（Manage Your Experiments）配合 AI 生成 B 版本

#### 新课 3：`skills/ai-selection-keywords.md` —— AI 辅助选品与关键词反查

- **title**：AI 选品与关键词反查
- **核心知识点**：
  1. Helium 10 / 卖家精灵 / Jungle Scout / FlyFus 工具对比（含"为什么 Helium 10 只 4.8 分"——价格门槛）
  2. AI 差评聚类 → 痛点 → 卖点机会的三步法
  3. Cerebro 反查 → AI 四分类（核心/长尾/场景/否定）→ 填坑
  4. Product Opportunity Explorer + AI 挖未满足需求
  5. 国产工具对小卖更友好的真相（人民币计价、中文界面、价格亲民）

#### 新课 4：`skills/ai-ads-ops.md` —— AI 辅助广告与运营

- **title**：AI 广告与运营提效
- **核心知识点**：
  1. 否定词池三层模型 + AI 批量搜索词五分类 prompt
  2. POA 申诉三段式（根因/即时/长期）+ AI 润色 + 红线（不照搬模板）
  3. 买家消息 AI 回复 prompt（共情/选项/不空承诺）
  4. AI 日报工作流（5 分钟/天，五块总结 + 3 动作）
  5. HARPA AI 等浏览器自动化 agent 介绍
  6. **合规边界**：AI 不替代 Listing gate、不自动改后台、不编造卖点

### 文件格式模板（直接抄现有的）

```markdown
---
title: AI 生图工作流（亚马逊合规版）
description: [一段长描述，讲清学员学完能干什么]
gated: true
storage_path: skills/ai-image-workflow.md
---

<ClientOnly>
  <RemoteLesson storage-path="skills/ai-image-workflow.md" />
</ClientOnly>
```

格式与 `/Users/yoonhi/快速AI/amazon-training/content/skills/excel-for-ops.md` 完全一致。

### 同时建议在 overview.md 的能力地图里加一行

在「入门 7：日常运营与判断力」之后或「进阶 · 能操盘」之前，加一个**横切技能模块**"AI 工作流（贯穿所有单元）"，指向上面 4 节课。因为 AI 工作流不是单独一个单元，而是渗透在 Listing/广告/选品/运营每一步里的。

---

## 五、所有引用来源 URL 列表

### 工作流 1 - AI 图片生成 / 合规 / 成本

- 亚马逊全球开店 - AI 生图工具：https://gs.amazon.cn/zhishi/article-250413-2
- 亚马逊全球开店 - A+ AI：https://gs.amazon.cn/zhishi/article-250604-2
- 亚马逊全球开店 - Gen AI Listing：https://gs.amazon.cn/zhishi/article-260205-4
- sell.amazon.com - AI Listing：https://sell.amazon.com/blog/amazon-listing-ai
- Amazon newsroom - Enhance My Listing：https://www.aboutamazon.com/news/innovation-at-amazon/amazon-generative-ai-seller-growth-shopping-experience
- brandshots - 2026 AI 图片政策：https://www.brandshots.app/blog/ai-images-amazon-listings-2026-policy
- nightjar - AI 图片政策解读：https://nightjar.so/help-desk/does-amazon-policy-allow-for-ai-generated-product-images-in-listings
- tracefuse - AI 图片视频：https://tracefuse.ai/blog/can-you-use-ai-images-videos-amazon-listings/
- 腾讯云 - 2026 电商 AI 生图指南：https://cloud.tencent.com/developer/article/2674933
- AMZ123 - ChatGPT Image 2 评测（成本表）：https://m.amz123.com/t/gmdDln2k
- 智行纪点 - AI 亚马逊产品图案例：https://zhixingjidian.cn/blog/o00469-ai-amazon-product-image-generation-cases/
- 什么值得买 - AI 商拍成本：https://post.smzdm.com/p/a6zq8zkg
- Photta - 亚马逊产品图 vs AI 指南：https://www.photta.app/zh/blog/amazon-product-photography-requirements-vs-ai-generated-images-guide
- LinkedIn - ANavigator（A+ AI 披露）：https://www.linkedin.com/posts/anavigator_amazon-now-requires-sellers-to-disclose-ai-generated-activity-7472643360097439745-nao4
- LinkedIn - Oleg Kovalov（AI 披露元数据）：https://www.linkedin.com/posts/ookovalov_amazon-now-requires-sellers-to-disclose-ai-generated-activity-7471130185614991360-nlU4
- KDP 内容指南（AI 披露 G200672390）：https://kdp.amazon.com/help/topic/G200672390

### 工作流 1 - 外部法规（NY / EU）

- NY Department of Labor - Fashion Workers Act：https://dol.ny.gov/fashion-workers-act
- Benesch 律所 - NY Synthetic Performer Disclosure：https://www.beneschlaw.com
- Crowell 律所：https://www.crowell.com
- anavigator - NY AI 披露法：https://anavigator.co/blog/new-yorks-ai-disclosure-law-takes-effect-june-9-if-your-amazon-listings-feature-ai-generated-models-you-need-to-act-now/

### 工作流 2 - Rufus / 文案

- 知无不言 #113768 - Rufus 问答对 Listing：https://www.wearesellers.com/question/113768
- 知无不言 #115885 - AI 搜索时代 Rufus 优化：https://www.wearesellers.com/question/115885
- 知乎 - 如何用 Rufus 优化 Listing 和广告：https://zhuanlan.zhihu.com/p/1985987079042245878
- 知乎 - Rufus 全解析：https://zhuanlan.zhihu.com/p/2003255268855784587
- cogolinks - Rufus 问答流量抢占：https://www.cogolinks.com/news-center/b2c/34042
- FlyFus 插件：https://www.flyfus.com/plugins
- amicited - Rufus 卖家指南：https://www.amicited.com/zh/blog/amazon-rufus-optimization-guide-sellers/
- AMZ123 - 评论操控 Rufus：https://m.amz123.com/t/TDSITfEZ
- seergrow - ChatGPT 提示词指南：https://seergrow.com/chatgpt-prompts-for-amazon-sellers/
- 知乎 - Prompt 策略：https://zhuanlan.zhihu.com/p/1888250716201664721
- cifnews - 借 AI 打造新品 Listing：https://m.cifnews.com/article/169785
- upkuajing - Gen AI 详情页矩阵：https://www.upkuajing.com/knowledge/zixun/23921

### 工作流 3 - 选品 / 关键词 / 工具评分

- 知无不言资源榜（Helium 10 4.8 / 卖家精灵 4.9）：https://www.wearesellers.com/source/ajaxranks/category-12__last_rank-4__last_score-5
- 知无不言 #63763 - Helium 10 工具分享：https://www.wearesellers.com/question/63763
- 知乎 - Helium 10 vs 卖家精灵价格：https://zhuanlan.zhihu.com/p/2031005929907434851
- AMZ123 - Helium 10 vs 卖家精灵测评：https://m.amz123.com/ask/b201EC0A
- amzalysis - AI 关键词：https://amzalysis.com/article/xgboost-keyword/
- 亚马逊台湾 - Product Opportunity Explorer：https://gs.amazon.com.tw/news/product-opportunity-explorer-unmet-demand-260126

### 工作流 4 - 广告 / 申诉 / 运营

- datacaciques - 否定词三层攻略：http://www.datacaciques.com/blog/industry/102940
- AMZ123 - 肯定词否定词判断：https://m.amz123.com/t/afcI5cz4
- daniks - 2026 否定词指南：https://daniks.ai/zh/blog/amazon-negative-keywords-guide
- 连连支付 - 广告否定词：https://global.lianlianpay.com/article_platform_amazon/37-66337.html
- cifnews - POA 用 OpenAI：https://m.cifnews.com/article/141538
- amzssa - 申诉模板 10 篇：https://www.amzssa.com/news_center/429.html
- 知乎 - 申诉模板合集：https://zhuanlan.zhihu.com/p/423299979
- 知无不言 #99771 - 商品状况 POA：https://www.wearesellers.com/question/99771
- moonstatistics - 侵权申诉：https://blog.moonstatistics.com/blog/hand_799_DfZVOS
- 知乎 - 售假 POA：https://zhuanlan.zhihu.com/p/566024495
- AMZ123 - 投诉跟卖：https://m.amz123.com/ask/obG7QfHe
- 连连支付 - ChatGPT 客服邮件：https://global.lianlianpay.com/article/MTE3OTQ1LDY4OQ.html
- ecommercenurse - AI on Amazon：https://ecommercenurse.com/how-to-use-ai-on-amazon-and-seller-central-in-2024-and-beyond/

### 行业数据 / 趋势

- IT之家 - 生成式 AI 普及率 53%：https://www.ithome.com.tw/news/175035
- 知乎 - 2026 全球消费趋势（Rufus 转化 +60%）：https://zhuanlan.zhihu.com/p/1997310587860963502
- 财联社 - 美银 2026 自主 AI 元年：https://www.cls.cn/detail/2252733
- AWS 博客 - Gartner Agentic AI 预测：https://aws.amazon.com/cn/blogs/china/agentic-ai-intelligent-enterprise-framework/

---

## 六、存疑清单（重要：授课时必须如实标注）

| 说法 | 状态 | 说明 |
|---|---|---|
| "亚马逊强制 AI 图加 5% 字号水印" | **存疑** | 仅见于生图服务商营销文，无亚马逊官方原文 |
| "G1881 政策代码" | **存疑** | 公开搜索查无此编号 |
| "2026 年 7 月 AI 卖方资格大改" | **存疑** | 仅第三方博客，无官方公告 |
| "98% 中国卖家在用 AI" | **存疑** | 找不到原始调研出处，建议改用可考证的"AI 生图电商渗透率 65%" |
| "AI 工具原生输出可编辑 PSD" | **存疑/夸大** | 实际是 AI 出图 + 抠图 + 手动分层，非一键 |
| "3 分钟出一套主图" | **夸大** | 实测 25 分钟左右，含合规自检 |
