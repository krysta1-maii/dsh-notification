# dsh-notification 0.8.0 升级施工计划

> 便携壳体 WebView2 通知与会话激活

| 项目 | 内容 |
| --- | --- |
| 文档状态 | 已批准，已实施（2026-11-04） |
| 适用插件 | `dsh-notification` 0.7.7 → 0.8.0 |
| 目标 DSH | 0.2.2-alpha.3 |
| 契约版本 | v1（tag 与 hash 格式冻结） |
| 日期 | 2026-11-04 |
| 关联文档 | [便携壳体接口消费说明](./portable-shell-interface.md) |
| 本轮范围 | WP1–WP8：代码、测试、构建、文档与 `link:` 模式安装 |

## 0. 结论

本次升级是纯客户端增量：在 `dsh-notification` 内增加一个 hash 激活控制器，消费便携壳体写入的 `#dsh-session=<id>&n=<nonce>`，等待 `sessions.list` 就绪后调用 `uiWorkspace.openSession(id)`，成功后清掉 hash。Host 半、session projection、设置 schema、通知 tag 格式都不变。

可行性已经在本机 DSH 0.2.2-alpha.3 上逐项核对：`uiWorkspace.openSession` 存在且被 DSH 自己的多个客户端包使用；`sessions.list` 暴露 `phase`、`ids`、`byId` 与 `refresh()`；DSH 前端没有 hash 路由；`history.replaceState` 清 hash 不会触发路由或重载。真正的风险不在 DSH 接口，而在三处契约：通知 tag 的格式、Windows Tag 的 64 字符上限，以及安装目录与 profile 的链接方式。实施时已把 profile 从 `file:` 硬链接副本切换为 `link:` 符号链接。

## 1. 目标与验收基线

功能目标：

1. 壳体在原生 toast 点击后，把目标会话 id 与 nonce 通过 hash 交给页面。
2. 插件在冷启动（hash 早于插件）与热路径（hash 晚于插件）下都能打开目标会话。
3. 打开成功后清除 hash，保留 pathname 与 query；失败、超时、归档、删除都不产生未处理异常。
4. 连续点击多个通知时，最后一次目标生效；重复点击不产生重复打开。
5. 不改变现有完成通知、待交互通知、测试通知、应用内横幅与非壳体浏览器 `onclick` 的行为。

工程目标：

- `pnpm run typecheck`、`pnpm run test`、`pnpm run build` 全绿。
- `lib/` 重建并与源码同一次提交。
- README、README.zh、INSTALL 的版本与 DSH 目标同步。
- 安装目录与 profile 解析到同一份新产物。

## 2. 范围与非目标

| 范围 | 内容 |
| --- | --- |
| 在范围内 | `src/client/deeplink.ts`、`src/client/index.ts` 接线、`src/client/notifier.ts` 常量、客户端测试、README/INSTALL、`lib/` |
| 不在范围内 | 壳体代码、DSH 源码、URL 路由、设置页新开关、tag 格式变更、`ReportClicked`、host 端 projection |
| 明确不做 | 不把功能拆成独立插件；不新增运行时依赖；不改 `engines.dsh`；不改 `dsh.client.inject` |

## 3. 已确认的决策

| 决策项 | 结论 |
| --- | --- |
| 版本号 | 0.7.7 → 0.8.0 |
| 超时 | 20 秒 |
| 同 id 去重窗口 | 750ms |
| 归档检查 | 做；`workspaces` 可用时检查 `archivedSessionIds` |
| 设置开关 | 不加，避免 `dsh-notification.v4` 升级 |
| 独立插件 | 暂不拆；先以 `src/client/deeplink.ts` 隔离 |
| 壳体回执 | Phase 1 不做；Phase 2 可选 postMessage 或轮询 hash 是否被清 |
| tag 格式 | 保持 v1 不变 |
| 部署顺序 | 先发插件 0.8.0，再发壳体 |

