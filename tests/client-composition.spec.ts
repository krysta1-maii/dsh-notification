// @vitest-environment jsdom
/**
 * Client composition against the pinned npm UiSession browser artifact. Its
 * real status publisher and Cordis lifecycle run here; only the Controller,
 * transport, locale, and shell render site are fixture boundaries. Source apply
 * is intentional: the test phase precedes rebuilding the committed client.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import * as Cordis from '@deepseek-ai/cordis'
import * as ClientStore from '@deepseek-ai/dsh-client-store'
import * as UiSlots from '@deepseek-ai/dsh-client-ui-slots'
import * as ReactJsxRuntime from 'react/jsx-runtime'
import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { UiSession as UiSessionType } from '@deepseek-ai/dsh-client-ui-session/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as notificationPlugin from '../src/client/index.ts'
import { NotificationSettingsSection, type NotificationSectionInjected } from '../src/client/SettingsSection.tsx'
import { InAppNotifications, type InAppNotificationsInjected } from '../src/client/InAppNotifications.tsx'

// Match the pinned ui-layout owner's additive, frame-wide contract. No renderer
// is needed here: the registered business face exposes the actual snapshot store.
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'shell.overlay': { kind: 'list'; scope: 'root' }
  }
}

const require = createRequire(import.meta.url)
type BundleRegistration = {
  id: string
  factory: (require: (specifier: string) => unknown) => { UiSession: typeof UiSessionType }
}

/** Evaluate the shipped lazy-CJS handshake, not a mock or a Node-side substitute. */
function loadUiSession(): typeof UiSessionType {
  const manifest = JSON.parse(readFileSync(require.resolve('@deepseek-ai/dsh-client-ui-session/package.json'), 'utf8'))
  // Follow the declared development target instead of restating its version here.
  const target = JSON.parse(readFileSync(require.resolve('../package.json'), 'utf8'))
    .devDependencies['@deepseek-ai/dsh-client-ui-session']
  expect(manifest.version).toBe(target)
  const path = require.resolve('@deepseek-ai/dsh-client-ui-session/client')
  let registration: BundleRegistration | undefined
  runInNewContext(readFileSync(path, 'utf8'), {
    console,
    window: { __ModuleLoader__: { load: (value: BundleRegistration) => { registration = value } } },
  }, { filename: path })
  expect(registration?.id).toBe('@deepseek-ai/dsh-client-ui-session')
  const staticModules: Record<string, unknown> = {
    '@deepseek-ai/cordis': Cordis,
    '@deepseek-ai/dsh-client-store': ClientStore,
    '@deepseek-ai/dsh-client-ui-slots': UiSlots,
    'react/jsx-runtime': ReactJsxRuntime,
  }
  return registration!.factory(specifier => {
    if (!Object.hasOwn(staticModules, specifier)) throw new Error('UiSession requested an unseeded module: ' + specifier)
    return staticModules[specifier]
  }).UiSession
}

const UiSession = loadUiSession()

/** Observe real subscriptions without replacing the store's reads or dispatch. */
function trackSubscriptions<T>(source: ClientStore.ObservableSnapshot<T>): Set<() => void> {
  const active = new Set<() => void>()
  const subscribe = source.subscribe.bind(source)
  vi.spyOn(source, 'subscribe').mockImplementation(listener => {
    active.add(listener)
    const off = subscribe(listener)
    return () => { active.delete(listener); off() }
  })
  return active
}

/** Thin shell fixture: real SlotCore registration, with caller-fiber disposal. */
class ShellSlots extends Cordis.Service {
  readonly core = new UiSlots.SlotCore()

  constructor(ctx: Cordis.Context) {
    super(ctx, 'slots')
    ctx.effect(() => this.core.register({
      name: 'root',
      children: {
        'settings.section': { kind: 'list', scope: 'root' },
        'shell.overlay': { kind: 'list', scope: 'root' },
      },
    }, () => null), 'test shell: settings and overlay declarations')
  }

  // Prototype methods keep the Service proxy's caller-owned ctx semantics.
  register(options: Parameters<UiSlots.SlotCore['register']>[0], component: unknown): () => void {
    return this.ctx.effect(() => this.core.register(options, component as never), 'test shell: registration')
  }

  inject(name: string, factory: () => () => void): () => void {
    expect(this.core.specDynamic(name)).toBeDefined()
    return this.ctx.effect(factory, 'test shell: slot injection')
  }
}

