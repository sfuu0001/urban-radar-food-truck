# 项目关键配置与部署记忆文档 (PROJECT_MEMORY.md)

本文档记录本项目所使用的第三方云服务、腾讯云对象存储（COS）凭证、发布流水线及相关操作备忘。

---

## 腾讯云静态网站托管与 COS 存储桶配置

- **Secret ID**: `<YOUR_TENCENT_SECRET_ID>`
- **Secret Key**: `<YOUR_TENCENT_SECRET_KEY>`
- **静态网站托管存储桶 (网页部署)**: `529f-static-tc100-d9gz0e2ko5929e360-1445454244`
- **应用附件存储桶 (文件存储)**: `7463-tc100-d9gz0e2ko5929e360-1445454244`
- **COS Region**: `ap-shanghai`（华东·上海）
- **🌐 网页浏览器直接访问地址 (免强制下载)**:
  [https://tc100-d9gz0e2ko5929e360-1445454244.tcloudbaseapp.com](https://tc100-d9gz0e2ko5929e360-1445454244.tcloudbaseapp.com)
- **COS 默认源站地址 (按监管要求默认触发文件下载)**:
  `https://529f-static-tc100-d9gz0e2ko5929e360-1445454244.cos-website.ap-shanghai.myqcloud.com`

---

## 为什么访问 *.myqcloud.com 默认域名会触发浏览器自动下载？

根据中国国家工信部与腾讯云安全合规监管要求（自 2024 年 1 月 1 日起）：
- 所有国内地域对象存储 COS 的**默认域名**（包含 `*.myqcloud.com` 及 `*.cos-website.*.myqcloud.com`）在浏览器访问 HTML/HTM 文件时，COS 网关层均会强制返回 `Content-Disposition: attachment` 和 `x-cos-force-download: true`，从而触发浏览器自动保存下载文件。
- **解决方案**：使用已通过合规白名单审核的**腾讯云云开发静态网站专属域名（`*.tcloudbaseapp.com`）**或绑定已备案的自定义域名。通过专属域名访问时，网页可在 Chrome、Safari、Edge 等主流浏览器中直接流畅交互，无任何下载提示。

---

## 常用指令

```bash
# 1. 一键构建并部署到腾讯云 COS
npm run deploy:cos

# 2. 本地开发调试
npm run dev

# 3. 生产环境构建
npm run build
```

---

## 关键文件说明

- `.env`: 存放本地/运行时的真实 API 密钥与存储桶信息。
- `.env.example`: 环境变量范例模板。
- `scripts/deploy-cos.mjs`: Node.js 腾讯云 COS 自动部署脚本（支持全量并发上传与 SPA 404 回退配置）。
- `AGENTS.md`: AI Agent 持久化记忆与上下文规范文件（系统每次对话会自动读取注入）。包含第 6 节「全局输入框防视口放大与所见即所得硬性铁律」、第 7 节「工作台显示设置与表单内容最大宽度云端裁决铁律」、第 8 节「全链路动态图标设计与废除机械滚动简化文本规范」，以及第 9 节「全渠道供售打样主控双端解构与工业精密布局沉淀铁律」。


