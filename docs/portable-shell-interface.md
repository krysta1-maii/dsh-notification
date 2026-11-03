# 便携壳体接入说明：通知与会话激活契约 v1

> 面向 `dsh-portable-shell` 的消费方文档

| 项目 | 内容 |
| --- | --- |
| 契约版本 | v1 |
| 适用插件 | `dsh-notification` 0.8.0 |
| 目标 DSH | 0.2.2-alpha.3 |
| 文档状态 | 已批准 |
| 日期 | 2026-11-04 |
| 关联文档 | [dsh-notification 0.8.0 升级施工计划](./upgrade-0.8.0-portable-activation.md) |
| 范围 | `NotificationReceived` → Windows 原生 toast → `dsh-portable` 协议 → hash → 插件打开会话 |

## 1. 适用范围

本文说明便携壳体如何消费 `dsh-notification` 的系统通知，并在用户点击 Windows 原生 toast 后把目标会话交给 DSH 页面。契约覆盖三件事：

1. 从 WebView2 `NotificationReceived` 的 `Tag` 解析出会话 id。
2. 把会话 id 与 nonce 写入 Windows toast 的启动参数，并在协议激活后注入页面 hash。
3. 插件侧对 hash 的消费、等待、打开、清 hash 与失败处理。

壳体 Phase 1 不依赖 `notification.onclick`，也不调用 `ReportClicked`。原生 toast 与插件之间只有两条数据通道：tag（壳体读取）与 hash（插件读取）。

## 2. 端到端流程

```text
WebView2 NotificationReceived
  → 读取 Tag / Title / Body / SenderOrigin
  → 校验 origin 是 DSH 页面
  → 按 tag 语法解析 sessionId
  → 生成 nonce，构造 dsh-portable://open-session?session=...&n=...
  → 发送 Windows 原生 toast（Launch 参数携带上述 URI）
  → 用户点击
  → 壳体单实例激活，确保后端就绪、页面加载
  → location.hash = "#dsh-session=...&n=..."
  → 插件等待 sessions.list 就绪并打开会话
  → 插件清 hash
```

## 3. 通知接收与 tag 语法

