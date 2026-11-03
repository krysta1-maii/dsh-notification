# dsh-notification

Completion and pending-interaction reminders for the DeepSeek Harness web GUI. By default (`backgroundOnly` on), a hidden or unfocused window uses system notifications (via the `Notification` API) for any session; a visible, focused window shows top-center compact horizontal in-app banners only for conversations outside the main view. These follow DSH's native visual style, not a bottom-right card layout. Per-outcome toggles and include/exclude keyword rules control which completions notify. Clicking a completion or pending reminder opens the originating session's conversation; system notification clicks also bring the DSH window forward. In-app banners are dismissible; test notifications only focus the window. A portable shell can also hand a native toast click back to the page through a hash; the plugin waits for the session list, opens the target, and clears the hash.

No harness change is needed: the host contributes a session projection (a bounded summary of each session's last completed turn), and the client watches advances of that projection and applies its own persisted preferences. On DSH `0.2.2-alpha.3`, pending notifications read `uiSession.sessionStatus`; legacy pending sources remain supported. Completion and pending reminders share the same window-aware routing, with main-view suppression only when `backgroundOnly` is on and the window is visible and focused. Turning it off keeps system notifications for all conversations in foreground and background.

```
host:  notification projection (last turn's reason/text/tools) --session/projection--> browser
client: notification projection turn advance + pending status + persisted settings
        -> backgroundOnly ON: hidden/unfocused -> system notification (permission granted)
                              visible + focused -> non-main conversation: top-center banner
                                                   mainView conversation: no reminder
        -> backgroundOnly OFF: system notification for any session (permission granted)
        -> click: open that session's conversation page; system notification also focuses window
```

## Install

Extract the local release into a permanent plugin directory, then install that directory:

```sh
dsh plugin --profile web add "file:/absolute/path/to/local-plugins/dsh-notification"
```

The release includes the built host/client artifacts; no build or development dependency installation is needed in the extracted directory. See [INSTALL.zh-CN.md](<INSTALL.zh-CN.md>) for extraction and installation instructions. This local release is not an uploaded GitHub/npm release.

Restart the web server so the host half and the served client bundle pick up the plugin. The default `dsh web` profile has the required client composition (the session list, the settings shell, locale, and the workspace navigation service).

Version `0.8.0` targets Harness `0.2.2-alpha.3` and retains adapters for legacy client package layouts and pending sources. Switching to the notification's session on click needs the Harness workspace navigation service (`uiWorkspace`), which 0.1.5-rc.1 and other builds providing that service expose; where it is missing, system notification clicks still focus the window but session navigation is skipped for both reminder channels.

The settings section lives under **Settings > Notifications**.

## Portable shell activation

A desktop shell that shows DSH notifications natively can hand a toast click back to the page. The contract is a fragment written with `location.hash = '#dsh-session=<id>&n=<nonce>'`; the plugin reads it when the workspace service attaches and on every later `hashchange`. It waits for the session list to report `ready` and to contain the id, asks for one host refresh when the id is missing, waits for the workspace archive set when that service is present, and then opens the session through `uiWorkspace.openSession`. On success the fragment is removed with `history.replaceState`, preserving the pathname and query.

The controller gives up after 20 seconds, skips sessions that are archived, ignores a repeated nonce, and keeps only the newest of consecutive hashes. A reveal within 750 ms of the previous reveal of the same session is treated as the same user action, so a hash and a notification click do not open twice. Without `uiWorkspace` the plugin still loads and the fragment is left untouched. The parsing contract, Windows tag hashing, launch URI, and test vectors are documented in [the portable shell interface](<docs/portable-shell-interface.md>) and [the 0.8.0 upgrade plan](<docs/upgrade-0.8.0-portable-activation.md>).

## Settings

| Setting | Default | Effect |
| --- | --- | --- |
| Enable notifications | on | Master switch; off stops every notification while keeping rules. |
| Notify on completed / error / aborted / blocked / token limit | completed + error on, rest off | Which turn-end reasons notify (the host projection reports the reason). |
| Keyword rules | none | Include/exclude filters matched against the session title, the turn's reply text, and its tool names. Include rules: at least one must match. Exclude rules: a match suppresses. Rules support literal or regex matching with an optional case-sensitive flag. |
| Require manual dismiss | off | Disable automatic expiry for in-app banners (the five-banner cap still applies); request persistent system notifications (subject to browser/OS support). |
| System notifications in background, in-app toasts in foreground | on | Route automatic completion and pending reminders by window state and main-view conversation, as below. Turn it off to use system notifications in both foreground and background, including the current conversation. |

After the other settings and rules allow a reminder:

| `backgroundOnly` | Window state | Conversation | Reminder |
| --- | --- | --- | --- |
| on | Hidden or unfocused (`document.hidden === true` or `document.hasFocus() === false`) | Any, including the main view | System notification; granted browser permission required. |
| on | Visible and focused | Open in the main view (`mainView`) | Suppressed. |
| on | Visible and focused | Not open in the main view | Dismissible top-center in-app banner; no OS notification permission needed. Click to open that session. |
| off | Foreground or background | Any, including the current conversation | System notification; granted browser permission required. |

In-app banners are used only while `backgroundOnly` is on. They normally expire after 8 seconds; **Require manual dismiss** disables that expiry. Opening or dismissing a banner removes it. At most five banners are kept; an additional banner evicts the oldest, even with manual dismiss enabled.

Manual test notifications always use the system channel and bypass this routing setting, but still require granted notification permission.

Preferences persist in the browser (localStorage). Version `0.8.0` keeps the `dsh-notification.v4` settings key and all existing preference fields, including `backgroundOnly`, preserves existing preferences, and does not force a new switch value. The section also grants browser permission and sends a test notification.

## Configuration

Host-side tunables live on the plugin row in `cordis.yml`:

```yaml
- id: dsh-notification
  name: dsh-notification
  config:
    maxBodyChars: 400      # projection body budget; longer replies are ellipsized host-side
```

## Model experience

| Aspect | Effect |
| --- | --- |
| Token cost | None — notifications are UI-only and never enter a request. |
| Tool calls | None — the model gets no new tool. |
| Session log | Unchanged — the projection reads the existing log and adds no events. |
| Prompt | Unchanged — no system-prompt section is registered. |

## Permission boundary

- The host folds a pure projection over the session log (turn reason, bounded reply text, tool names) and the projection seam delivers it to the browser; the plugin writes nothing to the log and registers no model-facing tools.
- The client watches the notification projection's completed-turn advances and pending-interaction status. Both use the routing above: system notifications require `Notification.permission === "granted"`; foreground in-app banners, available only with `backgroundOnly` on, do not require OS notification permission. The Harness's `completionUnread` reminder is not a completion event counter.
- Rule matching runs client-side against the projected content; the reply body never exceeds `maxBodyChars`.

## Development

```sh
pnpm install --frozen-lockfile --store-dir node_modules/.cache/pnpm-store # pinned npm artifacts
pnpm run check          # typecheck + tests + build
pnpm run test           # vitest (host projection + composition, client decision/runner/helpers/section)
pnpm run build          # esbuild host/client bundles + tsc declarations
```

Development targets DSH `0.2.2-alpha.3` (commit `05b1cae8db6e674c5685101494d4eec24652424a`): DSH devDependencies use exact npm versions, with Cordis `4.0.6-alpha.2` and Schemastery `3.18.6-alpha.2`; no sibling checkout is required. The lockfile pins the installed dependency graph. Runtime support is declared by `engines.dsh` (`>=0.2.2-0 <0.2.3`, the whole 0.2.2 line), which the harness compatibility gate reads before loading the plugin. The composition spec boots the real `SessionStore` and `SessionProjectionRegistry` and proves the fold.

## Known limitations

- Both reminder channels require a running client page. Only system notifications require granted Notification permission; foreground in-app banners work without it when `backgroundOnly` is on. Losing focus, minimizing, or closing a shell window to the tray can allow system notifications if the page/renderer keeps running. Quitting the app, closing a browser tab, or destroying the renderer stops all client reminders. A tray/background process alone does not prove that the renderer is still alive; a denied site permission cannot be overridden from inside the page.
- Notifications fire once per finished turn (an advance of the host notification projection's turn number); a completion that happened while the page was disconnected is not re-notified on reconnect.
- The rule subject is the session title plus the last turn's reply text and tool names — earlier turns are not matched.
- Reminder bodies are flat text snippets. Clicking a completion or pending reminder opens the originating session's conversation page; the exact turn inside it is not deep-linked. System notification clicks also focus the DSH window. If the session is no longer listed or the workspace navigation service is unavailable, navigation is skipped; system notification clicks still focus the window. A shell hand-off that never sees its id listed expires after 20 seconds and only clears the fragment.

## Plugin icon

The packaged [icon](<assets/icon.svg>) uses the MIT-licensed [Tabler bell-ringing](https://tabler.io/icons/icon/bell-ringing), adapted to a blue rounded square with a white bell. It loads locally through the top-level `icon` field in [package.json](<package.json>), with no external image requests. See [attribution and license](<assets/README.md>).

## License

MIT
