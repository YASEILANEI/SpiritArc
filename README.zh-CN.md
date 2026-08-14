<p align="center">
  <h1 align="center">SpiritArc · 牌灵占卜</h1>
  <p align="center">现代化塔罗占卜 Web 应用，支持 AI 智能解读</p>
  <p align="center">
    <a href="#%E5%8A%9F%E8%83%BD%E7%89%B9%E8%89%B2">功能特色</a> •
    <a href="#%E6%8A%80%E6%9C%AF%E6%A0%88">技术栈</a> •
    <a href="#%E5%BF%AB%E9%80%9F%E5%BC%80%E5%A7%8B">快速开始</a> •
    <a href="#%E9%A1%B9%E7%9B%AE%E7%BB%93%E6%9E%84">项目结构</a> •
    <a href="#api-%E6%A6%82%E8%A7%88">API 概览</a>
  </p>
  <p align="center">
    <a href="README.md">English</a> · <strong>中文</strong>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white" alt="TypeScript 7" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/TailwindCSS-3-06B6D4?logo=tailwindcss&logoColor=white" alt="TailwindCSS 3" />
  <img src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white" alt="Express 5" />
  <img src="https://img.shields.io/badge/Postgres-336791?logo=postgresql&logoColor=white" alt="Postgres" />
  <img src="https://img.shields.io/badge/JWT-auth-orange?logo=jsonwebtokens&logoColor=white" alt="JWT" />
</p>

---

SpiritArc 是一款完整的塔罗占卜 Web 应用，采用深色神秘风格 UI。用户从 78 张 Rider-Waite-Smith 塔罗牌中抽牌，即时获得基于模板的牌面解读，也可升级为基于 deepseek-v4-flash 模型的 AI 智能解读。应用支持离线优先使用、用户认证、订阅层级和完整的管理后台。

## 功能特色

- **78 张 Rider-Waite-Smith 经典塔罗牌** — 支持单张抽牌和三张（过去/现在/未来）牌阵
- **AI 智能解读** — 点击"AI 塔罗牌灵解读"将任意解读升级为 AI 版本，基于 deepseek-v4-flash 模型
- **牌灵对话** — 围绕本次牌阵与 AI 牌灵多轮追问；牌灵由整组牌共同形成意识，支持复制与赞/踩反馈，离开即清除对话（私密即焚）
- **更新日志** — 首页新增「更新日志」板块与顶部新功能公告条，随时了解最近上线了什么
- **离线优先** — 未登录用户可在 localStorage 创建解读，注册后可迁移至服务器
- **沉浸式占卜流程** — 洗牌、切牌、抽牌动画全由 CSS 实现，无 JS 动画库依赖
- **翻牌揭示** — 点击每张牌以 CSS 3D 翻转动画展示解读
- **用户认证** — 双 token JWT（15 分钟访问 token + 7 天刷新 token 轮换），支持邮箱/手机号注册
- **默认隐私保护** — 占卜记录默认私有，仅本人可查看（不公开分享）
- **订阅层级** — 免费用户每周 3 次 AI 解读，高级用户每月 100 次，管理员不限
- **管理后台** — 数据统计看板、用户管理、解读管理、AI 模型设置
- **响应式设计** — 移动端优先，TailwindCSS 自定义暗色主题
- **全中文界面** — 完整的中文交互体验

## 稳定性与可靠性

- **接口限流** — 牌灵聊天、AI 升级解读、意见反馈均按用户限流（10 次/15 分钟），避免无限重试消耗 AI 费用
- **事务化管理操作** — 管理员硬删除用户在同一事务内完成，不会留下半删状态
- **聊天即焚守卫** — 浏览器返回键与页内退出走同一确认流程，私密对话离开即清除
- **仅网络错误才离线回退** — 服务器拒绝请求会明确报错，不会静默生成本地记录
- **输入加固** — 问题 ≤500 字、昵称 ≤50 字（去除 HTML 标签）、批量 ID 校验为正整数、`AI_MAX_TOKENS` 上限 8000
- **界面健壮性** — 全局错误边界、解读轮询 30 秒上限、畸形 URL 安全处理

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19, TypeScript 7, Vite 8, TailwindCSS 3 |
| 后端 | Express 5, TypeScript, Neon Postgres (postgres.js) |
| 认证 | 双 token JWT（访问 + 刷新轮换）, bcryptjs 密码加密 |
| AI | 兼容 OpenAI API 格式，默认 deepseek-v4-flash |
| 动画 | 纯 CSS（rotateY 翻转、keyframe 洗牌、cubic-bezier 弹跳切牌） |
| 路由 | URL 驱动路由（history API），无需 React Router |

## 快速开始

### 环境要求

- Node.js 18+
- npm

### 安装

```bash
# 克隆仓库
git clone https://github.com/YASEILANEI/SpiritArc.git
cd SpiritArc

# 安装客户端依赖
cd client && npm install

# 安装服务端依赖
cd ../server && npm install

# （可选）配置环境变量
# 手动创建 server/.env
```

### 开发运行

需同时启动客户端和服务端。Vite 开发服务器会将 `/api` 请求代理到 `localhost:3001`。

