/**
 * dsh-notification client plugin: the browser half of the completion
 * notification. Persists the notification preferences in a local snapshot
 * store, watches the session list for advances of the host `notification`
 * projection (a freshly completed turn), and routes reminders to the OS in
 * background windows or the shell overlay for other foreground conversations.
 * Also registers the
 * settings section and the locale dictionaries. No harness allowlist is touched.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { SnapshotStore } from './snapshot-store.ts'
// Type-only: the connection/reset event and ctx.locale Context merges.
import type {} from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the settings.section SlotMap entry.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { NotificationSettings, PendingKind } from '../contract.ts'
import { NotificationSettingsSection, type NotificationSectionInjected } from './SettingsSection.tsx'
import { NS, en, zh } from './locales.ts'
import { adoptStyles } from './styles.ts'
import { createNotificationSettingsStore } from './store.ts'
import { createInAppNotifications } from './in-app.ts'
import { InAppNotifications, type InAppNotificationsInjected } from './InAppNotifications.tsx'
import { activateNotificationTarget, type NotificationClickTarget } from './click.ts'
import { notificationFor, pendingAdvance, pendingNotificationFor, projectionAdvance } from './runner.ts'
import {
  bodyText,
  createBrowserNotification,
  notificationsApi,
  pendingTitleKey,
  notificationSurface,
  type NotificationSurface,
  titleKey,
  type NotificationCreationResult,
} from './notifier.ts'

/** Required services: the session list, slots, and locale. */
export const inject = ['sessions', 'slots', 'locale']

/** The slice of the sessions service this plugin reads. */
interface SessionsListFace {
  readonly list: { getSnapshot(): NotificationSessionListState; subscribe(listener: () => void): () => void }
}

/** The slice of the workspace navigation service this plugin reads. */
interface UiWorkspaceFace {
  openSession(id: SessionId): void
}

type SessionId = string

/** Session list facts consumed by the notification runners. */
interface NotificationSessionSummary {
  readonly id: SessionId
  readonly origin?: string
  readonly title?: string
  readonly displayTitle?: string
  readonly retainedBy?: Readonly<Record<string, number>>
  readonly projectionValues?: {
    readonly notification?: import('../contract.ts').NotificationProjectionValue
  }
}

/** Minimal list snapshot consumed by the notification runners. */
interface NotificationSessionListState {
  readonly ids: readonly SessionId[]
  readonly byId: Readonly<Record<SessionId, NotificationSessionSummary>>
}

/** The unified per-session status source this plugin reads. */
interface UiSessionFace {
  readonly sessionStatus?: {
    getSnapshot(): ReadonlyMap<SessionId, { readonly pendingInteraction?: { readonly kind: string } }>
    subscribe(listener: () => void): () => void
  }
}

/** The slot registry surface this plugin uses. */
interface SlotsFace {
  inject(name: string, factory: () => unknown): unknown
  register(entry: object, component: unknown): unknown
}

/** Main-view membership is the `mainView` reference source on the list row. */
function isInView(state: NotificationSessionListState, id: SessionId): boolean {
  return (state.byId[id]?.retainedBy?.mainView ?? 0) > 0
}

function asPendingKind(value: string | undefined): PendingKind | undefined {
  return value === 'approval' || value === 'question' || value === 'plan-review' ? value : undefined
}

