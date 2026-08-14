# SpiritArc 塔罗占卜项目 — 代码审查报告与修复方案

审查范围：`server/src`（Express 5 + postgres.js，ESM）、`client/src`（React 19 + Vite + TS）。
审查日期：本次会话。以下问题均给出文件:行号、原因与修复代码。

## 修复状态（已按用户指示落地）

- ✅ **已修复**：H2、H3、H4、H5、M1、M2、M3、M4、M6、M7、M8、M9、M10、M11、L1、L2、L9
- ⏭️ **按用户要求跳过（注册相关风险）**：H1（登录/注册限流）、M5（邮箱大小写敏感）
- ⚪ **未处理（建议项/产品决策）**：L3（测试/lint）、L4（DDL 迁移化）、L5（`is_public` 死代码）、L6（`PG_SCHEMA`）、L7（cards.json 校验脚本）、L8（helmet 补充头）、L10（空闲超时）

> 两端 `tsc --noEmit` 均已通过。

---

## 一、高危问题（建议优先修复）

### H1. 登录/注册接口完全没有速率限制 —— 撞库/爆破风险
`server/src/routes/auth.ts`（`/register`、`/login`、`/refresh`）没有任何 rate-limit。
全项目只有 feedback 和 chat 两个端点做了限制（还都是按用户维度）。攻击者可对 `/api/auth/login` 无限爆破密码、用 `/api/auth/register` 刷库。

**修复**：在 `index.ts` 挂一个按 IP 的全局限制 + 对 auth 路由单独收紧：

```ts
// server/src/index.ts，挂载路由之前
import rateLimit from 'express-rate-limit'
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,                          // 每 IP 15 分钟 30 次（login+register+refresh 共用）
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' },
}))
```

可选增强：登录失败连续 5 次后对账号加短暂冷却（内存 Map 即可，或用 `settings` 表做分布式锁）。

### H2. 聊天页"浏览器返回即焚毁对话"守卫在生产环境完全失效
`client/src/pages/ChatPage.tsx:148-157`：

```ts
window.history.pushState({ chatGuard: true }, '')
const onPopState = (e: PopStateEvent) => {
  if (!e.state?.chatGuard) return   // ← 判断反了
  window.history.pushState({ chatGuard: true }, '')
  requestLeaveRef.current()
}
```

`popstate` 的 `e.state` 是**将要进入**的那条 history entry 的状态。守卫 entry（`{chatGuard:true}`）总是压在最上层，按返回键时永远是从守卫 entry 弹到**无状态**的 chat entry，`e.state` 恒为 `null` → 直接 return。结果：

- 生产构建下（无 StrictMode 双挂载）按返回键第一次无任何反应（弹回同 URL 的 chat entry），第二次直接离开聊天页，**既不弹确认框也不烧毁对话**，对话留在数据库里，与"exit-to-burn"隐私设计完全相反。
- 开发模式（React StrictMode 会 mount→unmount→mount，pushState 执行两次）恰好压了两个守卫 entry，第一次返回时 `e.state` 反而是 `{chatGuard:true}`，所以**开发时看起来是好的**——这是典型的"dev 正常、prod 坏掉"。

**修复**：拦截任何一次 popstate（只要聊天页还挂载着），重新压入守卫并进入确认流程：

```ts
useEffect(() => {
  window.history.pushState({ chatGuard: true }, '')
  const onPopState = () => {
    // 无论弹到哪条 entry，只要聊天页还挂着，就重新压守卫并走确认流程
    window.history.pushState({ chatGuard: true }, '')
    requestLeaveRef.current()
  }
  window.addEventListener('popstate', onPopState)
  return () => window.removeEventListener('popstate', onPopState)
}, [])
```

### H3. 管理员硬删除用户不是事务 —— 中途失败会留下半删状态
`server/src/routes/admin.ts:127-140` 依次执行 4 条 DELETE，任一条失败则前面已删、后面未删（如 `refresh_tokens` 删了但 `readings` 没删）。虽然 FK 大多设了 CASCADE，但**没有原子性保证**。

**修复**：

```ts
await sql.begin(async tx => {
  await tx`DELETE FROM refresh_tokens WHERE user_id = ${targetId}`
  await tx`DELETE FROM readings WHERE user_id = ${targetId}`
  await tx`DELETE FROM feedback WHERE user_id = ${targetId}`
  await tx`DELETE FROM users WHERE id = ${targetId}`
})
```

### H4. AI 解读/聊天可无限刷失败请求 —— 每次请求都消耗 API 费用
- `POST /api/readings/:id/ai-reading`（`readings.ts:68`）：配额只统计**成功**（`reading_source='ai'` 的行）。AI 调用失败（超时/502）不计数，用户可以无限重试，每次重试都真实调用外部 API，费用由项目方承担。
- 聊天同理：失败会 `refundChatQuota`，即失败不占配额。

