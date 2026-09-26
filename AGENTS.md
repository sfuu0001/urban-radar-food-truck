# 项目记忆与配置文档 (Project Memory & Guidelines)

本文档记录本项目（Urban Radar 流动餐车 GPS 极速专送平台）的核心云服务配置、部署流水线、环境变量与关键开发备忘，供开发与 AI Agent 自动读取和持久化记忆。

---

## 1. 腾讯云静态网站托管与 COS 配置

本项目已配置腾讯云自动化静态网站构建与部署流水线。相关凭证与存储桶信息如下：

| 配置项 | 配置值 / 说明 |
| :--- | :--- |
| **TENCENT_SECRET_ID** | `<YOUR_TENCENT_SECRET_ID>` |
| **TENCENT_SECRET_KEY** | `<YOUR_TENCENT_SECRET_KEY>` |
| **静态托管存储桶 (推荐)** | `529f-static-tc100-d9gz0e2ko5929e360-1445454244` (用于网页部署，免强制下载) |
| **文件存储存储桶** | `7463-tc100-d9gz0e2ko5929e360-1445454244` (用于应用附件存储) |
| **TENCENT_COS_REGION** | `ap-shanghai` (华东·上海) |
| **🌐 网页公网直接访问地址** | `https://tc100-d9gz0e2ko5929e360-1445454244.tcloudbaseapp.com` |
| **为什么访问 COS 默认域名会强制下载** | 按照中国工信部及腾讯云安全合规政策（2024 年 1 月 1 日后），任何通过 COS 默认 `*.myqcloud.com` 域名在浏览器中打开 HTML 均会被注入 `x-cos-force-download: true` 强制下载文件；唯有通过腾讯云静态托管专属域名 `*.tcloudbaseapp.com` 或绑定已备案自定义域名才可直接渲染浏览网页。 |

### 部署命令
```bash
# 自动执行构建 (npm run build) 并增量/并发上传全量静态资产至静态托管存储桶
npm run deploy:cos
```

### 部署脚本位置
- 部署脚本：`scripts/deploy-cos.mjs`
- 环境变量：根目录 `.env` 文件（由 `.gitignore` 保护，不提交至公共仓库）
- 静态网站特性：部署脚本已配置 SPA 404 回退至 `index.html`，保障单页路由刷新正常。

---

## 2. 环境变量与安全规范

### `.env` 变量定义
```ini
TENCENT_SECRET_ID=<YOUR_TENCENT_SECRET_ID>
TENCENT_SECRET_KEY=<YOUR_TENCENT_SECRET_KEY>
TENCENT_COS_BUCKET=529f-static-tc100-d9gz0e2ko5929e360-1445454244
TENCENT_COS_REGION=ap-shanghai
```

- `.env.example` 记录变量键名供模板参考；真实敏感凭证仅保存在本地/容器 `.env` 中。

---

## 3. 核心功能与权限设计备忘

1. **开发者调试模式 (Dev Simulation)**
   - 普通用户访问：浮动调试入口（`DevFloatingDock`）默认**隐藏**，避免干扰普通用户与食客体验。
   - 开发者/管理员权限：通过顶部角色切换器底部「开发者登录」、个人中心「开发者账号登录认证」、或全局快捷键 `Ctrl+Shift+D` 唤出认证弹窗；登录后自动激活浮动调试中枢。

2. **多端协同 (Customer / Merchant / Rider / Platform)**
   - 食客端（点餐、雷达配送追踪、卡券、订单协同联络室）
   - 商家端（扫码核销台、分站打印中心、版本回滚容灾）
   - 骑手端（订单派发、状态汇报、车载 GPS 仿真）
   - 平台端（综合监控与云函数调用排查）

---

## 4. 全局排版规范铁律 (Zero Monospace / 等线)
- **绝对禁止沿用等宽等线令牌 (Zero Monospace / DengXian Token Policy)**：
  - 本项目已永久废除全站所有界面的等宽、等线字体（包括 `font-mono`、JetBrains Mono、Courier、等线等硬编码或回退）；
  - 全站排版（包括金额、微标、状态标签、UID、时间戳、代码块、个人中心、餐车动态与控制台）统一采用现代比例无衬线工控标准族（`Space Grotesk` / 系统标准无衬线），严禁任何新开发或重构代码再次引入或沿用 `font-mono`、等线等机械字体。