class StubNotification {
  static permission: NotificationPermission = 'granted'
  static instances: StubNotification[] = []
  onclick: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor(readonly title: string, readonly options: NotificationOptions) {
    StubNotification.instances.push(this)
  }
}

function row(turn = 0, overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    id: 'session-a' as SessionSummary['id'],
    title: 'Deploy',
    displayTitle: 'Deploy',
    running: false,
    retainedBy: {},
    blank: false,
    updatedAt: 1,
    projectionValues: { notification: { turn, reason: 'completed', body: 'deploy done', tools: [] } },
    ...overrides,
  }
}

function sessionList(...rows: SessionSummary[]): SessionListState {
  return {
    ids: rows.map(summary => summary.id),
    byId: Object.fromEntries(rows.map(summary => [summary.id, summary])),
    phase: 'ready',
    projectionsBySession: {},
  }
}

function snapshot(populated: boolean, turn = 0): SessionListState {
  return sessionList(...(populated ? [row(turn)] : []))
}

const roots: Cordis.Context[] = []

function fixture(populated: boolean | SessionListState) {
  const ctx = new Cordis.Context()
  roots.push(ctx)
  const list = ClientStore.createSnapshotStore(typeof populated === 'boolean' ? snapshot(populated) : populated)
  const listSubscriptions = trackSubscriptions(list)
  const remoteSubscriptions = new Set<(...args: unknown[]) => void>()
  const unregisterLocale = vi.fn()
  const sessions = {
    list,
    // Controller is the fixture boundary. Keep main retention live, but do not
    // manufacture a Session render binding for this non-rendering composition.
    binding: () => undefined,
    retainInfo: (id: string) => ({
      getSnapshot: () => ({ retainedBy: list.getSnapshot().byId[id]?.retainedBy ?? {} }),
      subscribe: list.subscribe.bind(list),
    }),
  }
  ctx.provide('sessions', sessions as never)
  ctx.provide('remote', {
    $on: (_name: string, listener: (...args: unknown[]) => void) => {
      remoteSubscriptions.add(listener)
      return () => { remoteSubscriptions.delete(listener) }
    },
  } as never)
  ctx.provide('locale', {
    register: () => unregisterLocale,
    bind: () => (key: string) => key,
  } as never)
  const slots = new ShellSlots(ctx)
  return { ctx, list, listSubscriptions, remoteSubscriptions, unregisterLocale, slots, sessions }
}

async function mountUiSession(test: ReturnType<typeof fixture>) {
  let uiSession!: UiSessionType
  const fiber = test.ctx.plugin({
    name: 'test.ui-session',
    apply: (ctx: Cordis.Context) => { uiSession = new UiSession(ctx, test.sessions as never) },
  })
  await fiber
  const statusSubscriptions = trackSubscriptions(uiSession.sessionStatus)
  return { uiSession, fiber, statusSubscriptions }
}

/** Read the registered inject factory exactly as the root slot host does. */
function overlay(test: ReturnType<typeof fixture>): InAppNotificationsInjected {
  const entry = test.slots.core.entriesOfSlot('shell.overlay').find(entry => entry.options.id === 'notification.toasts')
  expect(entry?.component).toBe(InAppNotifications)
  expect(entry?.inject).toBeTypeOf('function')
  return entry!.inject!() as unknown as InAppNotificationsInjected
}

function section(test: ReturnType<typeof fixture>): NotificationSectionInjected {
  const entry = test.slots.core.entriesOfSlot('settings.section').find(entry => entry.options.id === 'notification')
  return entry!.inject!() as unknown as NotificationSectionInjected
}

function expectChannels(test: ReturnType<typeof fixture>, systemTags: string[], inAppIds: string[]): void {
  expect(StubNotification.instances.map(notification => notification.options.tag)).toEqual(systemTags)
  expect(overlay(test).hooks.notifications.getSnapshot().map(item => item.id)).toEqual(inAppIds)
  expect(systemTags.filter(tag => inAppIds.includes(tag))).toEqual([])
}

beforeEach(() => {
  localStorage.clear()
  document.head.replaceChildren()
  StubNotification.instances = []
  StubNotification.permission = 'granted'
  vi.stubGlobal('Notification', StubNotification)
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  // Existing notification cases run in a visible but unfocused background window.
  vi.spyOn(document, 'hasFocus').mockReturnValue(false)
  vi.spyOn(console, 'info').mockImplementation(() => {})
})