/**
 * Compose the notification surface.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  adoptStyles()
  console.info('[dsh-notification] bundle loaded (completion and pending-interaction notifications, settings v4)')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-notification: dictionaries')

  const t = ctx.locale.bind(NS)
  // The client sessions face is read through the service store, not the
  // `ctx.sessions` property proxy: the host dsh-session package merges a
  // different `sessions` Context member, and the two collide in this
  // single-program build.
  const sessions = ctx.get('sessions') as unknown as SessionsListFace
  // The workspace navigation service is optional and injected lazily (never in
  // the exported `inject` list): web boot fails the whole entry while any
  // required service stays pending. When it is absent the plugin still loads,
  // and a click simply focuses the window.
  let uiWorkspace: UiWorkspaceFace | undefined
  ctx.inject(['uiWorkspace'], (scope) => {
    uiWorkspace = scope.get('uiWorkspace') as unknown as UiWorkspaceFace | undefined
    return () => { uiWorkspace = undefined }
  })
  // Re-read the live list at click time: a session that was archived since the
  // notification appeared must not be opened (openSession throws on an unlisted
  // id, and the click handler must never throw).
  const isListed = (id: SessionId): boolean => {
    const state = sessions.list.getSnapshot()
    return state.ids.includes(id) || state.byId[id] !== undefined
  }
  const log = (message: string): void => { console.info(message) }
  const slots = (ctx as unknown as { slots: SlotsFace }).slots
  const settings: SnapshotStore<NotificationSettings> = createNotificationSettingsStore()
  const set = (patch: Partial<NotificationSettings>): void => {
    settings.update(draft => { Object.assign(draft, patch) })
  }
  const requestPermission = (): Promise<NotificationPermission> =>
    notificationsApi()?.requestPermission() ?? Promise.resolve<NotificationPermission>('denied')

  const activate = (target: NotificationClickTarget | undefined): void => {
    window.focus()
    // Resolve navigation and list membership at click time, for both channels.
    const navigation = uiWorkspace
    activateNotificationTarget(target, {
      isListed,
      openSession: navigation === undefined ? undefined : navigation.openSession.bind(navigation),
      log,
    })
  }
  const inApp = createInAppNotifications(activate)
  ctx.effect(() => () => inApp.dispose(), 'dsh-notification: in-app notifications')

  const show = (
    title: string,
    body: string,
    tag: string,
    requireInteraction: boolean,
    target?: NotificationClickTarget,
  ): NotificationCreationResult => {
    const result = createBrowserNotification(notificationsApi(), title, { body, tag, requireInteraction })
    if (!result.ok) {
      console.error(`[dsh-notification] notification creation failed: ${result.message}`)
      return result
    }
    result.notification.onclick = () => { activate(target) }
    result.notification.onerror = () => {
      console.error('[dsh-notification] the browser reported a notification delivery error')
    }
    return result
  }
  const deliver = (
    surface: NotificationSurface,
    title: string,
    body: string,
    tag: string,
    current: NotificationSettings,
    summary: NotificationSessionSummary,
  ): void => {
    if (surface === 'system') {
      show(title, body, tag, current.requireInteraction, { sessionId: summary.id })
    } else if (surface === 'in-app') {
      inApp.show({
        id: tag, title, body,
        sessionTitle: summary.displayTitle ?? summary.title ?? summary.id,
        target: { sessionId: summary.id },
      }, current.requireInteraction)
    }
  }
  const sendTest = (): NotificationCreationResult => {
    // A unique tag per click: the browser replaces same-tag notifications, and a
    // stale same-tag entry lingering in the Windows notification center silently
    // swallows every later notification with that tag. A fresh tag per test
    // guarantees the toast always shows.
    return show(t('notify.testTitle'), t('notify.testBody'), `dsh-notification-test-${Date.now()}`, false)
  }

  // Completion runner: only advances past the highest observed turn notify.
  // The first available projection seeds the baseline; missing or older values
  // never lower it. A connection reset clears it so history seeds again.
  ctx.effect(() => {
    const observedTurn = new Map<string, number>()
    // Late activation may attach to an already-populated list. Seed it now so
    // the first subscription update can notify a genuinely newer completion.
    const initial = sessions.list.getSnapshot()
    for (const id of initial.ids) {
      const turn = initial.byId[id]?.projectionValues?.notification?.turn
      if (turn !== undefined) observedTurn.set(id, turn)
    }
    // A reconnect must instead wait for its incoming projection baseline.
    const reseed = (): void => { observedTurn.clear() }
    const stopReset = ctx.on('connection/reset', reseed)
    const off = sessions.list.subscribe(() => {
      const state = sessions.list.getSnapshot()
      const current = settings.getSnapshot()
      for (const id of state.ids) {
        const summary = state.byId[id]
        if (summary === undefined) continue
        const projection = summary.projectionValues?.notification
        const { nextTurn, fresh } = projectionAdvance(observedTurn.get(id), projection)
        if (nextTurn !== undefined) observedTurn.set(id, nextTurn)
        if (!fresh) continue
        const plan = notificationFor(summary.id, summary.origin, summary.title, projection, current)
        if (plan === null) {
          console.info(`[dsh-notification] turn ${nextTurn} ${id} suppressed by settings/rules`)
          continue
        }
        const permission = notificationsApi()?.permission ?? 'denied'
        // Visibility alone misses desktop shells that stay visible while unfocused.
        const hidden = document.hidden
        const focused = document.hasFocus()
        const surface = notificationSurface(permission, current.backgroundOnly, hidden, focused, isInView(state, id))
        console.info(
          `[dsh-notification] turn ${nextTurn} ${id}: reason=${plan.reason} surface=${surface}`
          + ` (permission=${permission} backgroundOnly=${current.backgroundOnly}`
          + ` hidden=${hidden} focused=${focused})`,
        )
        deliver(surface, t(titleKey(plan.reason)), bodyText(plan.body, t('notify.emptyBody')), plan.tag, current, summary)
      }
      const live = new Set(state.ids)
      for (const id of [...observedTurn.keys()]) {
        if (!live.has(id)) observedTurn.delete(id)
      }
    })
    return () => { off(); stopReset() }
  }, 'dsh-notification: completion runner')

  // Pending-interaction runner: seed from the current snapshot before
  // subscribing so a newly observed question is not mistaken for startup
  // history. Re-seed on reconnect for the same reason: a wait that existed
  // while disconnected must not generate a stale notification.
  ctx.effect(() => {
    const observed = new Map<SessionId, { kind: PendingKind | undefined }>()
    const sequences = new Map<SessionId, number>()
    let uiSession: UiSessionFace | undefined
    const pendingKind = (id: SessionId): PendingKind | undefined =>
      asPendingKind(uiSession?.sessionStatus?.getSnapshot().get(id)?.pendingInteraction?.kind)
    const seed = (state: NotificationSessionListState): void => {
      const live = new Set(state.ids)
      for (const id of state.ids) observed.set(id, { kind: pendingKind(id) })
      for (const id of [...observed.keys()]) {
        if (!live.has(id)) {
          observed.delete(id)
          sequences.delete(id)
        }
      }
    }
    seed(sessions.list.getSnapshot())
    const reseed = (): void => {
      observed.clear()
      seed(sessions.list.getSnapshot())
    }
    const stopReset = ctx.on('connection/reset', reseed)
    const run = (): void => {
      const state = sessions.list.getSnapshot()
      const current = settings.getSnapshot()
      for (const id of state.ids) {
        const summary = state.byId[id]
        if (summary === undefined) continue
        const kind = pendingKind(id)
        const previous = observed.get(id)
        const next = pendingAdvance(previous, kind)
        observed.set(id, { kind: next.kind })
        if (!next.fresh || next.kind === undefined) continue
        const sequence = (sequences.get(id) ?? 0) + 1
        sequences.set(id, sequence)
        const plan = pendingNotificationFor(
          summary.id,
          summary.origin,
          summary.displayTitle,
          next.kind,
          sequence,
          current,
        )
        if (plan === null) continue
        const permission = notificationsApi()?.permission ?? 'denied'
        // Visibility alone misses desktop shells that stay visible while unfocused.
        const hidden = document.hidden
        const focused = document.hasFocus()
        const surface = notificationSurface(permission, current.backgroundOnly, hidden, focused, isInView(state, id))
        deliver(surface, t(pendingTitleKey(plan.kind)), bodyText(plan.body, t('notify.pendingBody')), plan.tag, current, summary)
      }
      seed(state)
    }
    const off = sessions.list.subscribe(run)
    // Optional service injection supports late activation and owns the status
    // subscription's teardown. Seeding on attach avoids notifying existing waits.
    ctx.inject(['uiSession'], (scope) => {
      uiSession = scope.get('uiSession') as unknown as UiSessionFace | undefined
      seed(sessions.list.getSnapshot())
      const offPending = uiSession?.sessionStatus?.subscribe(run)
      return () => { offPending?.(); uiSession = undefined }
    })
    return () => { off(); stopReset() }
  }, 'dsh-notification: pending runner')

  // The settings section: master switch, permission card, outcome toggles, rules, advanced.
  slots.inject('settings.section', () => slots.register({
    name: 'settings.section',
    id: 'notification',
    order: 60,
    label: () => t('nav'),
    locale: NS,
    inject: (): NotificationSectionInjected => ({
      hooks: { settings },
      set,
      requestPermission,
      sendTest,
    }),
  }, NotificationSettingsSection))

  // Native frame-wide, additive overlay: no separate DOM root or module dependency.
  slots.inject('shell.overlay', () => slots.register({
    name: 'shell.overlay',
    id: 'notification.toasts',
    order: 60,
    locale: NS,
    inject: (): InAppNotificationsInjected => ({
      hooks: { notifications: inApp.notifications },
      dismiss: inApp.dismiss,
      activate: inApp.activate,
    }),
  }, InAppNotifications))
}