```bash
# 终端 1 — 服务端 (Express, 端口 3001)
cd server
npm run dev

# 终端 2 — 客户端 (Vite, 端口 5173)
cd client
npm run dev
```

打开 `http://localhost:5173` 即可使用。

### 生产构建

```bash
# 构建客户端
cd client && npm run build

# 构建服务端
cd ../server && npm run build

# 启动服务端（生产模式下会自动托管客户端静态文件）
cd ../server && npm start
```

## 环境变量

在 `server/.env` 中配置。**`DATABASE_URL`、`JWT_SECRET`、`JWT_REFRESH_SECRET` 为必需项，缺失时服务端启动即报错**。

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | Neon Postgres 连接串 | — |
| `JWT_SECRET` | 访问 token 签名密钥 | — |
| `JWT_REFRESH_SECRET` | 刷新 token 签名密钥 | — |
| `ADMIN_EMAIL` | 首次运行时自动创建的管理员邮箱 | — |
| `ADMIN_PASSWORD` | 首次运行时自动创建的管理员密码 | — |
| `OPENCODE_API_KEY` | AI 解读 API 密钥（仅环境变量，不入库） | — |
| `OPENCODE_BASE_URL` | AI 服务商 API 地址 | `https://opencode.ai/zen/go/v1` |
| `NODE_ENV` | 运行环境 | `development` |
| `CORS_ORIGIN` | 生产环境允许的 CORS 来源 | — |

AI 配置也可在管理后台的**设置**页面中运行时修改。

## 项目结构

```
├── client/                    # React 单页应用 (Vite + TailwindCSS + TypeScript)
│   └── src/
│       ├── components/        # NavBar, BackButton, PageContainer
│       ├── contexts/          # AuthContext (JWT 状态管理)
│       ├── pages/             # 页面组件（URL 驱动路由）
│       ├── utils/             # reading-generator（离线备用解读生成）
│       ├── data/              # cards.json（78 张牌完整数据）、recent-updates.ts（更新日志）
│       └── api/               # 认证辅助函数
│
├── server/                    # Express REST API (Neon Postgres + TypeScript)
│   └── src/
│       ├── db/                # 建表、设置项、管理员种子（启动时执行）
│       ├── middleware/        # JWT 验证、角色鉴权
│       ├── routes/            # 认证、卡牌、解读、牌灵聊天、反馈、管理后台
│       ├── services/          # AI 解读/牌灵对话、模板解读
│       ├── utils/             # JWT 工具函数
│       └── data/              # cards.json
│
├── generate-cards.mjs         # 卡牌 JSON 数据生成脚本
└── download-images.sh         # Rider-Waite-Smith 卡牌图片下载脚本
```

### 占卜流程

```
首页 → 提问 → 洗牌 → 切牌 → 抽牌 → 解析中 → 结果 → 解读详情 → 牌灵对话
  ↑                                                              |
  +------------------------ 历史记录 ---------------------------+
  |
  ├── 登录 → 注册（认证）
  ├── 个人资料、关于、支持
  └── 管理后台、系统设置、用户管理、解读管理
```

## API 概览

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 注册 | — |
| POST | `/api/auth/login` | 登录 | — |
| POST | `/api/auth/refresh` | 刷新 token | Cookie |
| POST | `/api/auth/logout` | 登出 | Cookie |
| GET | `/api/auth/me` | 当前用户信息 | Bearer |
| GET | `/api/cards` | 获取全部 78 张牌 | — |
| GET | `/api/cards/:id` | 获取单张牌详情 | — |
| POST | `/api/readings` | 创建解读（抽牌 + 模板） | Bearer |
| GET | `/api/readings` | 用户解读列表 | Bearer |
| GET | `/api/readings/:id` | 获取单条解读（仅本人） | Bearer |
| POST | `/api/readings/:id/ai-reading` | 升级为 AI 解读 | Bearer |
| POST | `/api/readings/batch-sync` | 迁移本地解读 | Bearer |
| POST | `/api/chat/conversations` | 创建/获取牌灵会话 | Bearer |
| GET | `/api/chat/conversations/:id` | 获取会话与消息 | Bearer |
| GET | `/api/promo/first100` | 前 100 名注册活动剩余名额 | — |
| POST | `/api/chat/conversations/:id/messages` | 发送聊天消息 | Bearer |
| DELETE | `/api/chat/conversations/:id` | 删除会话（退出即焚） | Bearer |
| GET | `/api/profile` | 个人资料 | Bearer |
| GET | `/api/profile/subscription` | 订阅配额信息 | Bearer |
| GET | `/api/admin/stats` | 数据统计 | 管理员 |
| GET/PUT | `/api/admin/settings` | AI 配置 | 管理员 |

## 卡牌图片

本项目使用 **Rider-Waite-Smith** 塔罗牌，其画作作者 Pamela Colman Smith（1878–1951）的作品已进入**公有领域**。运行 `download-images.sh` 可从公有领域仓库下载卡牌图片。

## 许可

本项目基于 MIT 许可协议开源。Rider-Waite-Smith 塔罗牌图片属于公有领域。