---

## 5. UI/UX 极致美学与单排布局设计沉淀规范 (Minimalist Industrial UI Design System)

后续任何新增界面、页面重构或组件微调，AI Agent 必须严格继承并遵循以下设计哲学与布局规范：

### 1. 单排一体化调度顶栏与半透明毛玻璃弹出菜单 (Single-Row Toolbar & Minimalist Popovers)
- **严格单排布局**：所有顶部检索、筛选、排序与工具必须收拢为 `flex-nowrap items-center justify-between` 单排布局，严禁换行堆叠导致界面割裂。
- **废除原生下拉框，统一 Popover**：选择器一律采用极简弹出式菜单（Popover），杜绝任何浏览器原生 `<select>`。
- **毛玻璃与阴影标准**：弹出容器统一采用半透明高阶毛玻璃与超柔阴影：
  ```tsx
  className="rounded-xl backdrop-blur-xl bg-white/92 border border-neutral-200/90 shadow-xl shadow-neutral-950/10 p-1.5 z-50"
  ```
- **互斥展开与顺滑动效**：各 Popover 必须保持状态互斥（打开其一时自动收起其余），展开与收起使用 `framer-motion` 的 `AnimatePresence`（平滑缩放与轻微 Y 轴位移）。
- **优化触控热区**：菜单项采用宽触控区域（`px-2.5 py-2 rounded-lg`），选中态使用高透灰底微凸起（`bg-neutral-900/[0.07] text-neutral-950 font-bold`）搭配深绿对勾图标（`Check`）。

### 2. 工业黄金标尺高度与倒角绝对对称统一 (Strict h-8 & Rounded Symmetry)
- **统一 h-8 (32px) 交互标尺**：按钮、输入框、下拉触发器、微标与标签页一律严格遵循 `h-8`（32px）或外层等高约束，绝对禁止 `h-7`、`h-7.5`、`h-9` 混用导致的高低不对称。
- **严谨倒角规范**：
  - **分类筛选与折叠控制器（胶囊按钮）**：严格统一为 **`rounded-full` (极简全圆角胶囊)**，搭配 `px-3.5` 黄金比例水平内边距，提供轻盈流线型的触控体验。
  - **通用操作按键与输入单元**：统一为 `rounded-lg` (8px)。
  - **承载容器（外层卡片、弹出菜单、抽屉区块）**：严格统一为 `rounded-xl` (12px)。
  - 彻底杜绝尖锐直角（`rounded-none`）或过小倒角（`rounded`）与圆角容器产生的冲突感。

### 3. 白色极简纯净哲学与同色高亮规范 (White Minimalist & Chromatic Unity Rule)
- **绝对禁止全黑按钮背景**：页面所有交互按钮全面废除 `bg-neutral-900`、`bg-black` 等大面积厚重黑底。
- **极简胶囊按钮形态 (Capsule Pill Design)**：
  - 分类筛选条、内容折叠控制器统一采用 `h-8 px-3.5 rounded-full` 极简胶囊形态；
  - 按钮无论在激活态（Selected）还是未激活态（Unselected）均恒定保持纯白卡片基底（`bg-white`），杜绝厚重大色块或荧光色污染视觉。
- **边框、图标、文本「三位一体同色高亮」铁律**：
  - 按钮被选中高亮时，其**边框 (Border)、图标 (Icon)、文本 (Text)** 必须使用严格统一的主题高亮色，外圈配以同色超轻柔光晕（`ring-1.5 ring-offset-0`），达成绝对的视觉和谐一致：
    - **全部餐车 (All)**：翡翠绿三位一体（`border-emerald-600 text-emerald-700 ring-emerald-600/15` + 图标 `text-emerald-700`）
    - **卡券特惠 (Coupon)**：玫瑰红三位一体（`border-rose-500 text-rose-600 ring-rose-500/15` + 图标 `text-rose-600`）
    - **社群车友 (Community)**：琥珀橙三位一体（`border-amber-500 text-amber-600 ring-amber-500/15` + 图标 `text-amber-600`）
    - **专送履约 (Delivery)**：浅紫罗兰三位一体（`border-purple-500 text-purple-600 ring-purple-500/15` + 图标 `text-purple-600`）
