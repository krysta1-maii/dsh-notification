# dsh-notification

DeepSeek Harness Web GUI 的任务完成与等待交互提醒插件。默认（`backgroundOnly` 开启时）在窗口隐藏或失焦时，通过系统 `Notification` API 提醒所有会话；窗口可见且有焦点时，仅为不在主视图中打开的会话显示顶部居中的紧凑横向应用内横幅，沿用 DSH 原生视觉风格，而非右下角卡片。按结束状态开关 + 关键词包含/排除规则，精确控制哪些完成要提醒。点击完成或等待交互的提醒可打开对应会话的对话页；点击系统通知还会把 DSH 窗口带到前台。应用内提醒可手动关闭；测试通知仅聚焦窗口。便携壳体还可以通过 hash 把原生 toast 的点击交回页面，插件等待会话列表就绪后打开目标并清除 hash。

**无需改动 harness**：host 侧贡献一个会话投影（每个会话最近完成一轮的有界摘要），client 侧监听该投影的轮次增长，并应用自己持久化的偏好设置。在 DSH `0.2.2-alpha.3` 中，等待通知使用 `uiSession.sessionStatus`，旧版 pending 接口仍保留回退。完成与等待交互提醒共用同一套窗口分层路由，只有 `backgroundOnly` 开启且窗口可见、有焦点时才抑制主视图会话的提醒。关闭此项后，前后台所有会话都使用系统通知。

```
host:   notification 投影（最近一轮的原因/正文/工具名） --session/projection--> 浏览器
client: notification 投影轮次增长 + 等待状态 + 持久化设置
        -> backgroundOnly 开：隐藏/失焦 -> 系统通知（须已授权）
                              可见且有焦点 -> 非主视图会话：顶部居中横幅
                                             mainView 会话：不提醒
        -> backgroundOnly 关：任意会话均使用系统通知（须已授权）
        -> 点击：打开该会话的对话页；系统通知还会聚焦窗口
```

## 安装

将本地发布包解压到固定插件目录，再安装该目录：

```sh
dsh plugin --profile web add "link:/absolute/path/to/local-plugins/dsh-notification"
```

包内已包含构建产物，解压目录无需安装开发依赖或重新构建。详见 [INSTALL.zh-CN.md](<INSTALL.zh-CN.md>)。本次为本地发布包，未上传 npm/GitHub。

`link:` 模式让 `node_modules/dsh-notification` 始终指向解压目录，重建 `lib/` 后无需再次复制或重装插件。`file:` 模式也能安装，但 pnpm 会生成一份副本，之后的构建必须复制进副本并重新链接。默认的 `dsh web` profile 已包含所需 client 组合（会话列表、设置外壳、locale 及工作区导航服务）；host 改动需要重启 web 服务，仅 client 改动只需 HMR 或刷新页面。

`0.8.0` 目标为 Harness `0.2.2-alpha.3`，并保留旧版客户端包结构与等待状态的适配。点击通知切换会话需要 Harness 提供工作区导航服务（`uiWorkspace`，0.1.5-rc.1 及提供该服务的版本均具备）；缺失时两种提醒都跳过会话跳转，系统通知点击仍会聚焦窗口。

设置段位于 **设置 > 通知**。

## 便携壳体激活

桌面壳体若用原生 toast 展示 DSH 通知，可以在用户点击后把目标交回页面。契约是一段由 `location.hash = '#dsh-session=<id>&n=<nonce>'` 写入的 fragment；插件在工作区服务挂载时读取一次，并在之后的每次 `hashchange` 读取。它等待会话列表进入 `ready` 且包含目标 id，在 id 缺失时请求一次 host 刷新，在 workspaces 服务可用时等待归档集合就绪，然后通过 `uiWorkspace.openSession` 打开会话。成功后用 `history.replaceState` 清除 fragment，保留 pathname 与 query。

控制器在 20 秒后放弃，跳过已归档会话，忽略重复 nonce，连续 hash 只保留最新目标。同一会话在 750 毫秒内的重复打开视为同一次用户操作，因此 hash 与通知点击同时发生时只打开一次。缺少 `uiWorkspace` 时插件仍正常加载，hash 原样保留。解析契约、Windows Tag 哈希、启动 URI 与测试向量见[便携壳体接口说明](<docs/portable-shell-interface.md>)与[0.8.0 升级施工计划](<docs/upgrade-0.8.0-portable-activation.md>)。

## 设置

| 设置项 | 默认 | 作用 |
| --- | --- | --- |
| 启用通知 | 开 | 总开关；关闭后不再弹出，规则与偏好保留。 |
| 正常完成 / 出错 / 中止 / 阻塞 / 达 Token 上限 | 完成 + 出错开，其余关 | 哪些结束状态触发通知（host 投影会报告结束原因）。 |
| 关键词规则 | 无 | 针对会话标题、该轮回复文本与调用过的工具名做包含/排除匹配。包含规则：至少命中一条才通知；排除规则：命中即不通知。支持字面量或正则，可区分大小写。 |
| 需要手动关闭 | 关 | 应用内提醒不自动消失（仍受最多五条的上限限制）；系统通知请求保持显示，直到手动关闭（取决于浏览器与操作系统支持）。 |
| 后台系统通知，前台应用内提醒 | 开 | 按窗口状态与主视图会话，为自动完成和等待交互提醒选择渠道，详见下表。关闭后前后台均使用系统通知，包括当前会话。 |