**修复**（两处都做）：
1. 给 `/:id/ai-reading` 加与 chat 相同的按用户 rate-limit（如 10 次/15 分钟），并且失败也计数（把"失败不计"改成"计费尝试计数"，或至少按 IP/用户限频）；
2. 简单方案：路由挂 `rateLimit({ windowMs: 15*60*1000, limit: 10, keyGenerator: req => String(req.user.userId) })`，失败时保留配额计数而不是退款（把 refund 逻辑去掉或只在"保存失败"时退款）。

### H5. `createReading` 的离线回退判断与注释意图相反
`client/src/api.ts:139-158`：

```ts
} catch (err) {
  if (err instanceof Error && err.message !== '占卜创建失败' && !err.message.includes('API error')) {
    // 网络错误 —— 离线回退
    ...
  }
  throw err
}
```

注释说"只在网络错误时回退，服务器拒绝要抛出来"，但实现是**按错误消息字符串猜**。服务器业务拒绝（如 `Invalid spreadType`、`服务器内部错误` 500）只要消息不是恰好等于 `'占卜创建失败'`，就会**静默降级成本地记录**——用户以为保存成功，实际没上云。

**修复**：不要靠消息字符串区分，把 fetch 网络错误显式标记出来：

```ts
// api.ts
async function apiFetch(...) { ... }  // 不变

export async function createReading(req: ReadingRequest): Promise<Reading | LocalReading> {
  let res: Response
  try {
    res = await apiFetch('/readings', { method: 'POST', body: JSON.stringify(req) })
  } catch (err) {
    // 只有 fetch 抛出的网络错误才离线回退
    return createLocalReading(req)
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '占卜创建失败' }))
    throw new Error(err.error || '占卜创建失败')   // 服务器拒绝一律抛出
  }
  return res.json()
}
```

---

## 二、中等问题

### M1. 前 100 名活动名额计数器与用户创建不在同一事务
`auth.ts:100-111`：`PROMO_FIRST_100_TAKEN` 先自增，之后才 `INSERT INTO users`。若用户插入失败（并发抢注同邮箱、DB 抖动），名额已被消耗；且计数器可能与真实用户数不一致。

**修复**：把自增和用户插入放进同一个 `sql.begin`，用返回值决定 role：

```ts
const { userId, role } = await sql.begin(async tx => {
  const seq = await tx`
    INSERT INTO settings (key, value) VALUES ('PROMO_FIRST_100_TAKEN', '1')
    ON CONFLICT (key) DO UPDATE SET value = (settings.value::int + 1)::text
    RETURNING value::int
  `
  const role = seq[0].value <= 100 ? 'premium' : 'free'
  const result = await tx`
    INSERT INTO users (email, phone, password_hash, display_name, accepted_terms_version, accepted_terms_at, role)
    VALUES (...) RETURNING id
  `
  return { userId: result[0].id, role }
})
```

### M2. 角色变更最长 15 分钟才生效（JWT claim 优先于 DB）
`middleware/auth.ts:47-54`：`requireRole` 只有在 token 里**没有** role claim 时才查库，而本项目签发的 token 永远带 role → 降权的管理员在 access token 有效期内（15 分钟）仍可调用管理接口。

**修复**（二选一）：
- `requireRole` 中总是查库（users 表按主键查，开销可忽略）；
- 或缩短 access token 有效期（如 5 分钟）。

### M3. 批量接口的 ids 未做类型校验
`readings.ts`（batch-delete/hide/unhide）与 `admin.ts`（batch-delete）：`sql(ids)` 直接接收 body 数组，非整数元素会导致 PG 类型错误 500，超大数组也有隐患。

**修复**：过滤 + 上限：

```ts
const ids = (req.body.ids || []).filter((x: unknown) => Number.isInteger(Number(x))).map(Number)
if (ids.length === 0 || ids.length > 500) {
  res.status(400).json({ error: '无效的 ID 列表' }); return
}
```

### M4. `AI_MAX_TOKENS` 无上限 —— 误设大值会产生巨额账单
`services/ai-reading.ts:171`：`aiReading` 用 `resolveMaxTokens()` 只校验正整数，管理员若设成 `999999`，单次请求 token 费用爆炸（`aiChat` 已 cap 到 2000，`aiReading` 没有）。

**修复**：

```ts
const maxTokens = Math.min(resolveMaxTokens(await getSetting('AI_MAX_TOKENS', '4000')), 8000)
```

### M5. 邮箱/手机号唯一性大小写敏感
`auth.ts:82`：`WHERE email = ${email}` 是大小写敏感的。`Foo@x.com` 与 `foo@x.com` 可注册成两个账号，且登录时输入大小写不一致会失败。

**修复**：注册/登录时统一 `email.toLowerCase()`，或把列改为 `citext`（`CREATE EXTENSION citext` + 唯一索引）。