## 4. 现状与改动面

### 4.1 现有客户端路径

插件入口在 [`src/client/index.ts`](../src/client/index.ts#L98)。必选服务只有 `sessions`、`slots`、`locale`（[第 39 行](../src/client/index.ts#L39)）；`uiWorkspace` 通过可选注入延迟获取（[第 113–117 行](../src/client/index.ts#L113-L117)），点击时再绑定 `openSession`（[第 134–143 行](../src/client/index.ts#L134-L143)）。完成与待交互通知的 tag 定义在 [`src/client/notifier.ts:63–70`](../src/client/notifier.ts#L63-L70)，测试通知的 tag 在 [`src/client/index.ts:183–189`](../src/client/index.ts#L183-L189)。

冷启动时 `sessions.list` 初始为 `{ ids: [], byId: {}, phase: 'pending' }`（[`dsh-api-session-controller/lib/client.js:3830–3835`](/home/andyk/.nvm/versions/node/v24.22.1/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/lib/client.js#L3830-L3835)），连接 generation 就绪后第一次 `session.list` 成功才翻到 `ready`（[`:3586–3600`](/home/andyk/.nvm/versions/node/v24.22.1/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/lib/client.js#L3586-L3600)、[`:3261–3300`](/home/andyk/.nvm/versions/node/v24.22.1/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/lib/client.js#L3261-L3300)）。`uiWorkspace` 可能早于或晚于 `apply()` 出现；Cordis 的 `inject` 回调会先 `await Promise.resolve()` 再执行（[`cordis/lib/index.js:668–677`](../node_modules/@deepseek-ai/cordis/lib/index.js#L668-L677)），所以不能假设它在 `apply()` 返回时就已赋值。

`openSession` 的行为已经核对：

- 未列出 id：`sessions.retain` 的 `resolveTarget` 同步抛出 `sessions.retain: unknown session <id>`（[`dsh-api-session-controller/lib/client.js:3022–3029`](/home/andyk/.nvm/versions/node/v24.22.1/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/lib/client.js#L3022-L3029)）。
- 已归档 id：`openSession` 不拒绝，会设置选择；工作区观察器在下一次 reconcile 时清掉已归档的当前选择（[`ui-workspace/client.js:1647–1653`](/home/andyk/.nvm/versions/node/v24.22.1/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-workspace/lib/client.js#L1647-L1653)）。UI 自身另有 `guardedOpen` 拦截（[`:3686–3692`](/home/andyk/.nvm/versions/node/v24.22.1/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-workspace/lib/client.js#L3686-L3692)）。
- 空白会话：按普通已列出会话处理，显示空白草稿，没有专门拒绝逻辑。
- 幂等性：每次调用都会 `sessions.retain` 新建引用并释放旧引用（[`ui-workspace/client.js:1661–1684`](/home/andyk/.nvm/versions/node/v24.22.1/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-workspace/lib/client.js#L1661-L1684)），所以不是严格幂等；同一 id 连续调用不会抛错，但会产生重复的 retain/release 与选择写入。

### 4.2 改动面

| 文件 | 动作 | 内容 |
| --- | --- | --- |
| `src/client/deeplink.ts` | 新增 | hash 解析、激活控制器、等待/超时/去重/清 hash |
| [`src/client/index.ts`](../src/client/index.ts) | 修改 | 扩展本地列表类型；在 `uiWorkspace` 回调中接线；抽出共享 `reveal` |
| [`src/client/notifier.ts`](../src/client/notifier.ts) | 小改 | 提取 tag 前缀常量与测试 tag 构造函数；输出字符串不变 |
| `tests/deeplink.spec.ts` | 新增 | 解析器与控制器单元测试 |
| [`tests/notifier.spec.ts`](../tests/notifier.spec.ts#L68-L78) | 修改 | 补 tag 长度、前缀优先级、真实 id 向量 |
| [`tests/client-wiring.spec.ts`](../tests/client-wiring.spec.ts#L236-L257) | 修改 | 补 `window.location`/`history` stub、hash 激活、onclick 与 hash 去重 |
| [`tests/client-composition.spec.ts`](../tests/client-composition.spec.ts#L612-L664) | 修改 | 补带 hash 启动、无 `uiWorkspace` 降级 |
| [`package.json`](../package.json#L4)、[README.md](../README.md#L29)、[README.zh.md](../README.zh.md)、[INSTALL.zh-CN.md](../INSTALL.zh-CN.md#L1-L3) | 修改 | 版本、DSH 目标、契约说明 |
| `lib/` | 重建 | client bundle、types、sourcemap |

### 4.3 不动的部分

[`src/index.ts`](../src/index.ts)、[`src/projection.ts`](../src/projection.ts)、[`src/contract.ts`](../src/contract.ts)、[`cordis.patch.yml`](../cordis.patch.yml)、设置键 `dsh-notification.v4`、`engines.dsh`、`dsh.client.inject`、`peerDependencies` 都不改。[`src/client/click.ts`](../src/client/click.ts) 保持纯决策函数不变；共享 `reveal` 放在 `index.ts`，内部仍调用 `activateNotificationTarget`。

## 5. 详细设计

### 5.1 新增模块 `src/client/deeplink.ts`

模块只负责解析 hash、维护一次激活的状态机、在合适的时候调用外部注入的 `openSession`。它不直接读 `window`，也不直接操作 `history`，浏览器能力全部通过依赖注入，便于在 node 测试环境验证。

```ts
export interface ActivationRequest {
  readonly sessionId: string
  readonly nonce: string
}

export function parseActivationHash(hash: string): ActivationRequest | undefined

export interface ActivationDeps {
  readonly readHash: () => string
  readonly clearHash: () => void
  readonly subscribeList: (listener: () => void) => () => void
  readonly getList: () => {
    readonly phase: 'pending' | 'ready'
    readonly ids: readonly string[]
    readonly byId: Readonly<Record<string, unknown>>
  }
  readonly getWorkspaces?: () => {
    readonly phase: 'pending' | 'ready'
    readonly archivedSessionIds: readonly string[]
  } | undefined
  readonly openSession: (id: string) => void
  readonly refresh?: () => Promise<void>
  readonly now: () => number
  readonly setTimer: (callback: () => void, ms: number) => unknown
  readonly clearTimer: (handle: unknown) => void
  readonly log: (message: string) => void
}

export interface ActivationController {
  handleHash(hash: string): void
  flush(): void
  dispose(): void
}
```

解析规则：去掉前导 `#` 后用 `URLSearchParams` 读取 `dsh-session` 与 `n`。`dsh-session` 为空、超过 200 字符、含控制字符时返回 `undefined`。`n` 允许缺失，但壳体应始终提供；缺失时同一会话的连续点击无法靠 nonce 强制触发 `hashchange`。

### 5.2 状态机

状态只有 `idle`、`pending`、`opening`、`done`。`done` 表示当前没有待处理目标，控制器继续订阅列表，等待下一次 hash。

| 状态 | 事件 | 动作 |
| --- | --- | --- |
| idle | 收到合法 hash | 记录 `{ sessionId, nonce, deadline, generation }`，进入 pending，启动 20s 定时器，调用 `flush` |
| pending | 列表未 ready | 等订阅更新 |
| pending | 列表 ready、id 在列、workspaces 未 ready | 等 workspaces 更新 |
| pending | 目标已归档 | 记日志、清 hash、丢弃目标 |
| pending | 列表 ready、id 不在列 | 首次调用一次 `refresh()`，继续等 |
| pending | 全部条件满足 | 进入 opening，调用 `openSession` |
| opening | 调用返回 | 清 hash、记录 nonce、丢弃目标，回到 idle |
| pending | 超时 | 记 warn、清 hash、丢弃目标 |
| pending | 收到新 hash | 取消旧定时器、代际号加一、替换目标、重新计时 |

`flush` 是唯一执行入口，订阅回调与 `handleHash` 都调用它；`openSession` 同步执行，因此不需要异步锁，只要保证“代际号仍然是当前代际”再调用。

### 5.3 `index.ts` 接线

需要三处小改。

第一，扩展本地类型。`NotificationSessionListState` 增加 `phase: 'pending' | 'ready'`；`SessionsListFace` 增加可选的 `refresh(): Promise<void>`。真实服务已经暴露这些字段（[`service.d.ts:50–60`](/home/andyk/.nvm/versions/node/v24.22.1/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/lib/types/client/sessions/service.d.ts#L50-L60)、[`contract/sessions.d.ts:104`](/home/andyk/.nvm/versions/node/v24.22.1/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/lib/types/client/contract/sessions.d.ts#L104)），只是本地接口之前没有声明。

第二，新增可选的 `WorkspacesFace`，在 `uiWorkspace` 回调里用 `scope.get('workspaces')` 读取。`uiWorkspace` 本身依赖 `workspaces`，所以回调执行时通常已经可用；读不到就跳过归档检查，退化为“只查 sessions 列表”。

第三，在 `uiWorkspace` 回调里创建控制器：

- `readHash` 读 `window.location.hash`。
- `clearHash` 用 `history.replaceState(null, '', location.pathname + location.search)`，包 try/catch；失败时回退 `location.hash = ''`。
- `subscribeList` / `getList` 直接用 `sessions.list`。
- `getWorkspaces` 读 `workspaces?.list.getSnapshot()`。
- `openSession` 调用共享 `reveal({ sessionId })`，与点击路径共用去重。
- `refresh` 绑定 `sessions.refresh`。
- 定时器与 `Date.now` 直接注入浏览器实现。

回调里先 `window.addEventListener('hashchange', onHash)`，再主动 `onHash()` 读一次当前 hash；返回的 disposer 依次移除监听、`controller.dispose()`、把 `uiWorkspace` 置空。这样“hash 早于插件”和“hash 晚于插件”都走同一条路径。

共享 `reveal` 只多做一件事：按 sessionId 记录最近一次打开时间，750ms 内重复调用直接返回。它仍然调用 `activateNotificationTarget`，保留现有的 `isListed` 检查与异常吞掉行为。这样 Phase 1 的 hash 路径与 onclick 路径即使同时触发，也最多打开一次；Phase 2 如果壳体调用 `ReportClicked`，同样受保护。

### 5.4 tag 常量

在 `notifier.ts` 里把三个前缀提成常量，并新增 `testNotificationTag()`；`notificationTag`、`pendingNotificationTag` 和 `index.ts` 里的测试通知都改用常量。输出字符串保持逐字不变，现有 [`tests/notifier.spec.ts:68–78`](../tests/notifier.spec.ts#L68-L78) 的断言继续通过。这样 tag 格式只有一个定义点，后续加长度测试或壳体联调时不会出现两处字面量。

插件不新增运行时 tag 解析器。插件是生产方，壳体是消费方；解析算法放在壳体侧，插件用常量与测试向量固定格式即可，避免 bundle 里多一段永远不会被调用的解析代码。

### 5.5 时序

冷启动路径：

```text
用户点击 toast
  → Windows 启动 dsh-portable://open-session?session=...&n=...
  → 壳体确保后端就绪、主窗口显示、页面加载完成
  → 壳体 location.hash = "#dsh-session=...&n=..."
  → 插件在 uiWorkspace 回调 attach 时读到 hash
  → 等 sessions.list.phase = ready 且 id 在列
  → reveal(sessionId) → uiWorkspace.openSession(id)
  → history.replaceState 清 hash
```

热路径只把“attach 时读一次”换成 `hashchange` 事件，其余相同。连续点击时，新 hash 替换旧 pending，旧定时器取消；只有最新代际能调用 `openSession`。

### 5.6 边界处理

| 场景 | 处理 |
| --- | --- |
| `uiWorkspace` 缺席 | 控制器不创建，hash 保留，插件正常加载 |
| `sessions.list` 长时间 pending | 等到 20s 截止，记 warn，清 hash |
| ready 但 id 不在列 | 首次调用一次 `sessions.refresh()`，之后只等，不循环 |
| 目标已归档 | 记日志、清 hash、不打开 |
| 目标已删除 | 与“不在列”相同，超时后放弃 |
| 空白会话 | 按普通会话打开；通知不会以空白会话为目标 |
| 子代理会话 | 通知 runner 本就跳过 subagent；若 hash 误传，控制器捕获异常并清 hash |
| 连接重置 | 继续等；`phase` 单调，不因瞬时空列表立即放弃，以截止时间为准 |
| 同一 nonce 重复 | 忽略 |
| 同会话新 nonce | 750ms 内被去重窗口抑制；超过窗口则重新打开 |
| `openSession` 抛错 | 记日志、清 hash、不向上抛 |
| `replaceState` 抛错 | 回退 `location.hash = ''`，记日志 |
| 多标签页 | hash 只作用于目标页；选择通过 `dsh.sessions.current` 共享，属于 DSH 现有行为 |

## 6. 工作包与顺序

| 工作包 | 内容 | 依赖 | 估时 | 完成标准 |
| --- | --- | --- | --- | --- |
| WP1 | 契约常量、类型扩展、`deeplink.ts` 解析器 | 无 | 2h | 解析器单测通过 |
| WP2 | 激活控制器：等待、超时、refresh、归档、去重、清 hash | WP1 | 4h | 控制器单测覆盖全部状态迁移 |
| WP3 | `index.ts` 接线、共享 `reveal`、`workspaces` 可选读取 | WP2 | 3h | wiring 测试中 hash 可打开 |
| WP4 | `notifier.ts` 前缀常量化、测试 tag helper | 无 | 1h | 现有 tag 断言不变 |
| WP5 | 单元测试：解析、状态机、nonce、超时、异常 | WP1–WP4 | 4h | 新模块行覆盖率高，边界都有用例 |
| WP6 | wiring / composition 测试：窗口 stub、onclick 去重、真实 DSH 启动 | WP3 | 4h | 现有测试全绿，新增场景通过 |
| WP7 | 版本、README、INSTALL、契约说明 | WP1–WP6 | 2h | 文档与代码一致 |
| WP8 | 构建、安装、HMR/重启、手工验收、回滚演练 | WP7 | 3h | 验收清单逐项通过 |

总估时约 23 人时，折合 2–3 人日。WP1、WP4 可以并行；WP5 可与 WP3 交错；WP8 必须最后做。

实施顺序建议：先落 WP1/WP4 的纯函数与常量，再写 WP2 的状态机并用手工注入的假依赖跑通，最后才接 `index.ts`。这样在还没有浏览器环境时就能把大部分逻辑测完，接线阶段只负责 DOM 与 Cordis 生命周期。

## 7. 测试计划

单元测试覆盖：

1. `parseActivationHash`：正常、无 nonce、额外参数、URL 编码、空 id、超长 id、控制字符、重复参数。
2. 控制器：hash 早于列表 ready；列表 ready 且 id 存在；hash 晚于 ready；ready 但 id 缺失只 refresh 一次；20s 超时；归档；删除；连接重置后继续等待。
3. 去重：同 nonce 只处理一次；同会话新 nonce；连续两个 hash 只打开最后一个；旧目标晚到不覆盖新目标。
4. 异常：`openSession` 抛错；`replaceState` 抛错；`uiWorkspace` 缺席；控制器 dispose 后不再回调。
5. 清理：dispose 取消订阅、清定时器、丢弃 pending。

wiring 测试在现有 [`tests/client-wiring.spec.ts`](../tests/client-wiring.spec.ts) 的 `bootstrap` stub 里补 `location` 与 `history`，连接 `uiWorkspace` 后设置 hash，断言 `openSession` 调用一次；再模拟 `onclick` 与 hash 同时发生，断言仍然只有一次。composition 测试在真实 DSH 组合里带 hash 启动，验证有/无 `uiWorkspace` 两种降级。

手工验收至少覆盖：冷启动 hash 早于页面、热路径 hash 晚于页面、原生 toast 点击、应用已开在另一会话、连续点击两个 toast、归档/删除、20 秒超时、刷新后无残留、应用内横幅点击、非壳体浏览器 onclick、测试通知不导航、Action Center 壳体重启后点击、tag 长度边界。

命令：

```sh
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run check
```

## 8. 构建、版本与部署

`pnpm build` 会写 `lib/index.js`、`lib/client.js`、`lib/assets/icon.svg`、`lib/types/**/*.d.ts`，其中 client bundle 是页面实际加载的文件（[`build.mjs`](../build.mjs#L15-L55)）。版本号在 [`package.json:4`](../package.json#L4)，构建不会自动 bump。

安装目录是真实目录。profile 使用 `link:` 依赖（[`~/.dsh/profiles/web/package.json:36`](/home/andyk/.dsh/profiles/web/package.json#L36) 记录 `link:/home/andyk/.dsh-local-plugins/dsh-notification`），pnpm 在 `node_modules/dsh-notification` 建立指向该目录的符号链接（[`pnpm-workspace.yaml:4`](/home/andyk/.dsh/profiles/web/pnpm-workspace.yaml#L4)）。构建后只需覆盖安装目录中的产物，符号链接会立即指向新文件，不需要复制第二份或重新安装。`file:` 模式会生成硬链接副本，就地覆盖会断链、替换文件会留下旧副本，因此不再用于本插件；从旧安装切换到 link 模式时执行一次 `dsh plugin --profile web add link:<目录>`。

部署步骤：

1. 仓库内 `pnpm run check`，确认 typecheck、测试、构建都过。
2. bump `package.json` 到 `0.8.0`，同步 README/INSTALL 的版本与 DSH 目标。
3. 重建 `lib/`，提交源码与产物。
4. 把 `package.json`、`lib/`、`locale/`、`assets/`、`cordis.patch.yml`、README 与 `docs/` 复制到 `~/.dsh-local-plugins/dsh-notification`；link 模式下这就是唯一需要更新的位置。
5. 观察 HMR 是否重载 client bundle；没有则刷新页面。只有 `lib/index.js` 或 host 字段变化才重启 `dsh web`。
6. 按验收清单逐项验证；重点看冷启动、原生 toast、连续点击、归档/删除、Action Center 重启。
7. 回滚时用 `~/.dsh-local-plugins/dsh-notification.backup-*` 恢复目录；仍为 link 模式时无需重装，仅在依赖记录被改回 `file:` 时执行一次 `dsh plugin add link:<目录>`。

生效判断：

| 改动类型 | 生效方式 |
| --- | --- |
| 仅 `lib/client.js` | HMR 每 500ms 轮询 bundle stat，变化时 `clientModules.rebuilt` 并推送 reload；控制台出现新的 bundle loaded 行即成功 |
| `lib/index.js` 或 host 字段 | 重启 `dsh web` |
| 仅页面刷新 | 在 HMR 未更新图时仍会请求旧 `rev`，拿到旧 bundle；不能作为唯一手段 |

## 9. 风险与缓解

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| tag 格式漂移 | 壳体解析错会话或无法跳转 | 冻结格式、常量集中、测试向量、必要时加版本前缀 |
| Windows Tag 超 64 | toast 被截断或替换 | 所有 tag 都哈希；用 32 位十六进制摘要 |
| 只存进程内映射 | 壳体重启后 Action Center 旧 toast 失效 | 会话 id 写入 launch URI，映射只用于展示/去重 |
| hash 残留/重放 | 刷新后重复打开 | 成功/失败/超时都清 hash；nonce 由壳体保证变化 |
| 归档/删除会话 | 选中后被清或抛错 | 读 `workspaces.archivedSessionIds`；只对已列出 id 调用 |
| 重复 openSession | 多次 retain/release、重复选中 | 共享 `reveal` + nonce + 750ms 去重 |
| 冷启动列表慢 | 激活失败 | 20s 超时、一次 `refresh()`、日志可诊断 |
| 测试 stub 不全 | 现有测试被破坏 | 控制器依赖注入，`window` 只在接线层读取 |
| 安装目录与 profile 脱节 | 旧产物继续被加载 | 使用 `link:` 符号链接；`file:` 模式需就地覆盖并重新链接 |
| 文档滞后 | 按旧版本部署 | 版本、DSH 目标、契约一次改齐 |

## 10. 完成定义

功能上：hash 早于/晚于插件都能打开目标；成功后 hash 被清；目标不存在、已归档、超时不崩溃；连续点击最后目标生效；应用内横幅与非壳体 onclick 无回退；`uiWorkspace` 缺席时插件仍能加载。

工程上：`pnpm run check` 全绿；新增模块有单元测试；wiring/composition 覆盖 hash 场景；`lib/` 已重建；README/INSTALL 与版本一致；安装目录与 profile 解析到同一份新产物。

## 11. 证据索引

| 主题 | 位置 |
| --- | --- |
| 插件入口与可选 `uiWorkspace` | [`src/client/index.ts:98–117`](../src/client/index.ts#L98-L117) |
| 点击路径 | [`src/client/index.ts:134–143`](../src/client/index.ts#L134-L143)、[`src/client/click.ts:33–46`](../src/client/click.ts#L33-L46) |
| tag 格式 | [`src/client/notifier.ts:63–70`](../src/client/notifier.ts#L63-L70) |
| `openSession` 接口 | [`navigation.d.ts:17–22`](/home/andyk/.nvm/versions/node/v24.22.1/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-workspace/lib/types/client/navigation.d.ts#L17-L22) |
| `openSession` 实现 | [`ui-workspace/client.js:1473–1475`](/home/andyk/.nvm/versions/node/v24.22.1/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-workspace/lib/client.js#L1473-L1475) |
| 未列出会话抛错 | [`session-controller/client.js:3022–3029`](/home/andyk/.nvm/versions/node/v24.22.1/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/lib/client.js#L3022-L3029) |
| 列表 phase | [`service.d.ts:50–60`](/home/andyk/.nvm/versions/node/v24.22.1/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/lib/types/client/sessions/service.d.ts#L50-L60)、[`manager.d.ts:20–24`](/home/andyk/.nvm/versions/node/v24.22.1/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/lib/types/client/sessions/manager.d.ts#L20-L24) |
| 归档检查范式 | [`dsh-client-ui-schedule/lib/client.js:15579–15584`](/home/andyk/.nvm/versions/node/v24.22.1/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-schedule/lib/client.js#L15579-L15584) |
| 本地选择持久化 | [`ui-workspace/client.js:1370`](/home/andyk/.nvm/versions/node/v24.22.1/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-workspace/lib/client.js#L1370) |
| 构建产物 | [`build.mjs:15–55`](../build.mjs#L15-L55) |
| 仓库规则 | [`AGENTS.md:8–13`](../AGENTS.md#L8-L13) |

## 12. 变更记录

| 日期 | 版本 | 内容 |
| --- | --- | --- |
| 2026-11-04 | 1.0 | 初稿；确认可行性、契约、工作包、测试与部署计划 |
| 2026-11-04 | 1.1 | 实施完成；部署方式由 `file:` 硬链接副本改为 `link:` 符号链接，更新部署步骤、风险与生效说明 |