壳体当前已经在 `NotificationReceived` 中读取 `Notification.Tag` 并校验 `SenderOrigin`（[`ui.rs:559–596`](/home/andyk/projects-dsh/dsh-portable-shell/src-tauri/src/ui.rs#L559-L596)）。继续沿用这个入口即可。

### 3.1 可用字段

| 字段 | 用途 |
| --- | --- |
| `Tag` | 唯一的结构化数据通道；解析会话 id 与序号 |
| `Title` / `Body` | 原生 toast 的标题与正文；保持插件传入的本地化文本 |
| `SenderOrigin` | 校验通知来自 DSH 页面，而不是外部页面 |

### 3.2 tag 语法

```text
completion := "dsh-notification-" sessionId "-" turn
pending    := "dsh-notification-pending-" sessionId "-" sequence
test       := "dsh-notification-test-" digits
sessionId  := 1*(ALPHA / DIGIT / "." / "_" / "-")
turn       := 1*DIGIT
sequence   := 1*DIGIT
```

| 类型 | 代码 | 真实 id 下的样子 | 前缀长度 |
| --- | --- | --- | --- |
| 完成 | `dsh-notification-${sessionId}-${turn}` | `dsh-notification-session-<uuid>-3` | 17 |
| 待交互 | `dsh-notification-pending-${sessionId}-${sequence}` | `dsh-notification-pending-session-<uuid>-2` | 25 |
| 测试 | `dsh-notification-test-${Date.now()}` | `dsh-notification-test-1760000000000` | 22 |

用户看到的 `dsh-notification-session-<uuid>-<turn>` 中的 `session-` 是 DSH 会话 id 的前缀，不是 tag 的固定段。DSH 实际用 `session-${randomUUID()}` 或 `${agentId}-session-${randomUUID()}` 生成 id，所以 id 可能包含多个连字符，也可能以数字结尾。

### 3.3 解析算法

必须“最长前缀优先”：

1. 以 `dsh-notification-pending-` 开头：去掉前缀，按最后一个 `-` 切开，右侧必须是纯数字；左侧是 sessionId，类型 pending。
2. 以 `dsh-notification-test-` 开头：去掉前缀，右侧必须是纯数字；类型 test，无 sessionId。
3. 以 `dsh-notification-` 开头：去掉前缀，按最后一个 `-` 切开，右侧必须是纯数字；左侧是 sessionId，类型 completion。
4. 其他前缀：未知 tag，不激活。

如果先匹配短前缀 `dsh-notification-`，pending 的 sessionId 会被错解析成 `pending-session-...`。因此前缀判断顺序是契约的一部分。

### 3.4 sessionId 校验

sessionId 还要做基本校验：非空、长度不超过 200、只含 `[A-Za-z0-9._-]`、不含空白与控制字符。不要用“必须是 UUID”这种过窄规则；DSH 的 id 可能是 `${agentId}-session-${uuid}`。真正的准入由插件的 `sessions.list` 成员检查完成。

### 3.5 非会话与未知 tag

| tag | 处理 |
| --- | --- |
| `dsh-notification-test-...` | 显示普通 toast；点击最多聚焦窗口；不构造 `open-session` URI |
| 其他插件产生的 tag | 不要猜；按普通通知处理或忽略；不要套用本插件的解析规则 |
| 后缀不是数字 | 记录日志并忽略；不要截断或猜测 |
| sessionId 校验失败 | 记录日志并忽略；不要构造 URI |

## 4. Windows 原生 toast

### 4.1 Windows Tag 哈希

Windows Tag 上限 64 字符，而本插件的原始 tag 可能超过：

| 类型 | 长度公式 | 实际长度 |
| --- | --- | --- |
| 完成，turn 1–9 | 17 + 44 + 1 + 1 | 63 |
| 完成，turn 10–99 | 17 + 44 + 1 + 2 | 64 |
| 完成，turn 100+ | 17 + 44 + 1 + 3 | 65 |
| 待交互 | 25 + 44 + 1 + 位数 | 至少 71 |
| 测试 | 22 + 13 | 35 |

其中 44 是 `session-` 加 36 字符 UUID 的长度。因此**所有** tag 都要哈希，不能只哈希 pending。

建议算法：

```text
winTag = "dshn-" + lowerhex(sha256(originalTag))[0..32]
```

长度 37，满足 64 上限。摘要取 16–32 个十六进制字符均可；32 个字符碰撞概率可以忽略。Windows 以 Tag 去重，哈希碰撞会替换旧 toast，所以不要用太短的摘要。

### 4.2 Launch 参数

会话 id 必须在收到通知时就解析出来，并写入 toast 的 Launch 参数。不要只保存“winTag → 原始 tag”的进程内映射；壳体重启后 Action Center 里的旧 toast 仍然可以被点击，但映射已经不存在。Launch URI 自包含，才是可靠契约。

推荐格式：

```text
dsh-portable://open-session?session=<percent-encoded sessionId>&n=<nonce>
```

nonce 在通知接收时生成，建议 UUID 或 16–32 位十六进制；每次激活唯一，不要复用。用户重复点击同一条 toast 时，nonce 仍然不同，壳体因此可以强制产生新的 `hashchange`。

### 4.3 去重与 Action Center

- Windows Tag 用于 toast 替换/分组；原始 tag 的唯一性由 sessionId + turn/sequence 保证。
- 测试通知的 tag 每次不同（`Date.now()`），哈希也每次不同，因此不会被旧 toast 吞掉。
- Action Center 的旧 toast 可能在壳体重启后仍可点击；Launch URI 必须自包含，不依赖内存状态。
- 如果壳体需要“同会话只保留一条 toast”的展示策略，可以按 sessionId 分组；但不要因此丢掉 turn/sequence 的唯一性，否则新的完成通知可能替换旧的而未提示。

## 5. 协议激活与 hash 注入

### 5.1 协议处理器

1. 只接受 `open-session` 动作；未知动作、空 session、超长输入直接拒绝并记日志。
2. 单实例激活：已有窗口则恢复/置前，没有则启动。
3. 确保 DSH 后端就绪，再确保主窗口加载的是 DSH 页面。
4. 页面已加载时直接注入 hash；页面还在加载时，等最终导航完成后再注入，避免认证重定向丢掉 fragment。
5. 注入方式必须是 `location.hash = ...`，不是 `history.replaceState`。只有前者会触发 `hashchange`；后者在已加载页面上不会通知插件。
6. 对 sessionId 和 nonce 做 `encodeURIComponent`。

```js
window.location.hash =
  '#dsh-session=' + encodeURIComponent(sessionId) +
  '&n=' + encodeURIComponent(nonce)
```

### 5.2 注入时机

| 页面状态 | 动作 |
| --- | --- |
| 页面已加载，插件已运行 | 立即设置 hash；触发 `hashchange` |
| 页面正在加载，插件未运行 | 等 `load` 或最终导航完成后设置；插件 attach 时读当前 hash |
| 认证重定向尚未完成 | 不要提前设置；等最终 URL 稳定后再设置 |
| 页面加载失败/超时 | 记录日志，给用户原生提示；不要无限等待 |

页面加载超时建议 30 秒。这个超时是壳体的等待上限，与插件的 20 秒激活超时相互独立。

### 5.3 连续点击

每次点击都使用新的 nonce；壳体只设置最新一次的 hash。插件侧会把新 hash 替换旧 pending，旧定时器取消，只有最新目标能调用 `openSession`。壳体不需要自己维护“最后一次”的状态，只要保证 nonce 不重复、注入顺序与实际点击顺序一致。

## 6. 插件侧行为

壳体可以预期插件做以下事情：

- 在 `uiWorkspace` 服务可用时读取当前 hash，并注册 `hashchange`；hash 早于或晚于插件都能处理。
- 等 `sessions.list.phase === 'ready'` 且目标 id 出现在列表；如果 `workspaces` 可用，再等 `workspaces.phase === 'ready'` 并检查归档。
- 调用 `uiWorkspace.openSession(id)`；成功后用 `history.replaceState` 清 hash，保留 pathname 与 query。
- 20 秒内未完成则记一条 warn、清 hash、放弃；不弹 UI、不循环重试。
- 连续 hash 时最后一次目标生效；同 nonce 忽略；同会话 750ms 内重复打开被去重。
- `uiWorkspace` 缺席时不导航，hash 可能保留；插件本身仍正常加载。
- 不依赖 `ReportClicked`；非壳体浏览器的 `notification.onclick` 路径保持原样。

壳体不需要等待插件回执。如果 Phase 2 需要确认，可以轮询 hash 是否被清，或增加一条 `postMessage`；Phase 1 用日志即可。

## 7. 安全边界

- 只处理来自 DSH 页面 origin 的通知；当前 `SenderOrigin` 校验继续保留。
- 协议处理器只接受 `open-session`，拒绝 `javascript:`、`file:`、任意路径和超长参数。
- sessionId 做字符集与长度校验；真正的准入由插件的 `sessions.list` 成员检查完成。
- 不要把 DSH 的认证 token 放进 toast URI；只需要 sessionId 与 nonce。
- hash 不是秘密，任何能操作该页面的人都能设置；它的作用只是导航，不授予数据权限。
- 不要对非 DSH 页面注入 hash；不要把协议参数拼接成可执行脚本。

## 8. 日志与可观测性

建议壳体记录：

| 事件 | 字段 |
| --- | --- |
| 收到通知 | 原始 tag、解析出的 sessionId、类型、序号 |
| 生成 toast | winTag、Launch URI、nonce |
| 协议激活 | URI、动作、单实例结果、后端就绪耗时、页面就绪耗时 |
| 注入 hash | sessionId、nonce、注入时间 |
| 失败 | 解析失败、校验失败、页面超时、注入失败、重复激活 |

插件会记录 `[dsh-notification] activation ...` 系列日志，包括等待、打开、归档、超时、失败。两边日志都只包含会话 id 与 nonce，不包含 token。

## 9. 测试向量

以下向量使用固定 sessionId `session-123e4567-e89b-12d3-a456-426614174000`，可以直接用于壳体侧单元测试。

| 用例 | 原始 tag | 长度 | SHA-256 | 期望 Windows Tag |
| --- | --- | --- | --- | --- |
| 完成，turn 3 | `dsh-notification-session-123e4567-e89b-12d3-a456-426614174000-3` | 63 | `b4afdce8abdc64a75e660c0b86aaa5a2cab31fde69f14d50842cfaa3783a9ce8` | `dshn-b4afdce8abdc64a75e660c0b86aaa5a2` |
| 待交互，sequence 2 | `dsh-notification-pending-session-123e4567-e89b-12d3-a456-426614174000-2` | 71 | `3e694cb8060d1d13ed46ee3340cd3d417238bf465e3335b40462f79ca31cd84c` | `dshn-3e694cb8060d1d13ed46ee3340cd3d41` |
| 测试 | `dsh-notification-test-1760000000000` | 35 | `a9eedf44bfded4b7902721bae7a8cd12e790fa7ecc18ba79a5736efa84e7c95c` | `dshn-a9eedf44bfded4b7902721bae7a8cd12` |
| 完成，turn 100 | `dsh-notification-session-123e4567-e89b-12d3-a456-426614174000-100` | 65 | `70452e30f5f78bca354c2904034374588c35afff9ad4b8ccbe74cb5454218b2a` | `dshn-70452e30f5f78bca354c290403437458` |

解析期望：

| 原始 tag | 类型 | sessionId | 序号 |
| --- | --- | --- | --- |
| 上表完成 tag | completion | `session-123e4567-e89b-12d3-a456-426614174000` | 3 |
| 上表待交互 tag | pending | `session-123e4567-e89b-12d3-a456-426614174000` | 2 |
| 上表测试 tag | test | 无 | 无 |
| `dsh-notification-session-...-x` | 无效 | 无 | 无 |
| `other-plugin-...` | 未知 | 无 | 无 |

hash 示例：

```text
#dsh-session=session-123e4567-e89b-12d3-a456-426614174000&n=8f3a1c2e4b5d6f708192a3b4c5d6e7f8
```

壳体测试应覆盖：turn 1/100 的长度边界、pending 恒超 64、test 无会话、后缀非数字、前缀优先级、id 以数字结尾、URL 编码后的 id 与 nonce、Action Center 壳体重启后点击。

## 10. 版本演进

契约 v1 内不改 tag 格式。若未来必须改，新增前缀（例如 `dsh-notification-v2-`）并保留 v1 解析器；壳体同时支持两代，未知前缀忽略。hash 如需扩展，加 `v=2` 参数，插件在过渡期同时接受 v1/v2。

部署顺序建议先发插件 0.8.0，再发壳体：旧壳体不写 hash，插件不受影响；新壳体写 hash 时插件已经能消费。反过来先发壳体的话，旧插件会忽略 hash，点击只能聚焦窗口。

## 11. 实施清单

- [ ] 保留 `NotificationReceived` 的 origin 校验。
- [ ] 按最长前缀解析 tag，校验后缀为数字。
- [ ] 校验 sessionId 字符集与长度。
- [ ] 在接收时构造 Launch URI，写入 nonce。
- [ ] 对所有 tag 计算 Windows Tag 哈希，长度不超过 64。
- [ ] 注册 `dsh-portable` 协议，处理单实例激活。
- [ ] 确保后端就绪、页面加载完成后再注入 hash。
- [ ] 用 `location.hash` 注入，不用 `history.replaceState`。
- [ ] 每次激活使用新 nonce；连续点击以最后一次为准。
- [ ] test/未知 tag 只做普通通知，不激活会话。
- [ ] 记录通知、解析、注入、超时日志。
- [ ] 用第 9 节向量做单元测试，并验收 Action Center 重启后点击。
- [ ] 验证会话不存在/已归档时插件不崩溃、窗口仍可用。

## 12. 失败矩阵

| 现象 | 可能原因 | 壳体侧处理 | 插件侧表现 |
| --- | --- | --- | --- |
| 点击 toast 只聚焦，不换会话 | hash 未注入；或插件未加载；或 sessionId 不在列表 | 检查注入时机与 origin；查看页面 hash | 无待处理目标；或超时后清 hash |
| 注入 hash 后无反应 | 用了 `history.replaceState` 设置 hash | 改用 `location.hash = ...` | 收不到 `hashchange` |
| 刷新后重复打开 | 插件未清 hash；或壳体重复写入 | 检查插件日志；确认成功/失败都清 hash | 可能重复激活 |
| Action Center 旧 toast 点击无效 | Launch URI 依赖内存映射；壳体重启后映射丢失 | 把 sessionId 写入 Launch URI | 收不到 hash |
| Windows 不显示新 toast | winTag 超过 64 或碰撞被替换 | 哈希所有 tag；检查 winTag 长度 | 无感知 |
| 目标会话被清掉 | 会话已归档 | 可忽略；或壳体自己提示 | 归档检查后清 hash |
| 页面加载慢导致激活失败 | 壳体在页面未就绪时注入 | 等最终导航完成；30s 上限 | attach 时读 hash，仍可恢复 |
| 连续点击只打开第一个 | nonce 复用，未触发 `hashchange` | 每次点击生成新 nonce | 同 nonce 被忽略 |

## 13. 变更记录

| 日期 | 版本 | 内容 |
| --- | --- | --- |
| 2026-11-04 | 1.0 | 初版；定义 tag 语法、Windows Tag 哈希、Launch URI、协议激活、hash 注入、测试向量与实施清单 |