### M6. ReadingResultPage 轮询无限进行
`pages/ReadingResultPage.tsx:69-83`：AI 结果为空时每 2s 轮询，**永不停止**（AI 一直失败就一直轮询）。应在 N 次后停止并提示。

**修复**：加次数上限：

```ts
let attempts = 0
const poll = setInterval(async () => {
  if (++attempts > 15) { clearInterval(poll); setPollFailed(true); return }
  ...
}, 2000)
```

### M7. 占卜创建失败后用户被静默送回首页
`App.tsx:174-179`：`createReading` 失败（如服务器 500）时只置 `apiDone`，`pendingReading` 为 null → `tryShowResult()` → `goHome()`。用户走完洗牌/切牌/抽牌全流程后被无声踢回首页，无任何提示。

**修复**：catch 里保存错误并展示（如导航到 result 页显示错误态，或在 analyzing 页显示"创建失败，请重试"按钮）。

### M8. 问题文本无长度限制
`readings.ts:34`：`question` 直接入库（body 上限 500KB），且 `AskPage.tsx:85` 的 input 没有 `maxLength`。超长问题会占库、每次 AI 调用都重复计费。

**修复**：服务端 `question.slice(0, 500)`（或校验返回 400）+ 前端 `maxLength={500}`。

### M9. Profile 昵称无长度/内容限制
`profile.ts:33`：`displayName` 任意长度直接入库（无 `sanitize`）。管理后台列表会因此变慢/变乱。

**修复**：`displayName = String(displayName ?? '').replace(/<[^>]*>/g, '').trim().slice(0, 50)`，空则忽略。

### M10. 配额语义与文案不一致
- 免费用户 AI 解读配额是**滚动 7 天**（`readings.ts:97`、`profile.ts:75`），聊天配额是**自然周（周一）**（`chat.ts:46`）——同一产品两套口径。
- `ResultPage.tsx:332` 限制提示写死"本周…（3 次）"，premium 用户（100/月）被限时也显示 3 次。
- `profile.ts:87` `features.aiReading` 对 free 返回 false，但 free 实际可用 3 次/周。

**修复**：统一为自然周（或统一滚动窗口）；limit 文案由接口返回的 `{limit, period}` 驱动。

### M11. 历史页本地记录永远排在服务器记录之后
`api.ts:177`：`[...remote, ...local]` —— 本地（离线）记录无论多新都排在最后，与时间排序矛盾。

**修复**：合并后按 `createdAt` 排序：`[...remote, ...local].sort((a, b) => b.createdAt.localeCompare(a.createdAt))`。

---

## 三、低风险 / 建议

| # | 位置 | 问题 | 建议 |
|---|------|------|------|
| L1 | `client/src/main.tsx` | 无 Error Boundary，任一页面运行时报错 → 整站白屏 | 加 ErrorBoundary + 兜底 UI |
| L2 | `router.ts:47` | `decodeURIComponent` 遇到畸形百分号编码会抛异常（如 `/result/%E0%A4%A`），导致整站崩溃 | 用 try/catch 包裹 |
| L3 | 全局 | 无测试、无 lint、无 CI | 至少补 `eslint` + 关键路由冒烟测试 |
| L4 | `db/index.ts` | 每次启动全量执行 DDL/索引/清理 | 可接受，但建议收敛为迁移脚本 |
| L5 | `readings.ts` | `is_public` 字段无任何公开读取路径，是死功能 | 删除或实现公开分享页 |
| L6 | `db/index.ts` | `.env.example` 声明了 `PG_SCHEMA` 但代码从未使用 | 删除或设置 `search_path` |
| L7 | client/server | `cards.json` 双份拷贝靠手动同步（当前哈希一致） | 加一个构建时校验脚本 |
| L8 | `index.ts` | helmet 未开 `Cross-Origin-Resource-Policy` / `Permissions-Policy` | 补两行配置 |
| L9 | `api.ts:46-54` | refresh 后重试仍 401 时不触发 `_onAuthExpired`，可能短暂停留"假登录"态 | 重试仍 401 时也调用 `_onAuthExpired()` |
| L10 | `AuthContext.tsx` | 无自动登出/空闲超时 | 产品需要时再加 |

---

## 四、修复优先级路线图

**P0（安全/隐私，尽快）**：H1 登录限流 → H2 返回键焚毁守卫 → H3 管理员删除事务化 → H4 AI 失败请求限流。
**P1（数据正确性）**：H5 离线回退判断 → M1 活动计数器事务化 → M3 ids 校验 → M5 邮箱大小写 → M8 问题长度限制 → M9 昵称限制。
**P2（体验/健壮性）**：M2 角色即时生效 → M4 token 上限 → M6 轮询上限 → M7 失败提示 → M10 配额口径统一 → M11 历史排序 → L1~L10。

> 注：以上修复均为最小改动方案；如需我直接落地实施（按 P0 → P1 → P2 顺序），告诉我即可。