- **配置语义化矢量图标**：分类与状态按钮统一配置 14px（`w-3.5 h-3.5 shrink-0`）的精细矢量图标（如 `Truck`, `Ticket`, `Users`, `ShieldCheck` 等），彻底废除简单粗暴的圆点占位。
- **微标与提示字段适读字号规范 (Legible Micro-Badge Font Scale)**：
  - 按钮内部或参数网格中的关键微标字段（如「老饕群」、「满50减10」、「极速专送」等福利提示）严禁使用过小字号（杜绝 `text-[9px]` 等肉眼辨识困难的微缩字）；
  - 统一约束为 `text-[11px] font-bold px-2 py-0.5 rounded-full leading-none shrink-0`，配合柔和半透主题色浅底与细边框（如 `bg-rose-50 text-rose-600 border-rose-200/80`），确保移动端触控屏上的高清晰适读性与精美呼吸感。
- **常规态与未选态规范**：
  - 采用轻质白底配合极细灰框与次级文字：
    ```tsx
    className="bg-white text-neutral-600 border-neutral-200/90 hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300 shadow-2xs"
    ```
  - 未选态图标采用柔和过渡色（`text-neutral-400` 或半透主题色），保持呼吸感与层次感。

### 4. 极简白底分段控制器与工控键值表单 (White Minimalist Segmented Controls & Key-Value Tables)
- **分段控制器与选项卡排布规范 (Segmented Control Layout)**：
  - **背景颜色灰改纯白**：底槽容器全面废除粗糙暗灰（如 `bg-neutral-200` 等脏灰底），统一采用极简纯白卡片（`p-1 bg-white rounded-xl border border-neutral-200/90 gap-1.5 shadow-2xs`）。
  - **取消水平均分撑满 (Zero flex-1 Stretch)**：绝对禁止对内部按钮使用 `flex-1` 强制撑满拉宽，杜绝按钮由于字符长短不一导致的机械割裂与字符被拉扯。
  - **自适应内容自动宽度 (Auto-Width & Content-Driven)**：按钮宽度一律根据内容（图标 + 文字 + 间隙）自动计算，统一配置 `w-auto shrink-0 h-8 px-3 rounded-lg`，紧凑自然。
  - **严格左对齐流式分布 (Left-Aligned justify-start)**：容器一律配置 `flex items-center justify-start overflow-x-auto scrollbar-none`，保持工业级统一视线起点。
  - **选定段与未选段微拟态**：
    - 选定段：`bg-white text-neutral-950 shadow-xs font-bold border border-neutral-900 ring-1.5 ring-neutral-900/10 rounded-lg`（或匹配业务主题色如玫瑰红、琥珀橙等）；
    - 未选段：`text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50 border border-transparent rounded-lg font-medium`。
- **键值工况表单 (Key-Value Form Tables)**：
  - 抽屉内字段一律使用双列纯白工控卡片（`bg-white rounded-xl border border-neutral-200/90 divide-y divide-neutral-100/90 shadow-2xs`），内边距统一 `px-3.5 py-2.5`，核心状态（如恒温温控、履约时效）配以高透绿标与呼吸提示灯（`animate-pulse`）。