在其他设置与规则允许提醒的前提下：

| `backgroundOnly` | 窗口状态 | 会话 | 提醒方式 |
| --- | --- | --- | --- |
| 开 | 隐藏或失焦（`document.hidden === true` 或 `document.hasFocus() === false`） | 任意会话，包括主视图会话 | 系统通知，须已授予浏览器通知权限。 |
| 开 | 可见且有焦点 | 在主视图（`mainView`）中打开 | 不提醒。 |
| 开 | 可见且有焦点 | 不在主视图中打开 | 可关闭的顶部居中横幅，无需系统通知权限；点击可打开对应会话。 |
| 关 | 前台或后台 | 任意会话，包括当前会话 | 系统通知，须已授予浏览器通知权限。 |

应用内横幅仅在 `backgroundOnly` 开启时使用，默认 8 秒后自动消失；开启「需要手动关闭」可取消自动消失。点击打开对话或关闭提醒都会移除该条提醒。最多保留五条，超出时移除最早的一条，即使开启了手动关闭也一样。

手动测试始终使用系统通知，绕过此路由设置，但仍须已授予通知权限。

偏好保存在浏览器（localStorage）。`0.8.0` 保持 `dsh-notification.v4` 设置键与所有已有偏好字段（包括 `backgroundOnly`）不变，保留已有偏好，不强制重设开关。设置段内还可授予浏览器权限并发送测试通知。

## 配置

Host 侧可调参数在 `cordis.yml` 的插件行上：

```yaml
- id: dsh-notification
  name: dsh-notification
  config:
    maxBodyChars: 400      # 投影正文预算；更长的回复会在 host 侧省略号截断
```

## 对模型的影响

| 方面 | 效果 |
| --- | --- |
| Token 开销 | 无 —— 通知纯属 UI，绝不进入请求。 |
| 工具调用 | 无 —— 模型没有新增任何工具。 |
| 会话日志 | 不变 —— 投影只读已有日志，不新增事件。 |
| 提示词 | 不变 —— 不注册任何 system prompt 段。 |

## 权限边界

- host 侧对会话日志做纯投影折叠（轮次原因、有界的回复文本、工具名），由投影通道交付给浏览器；插件不写日志，不注册面向模型的工具。
- client 侧监听 notification 投影的完成轮次增长与等待交互状态，二者共用上述路由：系统通知要求 `Notification.permission === "granted"`，前台应用内提醒仅在 `backgroundOnly` 开启时使用，不要求系统通知权限。Harness 的 `completionUnread` 是待确认标记，不是完成事件计数器。
- 规则匹配在 client 侧针对投影内容进行；回复正文不超过 `maxBodyChars`。

## 开发

```sh
pnpm install --frozen-lockfile # 使用固定 npm 产物；store 路径已配置在项目内
pnpm run check          # typecheck + tests + build
pnpm run test           # vitest（host 投影 + 组合、client 判定/runner/辅助函数/设置段）
pnpm run build          # esbuild host/client 打包 + tsc 声明
```

开发依赖精确锁定 npm DSH `0.2.2-alpha.3`（commit `05b1cae8db6e674c5685101494d4eec24652424a`），Cordis 为 `4.0.6-alpha.2`，Schemastery 为 `3.18.6-alpha.2`，不再依赖同级源码仓库。锁文件固定安装图；运行时支持范围由 `engines.dsh`（`>=0.2.2-0 <0.2.3`，覆盖整个 0.2.2 线）声明，宿主兼容门在加载插件前读取该字段。组合测试使用真实 `SessionStore`、`SessionProjectionRegistry` 与 `UiSession` 验证折叠、通知和生命周期。

## 已知限制

- 两种提醒都要求客户端页面仍在运行。只有系统通知需要已授予 Notification 权限，`backgroundOnly` 开启时的前台应用内提醒无需该权限。窗口失焦、最小化或壳窗口关闭到托盘后，只要页面/renderer 仍运行就可发送系统通知；退出程序、关闭浏览器标签页或销毁 renderer 后，两种客户端提醒都无法继续。仅有托盘/后台进程不能证明 renderer 仍存活；站点权限被拒后无法从页面内恢复。
- 通知在每轮结束（host notification 投影的轮次号增长）触发一次；断线期间完成的轮次在重连后不会补发。
- 规则匹配对象为会话标题 + 最近一轮的回复文本与工具名，不匹配更早的轮次。
- 提醒正文是纯文本摘要。点击完成或等待交互的提醒会打开对应会话的对话页，不深链到具体轮次；点击系统通知还会聚焦 DSH 窗口。当会话已不在列表中或工作区导航服务不可用时，会话跳转会被跳过，系统通知点击仍会聚焦窗口。壳体交来的目标若始终未出现在列表中，20 秒后过期并只清除 fragment。

## 插件图标

随包提供的[图标](<assets/icon.svg>)选用 MIT 许可的 [Tabler bell-ringing](https://tabler.io/icons/icon/bell-ringing)，采用蓝色圆角底与白色铃铛。通过 [package.json](<package.json>) 顶层 `icon` 字段从本地加载，不依赖外部图片请求。来源、修改说明与许可见[图标说明](<assets/README.md>)。

## License

MIT
