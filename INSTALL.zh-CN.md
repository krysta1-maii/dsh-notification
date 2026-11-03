# 本地安装 dsh-notification 0.8.0

本包包含已构建的 Host/Client 产物，目标 DSH 版本为 `0.2.2-alpha.3`。插件版本 `0.8.0` 与 DSH 版本不是同一个版本号。本次只是本地发布包，没有上传 npm/GitHub。

## 1. 解压到固定插件目录

推荐使用 `dsh-notification-0.8.0.zip`，解压后得到 `dsh-notification/`，将这个目录放入你的专用本地插件文件夹。最终目录内应直接存在 [package.json](<package.json>)、[cordis.patch.yml](<cordis.patch.yml>) 和 `lib/`，不要多套一层目录。

也可用标准 npm TGZ 包（内部根目录是 `package/`）：

```sh
PLUGIN_DIR="/absolute/path/to/local-plugins/dsh-notification"
mkdir -p "$PLUGIN_DIR"
tar -xzf /path/to/dsh-notification-0.8.0.tgz -C "$PLUGIN_DIR" --strip-components=1
```

请将上述路径替换为实际路径，第一次解压使用空目录。安装后不要移动或删除该目录。不需要在这个目录运行 `pnpm install` 或构建命令。

## 2. 安装到现有 web profile

```sh
dsh plugin --profile web add "file:/absolute/path/to/local-plugins/dsh-notification"
```

传入的是包含 [package.json](<package.json>) 的目录，且应使用 DSH 运行环境能访问的绝对路径。若在 WSL 中运行 DSH，使用 Linux/WSL 路径，而不是 Windows 的 `C:\...` 路径。

## 3. 让现有实例生效

安装会修改 `web` profile 的插件选择。请在方便时重启原有 DSH Web 服务，再刷新原有 Web 页面；无需另开一个替代服务器。当前会话正在运行时不要贸然重启。

在 Settings > Notifications 中可授予浏览器通知权限并发送测试通知。手动测试始终使用系统通知，绕过自动提醒的路由设置；系统弹窗仍要求已授权，并受浏览器站点权限和操作系统通知设置影响。应用内提醒不需要系统通知权限。

「后台系统通知，前台应用内提醒」开启时，自动完成和等待交互提醒共用以下路由（仍受其他设置与规则约束）：

- 窗口隐藏或失焦（`document.hidden === true` 或 `document.hasFocus() === false`）：任意会话，包括主视图会话，都使用系统通知，要求 `Notification.permission === "granted"`。
- 窗口可见且有焦点：仅为不在主视图（`mainView`）中打开的会话显示顶部居中的紧凑横向应用内横幅，沿用 DSH 原生视觉风格，而非右下角卡片；主视图会话不提醒。应用内提醒无需系统通知权限，可点击打开对应会话，也可关闭。
- 关闭此项：前后台所有会话均使用系统通知，包括当前会话，仍要求已授予通知权限。

应用内提醒仅在上述开关开启时使用，默认 8 秒后自动消失；开启「需要手动关闭」后不自动消失，点击打开对话或关闭提醒都会移除该条提醒。最多保留五条，超出时移除最早的一条，即使开启了手动关闭也一样。该设置还会请求系统通知保持显示，但系统通知的实际持久显示取决于浏览器与操作系统支持。

便携壳体可以在原生 toast 被点击后写入 `#dsh-session=<id>&n=<nonce>`。插件在会话列表就绪且目标仍在列表中后打开该会话并清除 hash；目标缺失时只请求一次刷新，已归档时跳过，20 秒未完成则清除 hash 放弃。同一会话 750 毫秒内的重复打开被去重；缺少工作区导航服务时插件仍正常加载，hash 保留。壳体的 tag 解析、Windows Tag 哈希与启动 URI 契约见 [便携壳体接口说明](<docs/portable-shell-interface.md>)。

窗口失焦、最小化或点 X 关闭到托盘时，只要客户端页面仍在运行，就可能显示系统通知。退出程序或销毁 renderer 后，两种客户端提醒都不能继续；仅有托盘/后台进程不能证明 renderer 仍存活。

## 包含的修复与验证

- `0.8.0` 新增便携壳体激活：消费 `#dsh-session=<id>&n=<nonce>`，等待会话列表就绪，按需刷新一次，检查归档，调用 `uiWorkspace.openSession`，成功后保留 pathname 与 query 清除 hash。
- 激活控制器具备 20 秒超时、nonce 去重、连续 hash 取最新、归档跳过、异常收敛与 dispose 清理；同一会话 750 毫秒内的重复打开与通知点击共用去重。
- 通知 tag 的三个前缀集中为常量，新增 `testNotificationTag()`；完成、等待交互与测试通知的输出字符串逐字不变，便携壳体的解析、哈希与测试向量见[接口说明](<docs/portable-shell-interface.md>)。
- 保留 `0.2.2-alpha.3` 的 `uiSession.sessionStatus` 适配、旧版 pending 回退，以及可选服务挂载/卸载时的订阅管理。
- 保持 `dsh-notification.v4` 设置键与所有已有偏好字段（包括 `backgroundOnly`），不新增设置字段，保留已有偏好，不强制重设开关；`engines.dsh` 与运行时 peer 兼容范围不变。
- 发布验证应覆盖类型检查、测试、构建与 0.2.2 服务 smoke；以本次实际验证结果为准，此处不固定测试数量。
- 尚需在你的壳窗口中验收原生 toast 点击、冷启动 hash、连续点击、归档/删除、Action Center 重启后点击与 20 秒超时；并确认失焦、最小化和关闭到托盘后的实际系统弹窗，以及前台非主视图会话的应用内提醒、点击跳转与关闭。