### 5. 防溢出与自适应防御 (Anti-Overflow & Viewport Resilience)
- **按钮内强制防折行规范 (Strict whitespace-nowrap & Proportional Font Defense)**：所有胶囊按钮、行动键及内部微标必须显式配置 `whitespace-nowrap`，绝对禁止任何按钮内文本发生多行转行折叠；字号与内边距需根据按钮尺寸黄金自适应（主文字 `text-[11px]~[11.5px]`，微标 `text-[10px]~[10.5px] px-1.5 py-0.5`），保证任何设备视口下均符合正常不溢出、不转行的美学显示逻辑。
- **防挤压机制**：每个横向容器中的文字节点必须设置 `min-w-0 truncate`，按键与徽记设置 `shrink-0`，确保在任何移动设备或窄视口下绝不发生水平溢出挤破。
- **横向隐形滚动**：多选项筛选条设置 `overflow-x-auto scrollbar-none py-0.5`，保障移动端滑动手感丝滑且视觉干净。

---

## 6. 全局输入框防视口放大与所见即所得硬性铁律 (Strict Zero-Zoom Input Policy)

后续任何新增界面、输入表单、所见即所得打样或参数弹窗，AI Agent 生成输入控件（`input` / `textarea` / `select`）必须严格遵循以下硬性要求，绝对杜绝点击后画面视口被强制放大：

### 1. 16px 视口防缩放基准字号底线 (Minimum 16px Font Baseline)
- **底层成因**：移动端 WebKit / Safari 与触控互动器/嵌入式预览视口在 `<input>`, `<textarea>`, `<select>` 的计算字号低于 16px 时（如常见的 12px `text-xs` 或 10px `text-[10px]`），点击聚焦会强制触发浏览器内置的自动缩放（Auto-Zoom），将整个页面/互动器比例拉伸放大，导致 UI 视口严重失真错位且普通用户无法手势缩回。
- **硬性执行**：
  - 移动端/触控视口下（`screen and (max-width: 1024px)` 或触控指针环境），输入控件基础字号**严禁低于 16px**；
  - 在组件中声明输入框样式时，必须采用 `text-[16px] md:text-xs`（或内联兜底 `style={{ fontSize: '16px' }}`）；
  - 全局已在 `src/index.css` 注入 `@media screen and (max-width: 1024px)` 强制 `font-size: 16px !important` 兜底保护网。

### 2. 代码聚焦防视口位移 (Mandatory preventScroll on Programmatic Focus)
- 所有行内编辑、所见即所得虚线框、模态弹窗或挂载时自动聚焦（如 `inputRef.current.focus()`），**必须显式传入 `{ preventScroll: true }`**：
  ```tsx
  inputRef.current.focus({ preventScroll: true });
  ```
- 绝对禁止使用裸 `focus()`，避免浏览器自动滚动页面导致互动器视口异常抖动或比例跳转。

### 3. 禁止双击误放大与滑动拉伸 (Strict touch-action: manipulation)
- 所有输入控件、容器及提交按钮必须显式添加 `touch-action: manipulation`（Tailwind: `touch-manipulation`），并保持 `-webkit-text-size-adjust: 100%`，根除横竖屏切换或连击时的文字与视口自动膨胀。

