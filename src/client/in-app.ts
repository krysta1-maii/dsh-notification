/** Ephemeral, plugin-scoped notifications; persistence and navigation belong elsewhere. */
import { createSnapshotStore, type SnapshotStore } from './snapshot-store.ts'

export interface InAppNotification {
  id: string
  title: string
  body: string
  sessionTitle: string
  target: { sessionId: string }
}

export interface InAppNotificationController {
  notifications: SnapshotStore<readonly InAppNotification[]>
  show(item: InAppNotification, requireInteraction: boolean): void
  dismiss(id: string): void
  activate(id: string): void
  dispose(): void
}

const MAX_VISIBLE = 5
const AUTO_DISMISS_MS = 8_000

/** The parent supplies guarded navigation and owns this controller's disposal. */
export function createInAppNotifications(
  onActivate: (target: InAppNotification['target']) => void,
): InAppNotificationController {
  const notifications = createSnapshotStore<readonly InAppNotification[]>([])
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  let disposed = false

  const clearTimer = (id: string): void => {
    const timer = timers.get(id)
    if (timer === undefined) return
    clearTimeout(timer)
    timers.delete(id)
  }

  const dismiss = (id: string): void => {
    clearTimer(id)
    const current = notifications.getSnapshot()
    const next = current.filter(item => item.id !== id)
    if (next.length !== current.length) notifications.set(next)
  }

  const show = (item: InAppNotification, requireInteraction: boolean): void => {
    if (disposed) return
    clearTimer(item.id)
    const next = [...notifications.getSnapshot().filter(current => current.id !== item.id), item]
    while (next.length > MAX_VISIBLE) clearTimer(next.shift()!.id)
    // Install before publishing: synchronous subscribers can dismiss, replace,
    // or dispose the entry without leaving a newly-created orphan timer.
    if (!requireInteraction) timers.set(item.id, setTimeout(() => { dismiss(item.id) }, AUTO_DISMISS_MS))
    notifications.set(next)
  }

  const activate = (id: string): void => {
    if (disposed) return
    const item = notifications.getSnapshot().find(current => current.id === id)
    if (item === undefined) return
    try {
      onActivate(item.target)
    } catch {
      // Opening is best-effort; stale/unavailable navigation must not crash UI.
    } finally {
      dismiss(id)
    }
  }

  const dispose = (): void => {
    if (disposed) return
    disposed = true
    for (const id of timers.keys()) clearTimer(id)
    if (notifications.getSnapshot().length > 0) notifications.set([])
  }

  return { notifications, show, dismiss, activate, dispose }
}
