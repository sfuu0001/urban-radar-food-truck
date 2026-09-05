# 项目记忆与配置文档 (Project Memory & Guidelines)

本文档记录本项目（Urban Radar 流动餐车 GPS 极速专送平台）的核心云服务配置、部署流水线、环境变量与关键开发备忘，供开发与 AI Agent 自动读取和持久化记忆。

---

## 1. 腾讯云静态网站托管与 COS 配置

本项目已配置腾讯云自动化静态网站构建与部署流水线。相关凭证与存储桶信息如下：

| 配置项 | 配置值 / 说明 |
| :--- | :--- |
| **TENCENT_SECRET_ID** | `AKIDOq8D6lPdkiUcYTHxZ1IPK1Yt1wfFvPuG` |
| **TENCENT_SECRET_KEY** | `FKEvSwDHF0e5KPRM4LOK6h7LMEtxufKq` |
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
TENCENT_SECRET_ID=AKIDOq8D6lPdkiUcYTHxZ1IPK1Yt1wfFvPuG
TENCENT_SECRET_KEY=FKEvSwDHF0e5KPRM4LOK6h7LMEtxufKq
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