### 4. 视口元标签与双指缩放全局防护 (Strict Viewport & Gesture Defense)
- `index.html` 必须严格维护：
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, shrink-to-fit=no, viewport-fit=cover" />
  ```
- 通过 `gesturestart` / `gesturechange` / `gestureend` 拦截手势误触，确保互动器（如 iPhone 15 Pro Max 手机壳、小票打样台、右侧独立预览列）无论在移动端真实设备还是桌面端 iframe 中均恒定保持 1:1 像素物理比例。

### 5. 所见即所得虚线交互体验规范 (Standardized WYSIWYG Dashed Box Interaction)
- **常规态**：所见即所得虚线框统一采用 `border border-dashed border-emerald-400/80 bg-emerald-50/25 rounded px-1.5 py-0.5`，配合可点击微标 `Edit3`，给予用户明确的「点击即可就地修改」视觉提示。
- **编辑态**：点击后就地展开悬浮输入框，具备绿色高亮微光晕（`ring-2 ring-emerald-500/20`），并提供「回车保存 · Esc取消」微标提示与 `onBlur` 自动提交闭环。

---

## 7. 工作台显示设置与表单内容最大宽度云端裁决铁律 (Cloud-Authoritative Workspace Width Policy)

工作台显示偏好（包括「表单内容区最大宽度屏幕占比 `contentWidthPercent`」）必须严格遵循**云端数据优先裁决**原则，严禁在本地硬编码固定默认值：

1. **废除硬编码 88 历史默认值**：
   - 历史版本曾将默认屏幕占比粗暴写死为 `88%`，导致初次进入或未配置时被锁死在 88%；现已彻底废除硬编码 `88`。
   - 默认基准策略为 `100%`（全宽流式标准），或由云端集合 `obsidian_workspace_preferences` / 用户文档中的 `workspacePreferences` 动态裁决。
2. **云端设置偏好权威下发与计算**：
   - 全站与商户工作台初始化时，必须优先调用 `fetchPrefsFromCloud()` 拉取云端偏好；
   - 一旦云端下发配置，系统必须以云端值直接确定本次工作台主表单内容区最大宽度（`maxWidth: ${cloud.contentWidthPercent}%` 或 `none`）；
   - 严禁因本地临时生成的默认时间戳阻断云端合法偏好的下发覆盖。
3. **用户主动调整的持久化闭环**：
   - 仅当用户在「⚙ 工作台显示设置」中主动拖拽滑块或点击磁吸卡片（`userModified: true`）时，才触发双轨本地即时落盘与云端异步保存，形成跨端、跨设备的闭环同步。

---

## 8. 全链路动态图标设计与废除机械滚动简化文本规范 (Dynamic Icon Design & Anti-Cramped Text Policy)

后续任何面板快捷操作、协同工具条或工作台微控单元，AI Agent 必须严格落实动态图标设计，杜绝简陋文本堆砌：

1. **废除机械横向滚动与截断简化文本**：
   - 严禁在有限视口或小尺寸按键容器中粗暴塞入截断文字或依靠 `overflow-x-auto scrollbar-none touch-pan-x` 让用户横向手势搓动找字；
   - 彻底废除机械死板的单行挤压静态文本，全面由具备专属业务意图与视觉隐喻的**高灵动动态图标 (Dynamic Icon)** 担纲第一视觉重心。
2. **业务专属动态图标微交互标准**：
   - **定位 / GPS / 泊位**：配置外扩型雷达扩散波纹 (`animate-ping`)、高透雷达光晕与实时锁位定位信标微绿灯；
   - **对讲 / 语音 / 广播**：集成动态跳动音频柱状波形 (`Audio Wave Equalizer`，交错脉冲动效) 与无线电波涟漪；
   - **拍照 / 出餐验真 / 存证**：配置光学镜头对焦框微动、光圈快门动态微旋与高辨识度闪光微标；
   - **催单 / 督办 / 紧急工单**：配置高危心跳频闪脉冲 (`Emergency Strobe Pulse`) 与电气闪电加急微标；
   - **换餐 / 报备 / 异常协作**：配置双向交互旋动流转徽记与实时状态响应；
   - **离线韧性 / 历史时间轴**：配置动态天线波纹与时间轴回卷刻度。
3. **高适读比例文字与防溢出兜底**：
   - 图标下方文本必须保证在 1:1 物理像素下清晰适读（统一 `text-[11px] font-semibold text-neutral-800 leading-tight block truncate`）；
   - 统一遵循 `rounded-xl border border-neutral-200/90 bg-white hover:bg-neutral-50 shadow-2xs` 工控纯净美学标准。

---

## 9. 全渠道供售打样主控双端解构与工业精密布局沉淀铁律 (Dual-End Precision Console & Industrial Matrix Layout Policy)

后续任何后台控制台、供售主控、多端调度面板或业务矩阵界面开发与微调，AI Agent 必须严格继承并执行本套端侧差异化布局沉淀逻辑：

### 1. 标志性主控胶囊标准形态 (Authoritative Header Capsule Standard)
- **形态与倒角**：恒定采用 `h-8 px-3.5 rounded-full` 极简全圆角流线胶囊形态，彻底杜绝方形直角或 `rounded-lg`；
- **材质与线框**：纯白卡片底色（`bg-white`）搭配纯黑精工细边框（`border border-neutral-900` 或 `border-[#1a1918]`），呈现高级机械工控与瑞士排版质感；
- **三元视觉重心**：
  1. 左侧业务矢量图标（如无线广播 `Radio`、打印机 `Printer`、调度 `Truck` 等，14px `w-3.5 h-3.5 text-neutral-950`）；
  2. 中间中文业务粗体字（如 `全渠道供售打样主控`，`text-xs font-bold tracking-tight text-neutral-950 whitespace-nowrap`）；
  3. 右侧高亮呼吸信号微标（翡翠绿实心圆点 `w-2 h-2 rounded-full bg-emerald-500 shrink-0`）。
- **移动端绝不隐藏**：在手机端与小屏视口下，该胶囊必须常驻作为第一视觉标识，绝对禁止使用 `hidden md:flex` 进行粗暴隐藏。

### 2. 移动端专属高密度工控卡片流 (Mobile-Dedicated High-Density Card Stream)
针对移动端窄视口（`< 768px`，如 375px~430px iPhone）：
- **杜绝桌面表格挤压**：严禁在手机端硬塞多列表格导致水平严重截断挤压；必须垂直重构为结构化白底卡片流（`rounded-[3px]` 或 `rounded-xl`）；
- **2×2 四宫格自适应遥测指标带**：
  - 核心指标（如餐车站网、堂食翻台、外卖履约、智能取餐柜）采用 `grid grid-cols-2 gap-2` 四宫格分布；
  - 每个指标卡支持单触控平滑折叠/展开深入遥测参数（如在网电压、信噪比、均时、温控状态），不占首屏过大空间。
- **单站点三层卡片解构**：
  1. **身份行 (Header)**：站号徽章（`01` 黑白反色）+ 站点名称 + 状态胶囊（`营业中` / `部分限流` / `休市打样`）+ 右侧工况状态码（`ONLINE` / `THROTTLED` / `HALTED`）；
  2. **总控行 (Sub-Master)**：总控电源按键（`KILLSWITCH`，支持激活微光与阻断灰调）+ 对应工况说明；
  3. **独立渠道行 (Channels)**：3列等高通道按键（堂食、外卖、自提），集成微型硬件弹簧滑块 Switch、开启状态字与席位/运力/柜体工况注脚。
- **单排一体化批处理控制条**：
  - 「全网开单」、「全线打样」、「气象熔断」在手机端必须采用等宽 3 键并列网格，白底配合主题色微标，杜绝全黑大厚底。

### 3. 桌面端 12 栅格对齐与低噪工控台 (Desktop 12-Column Precision Grid)
针对桌面端宽视口（`>= 768px` / `1280px`）：
- 自动舒展为 12 栅格对齐的工业精密监视表格；
- 表头清晰分段：站点信息（4 栅格）、总控 KILLSWITCH（3 栅格）、三通道微动效组（5 栅格）；
- 保持数据密度与极低视觉噪声。

### 4. 底部变形折叠抽屉容器规范 (Collapsible DRAWER Container)
- 底部常驻微调条：`底座遥测总线与通道负荷 [DRAWER]` + 实时滚动最新审计摘要；
- 向上轻点展开平滑抽屉：左侧 8 栅格为实时审计流水（带时间戳与状态码），右侧 4 栅格为三大通道峰值负载压力分布条。

### 5. 设计令牌延续与零等宽防缩放防护 (Tokens & Zero Monospace Unity)
- 画布与卡片严格采用 Industrial Precision Console 令牌：画布 `#F4F4F2`、卡片 `#FFFFFF`、边框 `#E2E2DF` 与 `#CCCCCC`、工控蓝 `#006494`、亮蓝 `#3BB4FE`、限流橙 `#C26D00`、报警红 `#D32F2F`；
- 全局排版彻底废除 `font-mono`，统一采用 `Space Grotesk` 与 `Hanken Grotesk` 比例无衬线工控标准字体；
- 所有输入控件在移动端严格保证 16px 防缩放基准字号底线。