afterEach(async () => {
  for (const ctx of roots.splice(0)) await ctx.fiber.dispose()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('dsh-notification client composition with npm DSH 0.2.0-rc.2', () => {
  it.each([false, true])('boots and registers settings with populated=%s', async populated => {
    const test = fixture(populated)
    const { uiSession, statusSubscriptions } = await mountUiSession(test)
    expect('pendingInteractions' in uiSession).toBe(false)
    expect('current' in test.list.getSnapshot()).toBe(false)
    const baseline = test.listSubscriptions.size
    const otherOverlay = () => null
    const offOther = test.slots.core.register({ name: 'shell.overlay', id: 'test.other-overlay', order: 10 }, otherOverlay)
    const registrations = vi.spyOn(test.slots.core, 'register')
    const fiber = test.ctx.plugin(notificationPlugin)
    await fiber

    expect(registrations.mock.calls.map(([options]) => options.name)).toEqual(['settings.section', 'shell.overlay'])
    expect(test.slots.core.specDynamic('shell.overlay')).toEqual({ kind: 'list', scope: 'root' })
    const overlays = test.slots.core.entriesOfSlot('shell.overlay')
    expect(overlays.map(entry => entry.options.id)).toEqual(['test.other-overlay', 'notification.toasts'])
    expect(overlays[0]?.component).toBe(otherOverlay)
    const face = overlay(test)
    expect(Object.keys(face).sort()).toEqual(['activate', 'dismiss', 'hooks'])
    expect(face.hooks.notifications.getSnapshot()).toEqual([])
    expect(face.dismiss).toBeTypeOf('function')
    expect(face.activate).toBeTypeOf('function')
    const entries = test.slots.core.entries('settings.section')
    expect(entries).toHaveLength(1)
    expect(entries[0]?.options.id).toBe('notification')
    expect(entries[0]?.component).toBe(NotificationSettingsSection)
    expect(statusSubscriptions.size).toBe(1)
    expect(test.listSubscriptions.size).toBe(baseline + 2)
    expect(StubNotification.instances).toHaveLength(0)

    await fiber.dispose()
    expect(test.slots.core.entries('settings.section')).toHaveLength(0)
    expect(statusSubscriptions.size).toBe(0)
    expect(test.listSubscriptions.size).toBe(baseline)
    expect(test.unregisterLocale).toHaveBeenCalledOnce()
    expect(test.slots.core.entriesOfSlot('shell.overlay').map(entry => entry.options.id)).toEqual(['test.other-overlay'])
    expect(face.hooks.notifications.getSnapshot()).toEqual([])
    offOther()
  })

  it.each([
    { hidden: false, focused: true, expected: 0 },
    { hidden: false, focused: false, expected: 1 },
    { hidden: true, focused: true, expected: 1 },
    { hidden: true, focused: false, expected: 1 },
  ].flatMap(state => [0, 2].map(mainView => ({ ...state, mainView }))))(
    'routes real pending publications with hidden=$hidden focused=$focused mainView=$mainView',
    async ({ hidden, focused, expected, mainView }) => {
      const test = fixture(sessionList(row(0, { retainedBy: { mainView, sidebar: 1 } })))
      const { uiSession } = await mountUiSession(test)
      const publish = uiSession.registerPendingInteraction(() => 0)
      const fiber = test.ctx.plugin(notificationPlugin)
      await fiber

      // Set window state after boot: this must not be captured only at startup.
      // Sidebar retention is not mainView; foreground non-main requests belong in-app.
      vi.spyOn(document, 'hidden', 'get').mockReturnValue(hidden)
      vi.mocked(document.hasFocus).mockReturnValue(focused).mockClear()
      const interaction = { sessionId: row().id, kind: 'approval', key: 'window-gate' }
      const remove = publish(interaction, async () => {})
      expect(uiSession.sessionStatus.getSnapshot().get(row().id)?.pendingInteraction).toBe(interaction)
      expect(document.hasFocus).toHaveBeenCalled()
      const toastExpected = !hidden && focused && mainView === 0
      expectChannels(test,
        expected ? ['dsh-notification-pending-session-a-1'] : [],
        toastExpected ? ['dsh-notification-pending-session-a-1'] : [],
      )
      if (expected > 0) {
        expect(StubNotification.instances[0]?.title).toBe('notify.titleApproval')
        expect(StubNotification.instances[0]?.options.body).toBe('Deploy')
      }
      if (toastExpected) {
        expect(overlay(test).hooks.notifications.getSnapshot()).toEqual([{
          id: 'dsh-notification-pending-session-a-1', title: 'notify.titleApproval',
          body: 'Deploy', sessionTitle: 'Deploy', target: { sessionId: 'session-a' },
        }])
      }
      // An unchanged wait cannot be duplicated or re-routed when the list invalidates.
      test.list.set(sessionList(row(0, { retainedBy: { mainView, sidebar: 1 } })))
      expect(StubNotification.instances).toHaveLength(expected)
      expect(overlay(test).hooks.notifications.getSnapshot()).toHaveLength(toastExpected ? 1 : 0)
      remove()
    },
  )

  it.each([false, true])('seeds a populated completion list before its first update (hidden=%s)', async hidden => {
    const test = fixture(snapshot(true, 5))
    await mountUiSession(test)
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(hidden)
    vi.mocked(document.hasFocus).mockReturnValue(true)
    const fiber = test.ctx.plugin(notificationPlugin)
    await fiber
    expectChannels(test, [], [])

    // The first list update after attachment is a fresh completion, not history.
    test.list.set(snapshot(true, 6))
    const tags = ['dsh-notification-session-a-6']
    expectChannels(test, hidden ? tags : [], hidden ? [] : tags)
    test.list.set(snapshot(true, 6))
    expectChannels(test, hidden ? tags : [], hidden ? [] : tags)

    // Reset must still wait for the incoming baseline, not re-seed the old list.
    test.ctx.emit('connection/reset')
    test.list.set(snapshot(true, 12))
    expectChannels(test, hidden ? tags : [], hidden ? [] : tags)
    test.list.set(snapshot(true, 13))
    tags.push('dsh-notification-session-a-13')
    expectChannels(test, hidden ? tags : [], hidden ? [] : tags)
  })

  it('reads live window focus and visibility on each completion projection advance', async () => {
    const test = fixture(true)
    await mountUiSession(test)
    const focus = vi.mocked(document.hasFocus).mockReturnValue(true)
    const hidden = vi.spyOn(document, 'hidden', 'get')
    const fiber = test.ctx.plugin(notificationPlugin)
    await fiber
    // Seed the real list subscription; historical turn 0 never notifies.
    test.list.set(snapshot(true))
    expect(StubNotification.instances).toHaveLength(0)

    for (const state of [
      { turn: 1, hidden: false, focused: true, expected: 0 },
      { turn: 2, hidden: false, focused: false, expected: 1 },
      { turn: 3, hidden: false, focused: true, expected: 1 },
      // Hidden covers the browser signal for minimized/tray-like state, not native OS behavior.
      { turn: 4, hidden: true, focused: true, expected: 2 },
      { turn: 5, hidden: true, focused: false, expected: 3 },
    ]) {
      hidden.mockReturnValue(state.hidden)
      focus.mockReturnValue(state.focused).mockClear()
      test.list.set(snapshot(true, state.turn))
      expect(focus).toHaveBeenCalled()
      expect(StubNotification.instances).toHaveLength(state.expected)
      const inAppIds = [
        ...(state.turn >= 1 ? ['dsh-notification-session-a-1'] : []),
        ...(state.turn >= 3 ? ['dsh-notification-session-a-3'] : []),
      ]
      expectChannels(test,
        [
          ...(state.turn >= 2 ? ['dsh-notification-session-a-2'] : []),
          ...(state.turn >= 4 ? ['dsh-notification-session-a-4'] : []),
          ...(state.turn >= 5 ? ['dsh-notification-session-a-5'] : []),
        ], inAppIds,
      )
    }
    expect(overlay(test).hooks.notifications.getSnapshot().map(item => item.body)).toEqual(['deploy done', 'deploy done'])
    expect(StubNotification.instances.map(notification => notification.title)).toEqual([
      'notify.titleCompleted', 'notify.titleCompleted', 'notify.titleCompleted',
    ])
    expect(StubNotification.instances.map(notification => notification.options.tag)).toEqual([
      'dsh-notification-session-a-2', 'dsh-notification-session-a-4', 'dsh-notification-session-a-5',
    ])
    expect(StubNotification.instances.map(notification => notification.options.body)).toEqual([
      'deploy done', 'deploy done', 'deploy done',
    ])
  })

  it.each(['denied', 'absent'] as const)('uses the foreground overlay with Notification %s for both runners', async permission => {
    const test = fixture(true)
    const { uiSession } = await mountUiSession(test)
    const publish = uiSession.registerPendingInteraction(() => 0)
    const fiber = test.ctx.plugin(notificationPlugin)
    await fiber
    const notifications = overlay(test).hooks.notifications
    test.list.set(snapshot(true))
    vi.mocked(document.hasFocus).mockReturnValue(true)
    if (permission === 'absent') vi.stubGlobal('Notification', undefined)
    else StubNotification.permission = permission

    test.list.set(snapshot(true, 1))
    const remove = publish({ sessionId: row().id, kind: 'question', key: 'foreground' }, async () => {})
    expectChannels(test, [], ['dsh-notification-session-a-1', 'dsh-notification-pending-session-a-1'])
    expect(notifications.getSnapshot()).toEqual([
      { id: 'dsh-notification-session-a-1', title: 'notify.titleCompleted', body: 'deploy done',
        sessionTitle: 'Deploy', target: { sessionId: 'session-a' } },
      { id: 'dsh-notification-pending-session-a-1', title: 'notify.titleQuestion', body: 'Deploy',
        sessionTitle: 'Deploy', target: { sessionId: 'session-a' } },
    ])
    remove()
    // Denied/absent OS support does not turn background events into extra toasts.
    vi.mocked(document.hasFocus).mockReturnValue(false)
    test.list.set(snapshot(true, 2))
    const removeBackground = publish({ sessionId: row().id, kind: 'approval', key: 'background' }, async () => {})
    expectChannels(test, [], ['dsh-notification-session-a-1', 'dsh-notification-pending-session-a-1'])
    removeBackground()
  })

  it.each([0, 2])('keeps backgroundOnly OFF always-system even with mainView=%s', async mainView => {
    const state = (turn: number) => sessionList(row(turn, { retainedBy: { mainView } }))
    const test = fixture(state(0))
    const { uiSession } = await mountUiSession(test)
    const publish = uiSession.registerPendingInteraction(() => 0)
    const fiber = test.ctx.plugin(notificationPlugin)
    await fiber
    test.list.set(state(0))
    section(test).set({ backgroundOnly: false })
    vi.mocked(document.hasFocus).mockReturnValue(true)

    test.list.set(state(1))
    const remove = publish({ sessionId: row().id, kind: 'approval', key: 'always-system' }, async () => {})
    expectChannels(test, ['dsh-notification-session-a-1', 'dsh-notification-pending-session-a-1'], [])
    remove()
    StubNotification.permission = 'denied'
    test.list.set(state(2))
    const removeDenied = publish({ sessionId: row().id, kind: 'question', key: 'denied' }, async () => {})
    expectChannels(test, ['dsh-notification-session-a-1', 'dsh-notification-pending-session-a-1'], [])
    removeDenied()
    // Changing policy never replays a previously consumed event.
    section(test).set({ backgroundOnly: true })
    test.list.set(state(2))
    expectChannels(test, ['dsh-notification-session-a-1', 'dsh-notification-pending-session-a-1'], [])
  })

  it('routes multiple completion sessions across live mainView and window transitions without replaying history', async () => {
    const a = (turn: number, mainView: number) => row(turn, { retainedBy: { mainView } })
    const b = (turn: number, mainView: number) => row(turn, {
      id: 'session-b' as SessionSummary['id'], title: 'Review', displayTitle: 'Review',
      retainedBy: { mainView, sidebar: 1 },
    })
    const test = fixture(sessionList(a(7, 2), b(12, 0)))
    await mountUiSession(test)
    const fiber = test.ctx.plugin(notificationPlugin)
    await fiber
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    const focus = vi.mocked(document.hasFocus).mockReturnValue(true)
    test.list.set(sessionList(a(7, 2), b(12, 0)))
    expectChannels(test, [], [])

    test.list.set(sessionList(a(8, 2), b(13, 0)))
    expectChannels(test, [], ['dsh-notification-session-b-13'])
    expect(overlay(test).hooks.notifications.getSnapshot()[0]).toEqual({
      id: 'dsh-notification-session-b-13', title: 'notify.titleCompleted', body: 'deploy done',
      sessionTitle: 'Review', target: { sessionId: 'session-b' },
    })
    // Main-view movement alone does not replay the suppressed A turn or B toast.
    test.list.set(sessionList(a(8, 0), b(13, 2)))
    expectChannels(test, [], ['dsh-notification-session-b-13'])
    test.list.set(sessionList(a(9, 0), b(14, 2)))
    const toastIds = ['dsh-notification-session-b-13', 'dsh-notification-session-a-9']
    expectChannels(test, [], toastIds)

    // A hidden window sends OS notifications even for its current main session.
    hidden.mockReturnValue(true)
    focus.mockReturnValue(true).mockClear()
    test.list.set(sessionList(a(10, 0), b(15, 2)))
    expect(focus).toHaveBeenCalled()
    const systemTags = ['dsh-notification-session-a-10', 'dsh-notification-session-b-15']
    expectChannels(test, systemTags, toastIds)
    hidden.mockReturnValue(false)
    focus.mockReturnValue(false).mockClear()
    test.list.set(sessionList(a(11, 2), b(16, 0)))
    expect(focus).toHaveBeenCalled()
    systemTags.push('dsh-notification-session-a-11', 'dsh-notification-session-b-16')
    expectChannels(test, systemTags, toastIds)

    // Every retained mainView is foreground: positive counts are not one selected id.
    focus.mockReturnValue(true)
    test.list.set(sessionList(a(12, 1), b(17, 2)))
    expectChannels(test, systemTags, toastIds)
    const c = (turn: number) => row(turn, { id: 'session-c' as SessionSummary['id'], displayTitle: 'History' })
    test.list.set(sessionList(a(12, 1), b(17, 2), c(60)))
    expectChannels(test, systemTags, toastIds)
    test.list.set(sessionList(a(12, 1), b(17, 2), c(61)))
    toastIds.push('dsh-notification-session-c-61')
    expectChannels(test, systemTags, toastIds)
    // Reordering, archiving, and re-adding history cannot duplicate/re-route it.
    focus.mockReturnValue(false)
    test.list.set(sessionList(c(61), b(17, 2), a(12, 1)))
    test.list.set(sessionList(a(12, 1), b(17, 2)))
    test.list.set(sessionList(a(12, 1), b(17, 2), c(99)))
    expectChannels(test, systemTags, toastIds)
    test.ctx.emit('connection/reset')
    test.list.set(sessionList(a(30, 1), b(40, 2), c(100)))
    expectChannels(test, systemTags, toastIds)
  })

  it('seeds historical real pending waits and consumes each fresh wait only once across channel changes', async () => {
    const test = fixture(true)
    const { uiSession } = await mountUiSession(test)
    const publish = uiSession.registerPendingInteraction(() => 0)
    const interaction = { sessionId: row().id, kind: 'approval', key: 'history' }
    const removeHistory = publish(interaction, async () => {})
    const fiber = test.ctx.plugin(notificationPlugin)
    await fiber
    vi.mocked(document.hasFocus).mockReturnValue(true)
    section(test).set({ notifyPlanReview: true })
    test.list.set(snapshot(true))
    expectChannels(test, [], [])
    removeHistory()

    const remove = publish({ ...interaction, key: 'fresh' }, async () => {})
    expectChannels(test, [], ['dsh-notification-pending-session-a-1'])
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    test.list.set(sessionList(row(0, { retainedBy: { mainView: 2 } })))
    expectChannels(test, [], ['dsh-notification-pending-session-a-1'])
    remove()
    const removeQuestion = publish({ ...interaction, kind: 'question', key: 'background' }, async () => {})
    expectChannels(test, ['dsh-notification-pending-session-a-2'], ['dsh-notification-pending-session-a-1'])
    removeQuestion()

    hidden.mockReturnValue(false)
    const removeMain = publish({ ...interaction, key: 'current-main' }, async () => {})
    expectChannels(test, ['dsh-notification-pending-session-a-2'], ['dsh-notification-pending-session-a-1'])
    test.list.set(snapshot(true))
    expectChannels(test, ['dsh-notification-pending-session-a-2'], ['dsh-notification-pending-session-a-1'])
    removeMain()
    const removePlan = publish({ ...interaction, kind: 'plan-review', key: 'new-plan' }, async () => {})
    const toastIds = ['dsh-notification-pending-session-a-1', 'dsh-notification-pending-session-a-4']
    expectChannels(test, ['dsh-notification-pending-session-a-2'], toastIds)
    expect(overlay(test).hooks.notifications.getSnapshot()[1]?.title).toBe('notify.titlePlanReview')
    test.ctx.emit('connection/reset')
    test.list.set(snapshot(true))
    test.list.set(snapshot(false))
    test.list.set(snapshot(true))
    expectChannels(test, ['dsh-notification-pending-session-a-2'], toastIds)
    removePlan()
  })

  it('clears the registered overlay store and timers on unload and reloads without stale reminders', async () => {
    const test = fixture(true)
    const { uiSession, statusSubscriptions, fiber: sessionFiber } = await mountUiSession(test)
    const publish = uiSession.registerPendingInteraction(() => 0)
    const baseline = test.listSubscriptions.size
    const fiber = test.ctx.plugin(notificationPlugin)
    await fiber
    test.list.set(snapshot(true))
    vi.mocked(document.hasFocus).mockReturnValue(true)
    // Fake only toast timers, after Cordis activation has settled.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const timerBaseline = vi.getTimerCount()
    const face = overlay(test)
    const changes = vi.fn()
    const stop = face.hooks.notifications.subscribe(changes)
    test.list.set(snapshot(true, 1))
    const remove = publish({ sessionId: row().id, kind: 'question', key: 'timed' }, async () => {})
    expectChannels(test, [], ['dsh-notification-session-a-1', 'dsh-notification-pending-session-a-1'])
    expect(vi.getTimerCount()).toBe(timerBaseline + 2)
    face.dismiss('dsh-notification-session-a-1')
    expect(vi.getTimerCount()).toBe(timerBaseline + 1)
    section(test).set({ requireInteraction: true })
    expect(section(test).hooks.settings.getSnapshot().requireInteraction).toBe(true)
    // jsdom localStorage.setItem queues a 0ms storage event; this is not a toast.
    vi.advanceTimersByTime(0)
    test.list.set(snapshot(true, 2))
    expect(vi.getTimerCount()).toBe(timerBaseline + 1)
    expect(face.hooks.notifications.getSnapshot()).toHaveLength(2)

    await fiber.dispose()
    expect(test.slots.core.entries('shell.overlay')).toHaveLength(0)
    expect(test.slots.core.entries('settings.section')).toHaveLength(0)
    expect(statusSubscriptions.size).toBe(0)
    expect(test.listSubscriptions.size).toBe(baseline)
    expect(face.hooks.notifications.getSnapshot()).toEqual([])
    expect(vi.getTimerCount()).toBe(timerBaseline)
    changes.mockClear()
    vi.runAllTimers()
    expect(changes).not.toHaveBeenCalled()
    remove()
    const removeAfterUnload = publish({ sessionId: row().id, kind: 'approval', key: 'after-unload' }, async () => {})
    test.list.set(snapshot(true, 3))
    expect(face.hooks.notifications.getSnapshot()).toEqual([])
    expect(StubNotification.instances).toHaveLength(0)
    expect(vi.getTimerCount()).toBe(timerBaseline)
    stop()
    vi.useRealTimers()

    const reloaded = test.ctx.plugin(notificationPlugin)
    await reloaded
    expect(test.slots.core.entries('shell.overlay')).toHaveLength(1)
    expect(test.slots.core.entries('settings.section')).toHaveLength(1)
    expect(statusSubscriptions.size).toBe(1)
    test.list.set(snapshot(true, 3))
    expectChannels(test, [], [])
    removeAfterUnload()
    test.list.set(snapshot(true, 4))
    expectChannels(test, [], ['dsh-notification-session-a-4'])
    await reloaded.dispose()
    await sessionFiber.dispose()
    expect(test.listSubscriptions.size).toBe(0)
    expect(test.remoteSubscriptions.size).toBe(0)
  })

  it('uses live optional workspace navigation safely for both channels and dismisses activated toasts', async () => {
    const test = fixture(true)
    await mountUiSession(test)
    const fiber = test.ctx.plugin(notificationPlugin)
    await fiber
    test.list.set(snapshot(true))
    const focus = vi.spyOn(window, 'focus').mockImplementation(() => {})
    vi.mocked(document.hasFocus).mockReturnValue(true)
    const face = overlay(test)
    test.list.set(snapshot(true, 1))
    expect(() => face.activate('dsh-notification-session-a-1')).not.toThrow()
    expect(focus).toHaveBeenCalledOnce()
    expect(face.hooks.notifications.getSnapshot()).toEqual([])

    test.list.set(snapshot(true, 2))
    const openSession = vi.fn()
    const workspaceFiber = test.ctx.plugin({
      name: 'test.workspace',
      apply: (scope: Cordis.Context) => { scope.provide('uiWorkspace', { openSession } as never) },
    })
    await workspaceFiber
    face.activate('dsh-notification-session-a-2')
    expect(openSession).toHaveBeenCalledExactlyOnceWith('session-a')
    expect(face.hooks.notifications.getSnapshot()).toEqual([])
    test.list.set(snapshot(true, 3))
    test.list.set(snapshot(false))
    expect(() => face.activate('dsh-notification-session-a-3')).not.toThrow()
    expect(openSession).toHaveBeenCalledOnce()
    expect(face.hooks.notifications.getSnapshot()).toEqual([])

    test.list.set(snapshot(true, 3))
    vi.mocked(document.hasFocus).mockReturnValue(false)
    test.list.set(snapshot(true, 4))
    expectChannels(test, ['dsh-notification-session-a-4'], [])
    expect(() => StubNotification.instances[0]?.onclick?.()).not.toThrow()
    expect(openSession).toHaveBeenCalledTimes(2)
    expect(openSession).toHaveBeenLastCalledWith('session-a')
    test.list.set(snapshot(false))
    StubNotification.instances[0]?.onclick?.()
    expect(openSession).toHaveBeenCalledTimes(2)
    test.list.set(snapshot(true, 4))
    vi.mocked(document.hasFocus).mockReturnValue(true)
    test.list.set(snapshot(true, 5))
    openSession.mockImplementation(() => { throw new Error('navigation unavailable') })
    expect(() => face.activate('dsh-notification-session-a-5')).not.toThrow()
    expect(face.hooks.notifications.getSnapshot()).toEqual([])
    await workspaceFiber.dispose()
    test.list.set(snapshot(true, 6))
    expect(() => face.activate('dsh-notification-session-a-6')).not.toThrow()
    expect(openSession).toHaveBeenCalledTimes(3)
    expect(face.hooks.notifications.getSnapshot()).toEqual([])
  })

  it('notifies from the real status publisher and unsubscribes on plugin disposal', async () => {
    const test = fixture(true)
    const { uiSession, statusSubscriptions, fiber: sessionFiber } = await mountUiSession(test)
    const publish = uiSession.registerPendingInteraction(() => 0)
    const baseline = test.listSubscriptions.size
    const fiber = test.ctx.plugin(notificationPlugin)
    await fiber

    const interaction = { sessionId: row().id, kind: 'approval', key: 'approval-1' }
    const remove = publish(interaction, async () => {})
    expect(uiSession.sessionStatus.getSnapshot().get(row().id)?.pendingInteraction).toBe(interaction)
    expect(StubNotification.instances).toHaveLength(1)
    expect(StubNotification.instances[0]?.title).toBe('notify.titleApproval')
    expect(StubNotification.instances[0]?.options.body).toBe('Deploy')
    // A list invalidation while the same wait persists is not another request.
    test.list.set(snapshot(true))
    expect(StubNotification.instances).toHaveLength(1)
    remove()
    const removeNext = publish({ ...interaction, key: 'approval-2' }, async () => {})
    expect(StubNotification.instances).toHaveLength(2)
    removeNext()

    await fiber.dispose()
    expect(statusSubscriptions.size).toBe(0)
    expect(test.listSubscriptions.size).toBe(baseline)
    expect(test.slots.core.entries('settings.section')).toHaveLength(0)
    expect(test.slots.core.entries('shell.overlay')).toHaveLength(0)
    const removeAfterUnload = publish({ ...interaction, key: 'approval-3' }, async () => {})
    test.list.set(snapshot(true))
    expect(StubNotification.instances).toHaveLength(2)
    removeAfterUnload()
    await sessionFiber.dispose()
    expect(test.listSubscriptions.size).toBe(0)
    expect(test.remoteSubscriptions.size).toBe(0)
  })
})
