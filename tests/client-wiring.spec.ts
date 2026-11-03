/**
 * Layered routing across session data and live shell window state.
 * Browser APIs and the context are small fixtures; the real UiSession contract
 * is exercised separately by the client composition spec.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { apply, inject } from '../src/client/index.ts'
import type { NotificationSettings } from '../src/contract.ts'
import type { InAppNotificationsInjected } from '../src/client/InAppNotifications.tsx'

interface WiringSummary {
  readonly id: string
  readonly origin?: string
  readonly title?: string
  readonly displayTitle?: string
  readonly retainedBy?: Readonly<Record<string, number>>
  readonly projectionValues?: {
    readonly notification?: { readonly turn: number; readonly reason: string; readonly body: string; readonly tools: readonly string[] }
  }
}

interface WiringSnapshot {
  readonly ids: readonly string[]
  readonly byId: Readonly<Record<string, WiringSummary>>
  /** The real controller starts at `pending`; fixtures default to `ready`. */
  readonly phase?: 'pending' | 'ready'
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

function completionSummary(turn: number): WiringSummary {
  return {
    id: 'session-a',
    origin: 'user',
    title: 'Deploy',
    displayTitle: 'Deploy',
    projectionValues: { notification: { turn, reason: 'completed', body: 'deploy done', tools: ['bash'] } },
  }
}

function observable<T>(initial: T) {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => value,
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    set(next: T): void {
      value = next
      for (const listener of [...listeners]) listener()
    },
    listeners,
  }
}

interface SettingsInjected {
  set(patch: Partial<NotificationSettings>): void
  sendTest(): { readonly ok: boolean }
}

const cleanup: Array<() => void> = []

function bootstrap(initial: WiringSnapshot = { ids: [], byId: {} }) {
  const listeners: Array<() => void> = []
  const effects: Array<() => void> = []
  const events = new Map<string, Set<() => void>>()
  const lazy: Array<{ deps: string[]; callback: (scope: ClientContext) => unknown; off?: () => void }> = []
  let snapshot: WiringSnapshot = { phase: 'ready', ...initial }
  const refresh = vi.fn(async (): Promise<void> => {})
  const sessions = {
    refresh,
    list: {
      getSnapshot: (): WiringSnapshot => snapshot,
      subscribe: (listener: () => void): (() => void) => {
        listeners.push(listener)
        return () => {
          const index = listeners.indexOf(listener)
          if (index >= 0) listeners.splice(index, 1)
        }
      },
    },
  }
  const services = new Map<string, unknown>([['sessions', sessions]])
  const register = vi.fn((_entry: object, _component: unknown) => ({}))
  const ctx = {
    effect: (callback: () => unknown) => {
      const disposer = callback()
      const off = typeof disposer === 'function' ? disposer as () => void : () => {}
      effects.push(off)
      return off
    },
    locale: { register: () => () => {}, bind: () => (key: string) => key },
    get: (name: string) => services.get(name),
    inject: (deps: string[], callback: (scope: ClientContext) => unknown) => {
      const entry = { deps, callback, off: undefined as (() => void) | undefined }
      lazy.push(entry)
      if (deps.every(dep => services.has(dep))) {
        const disposer = callback(ctx)
        if (typeof disposer === 'function') entry.off = disposer as () => void
      }
      return () => { entry.off?.() }
    },
    on: (event: string, callback: () => void) => {
      let set = events.get(event)
      if (set === undefined) events.set(event, set = new Set())
      set.add(callback)
      return () => { set.delete(callback) }
    },
    slots: { inject: (_name: string, factory: () => unknown) => factory(), register },
  } as unknown as ClientContext
  const disconnect = (name: string): void => {
    services.delete(name)
    for (const entry of lazy.filter(entry => entry.deps.includes(name))) {
      entry.off?.()
      entry.off = undefined
    }
  }
  const connect = (name: string, value: unknown): void => {
    disconnect(name)
    services.set(name, value)
    for (const entry of lazy.filter(entry => entry.deps.includes(name))) {
      const disposer = entry.callback(ctx)
      if (typeof disposer === 'function') entry.off = disposer as () => void
    }
  }
  let disposed = false
  const dispose = (): void => {
    if (disposed) return
    disposed = true
    for (const entry of lazy) entry.off?.()
    for (const off of effects.reverse()) off()
  }
  cleanup.push(dispose)
  const slot = <T>(name: string): T => {
    const entry = register.mock.calls.map(([entry]) => entry).find(entry => (entry as { name?: string }).name === name)
    expect(entry, `registered ${name} slot`).toBeDefined()
    return (entry as { inject: () => T }).inject()
  }
  return {
    ctx, listeners, register, connect, disconnect, slot, dispose, refresh,
    setSnapshot: (next: WiringSnapshot) => { snapshot = { phase: 'ready', ...next } },
    tick: () => { for (const listener of [...listeners]) listener() },
    reset: () => { for (const listener of [...(events.get('connection/reset') ?? [])]) listener() },
  }
}

function completionFixture() {
  const fixture = bootstrap()
  apply(fixture.ctx)
  fixture.setSnapshot({ ids: ['session-a'], byId: { 'session-a': completionSummary(0) } })
  fixture.tick()
  fixture.setSnapshot({ ids: ['session-a'], byId: { 'session-a': completionSummary(1) } })
  fixture.tick()
  const openSession = vi.fn()
  fixture.connect('uiWorkspace', { openSession })
  return { ...fixture, openSession }
}

const automaticEvents = ['completion', 'pending'] as const
type AutomaticEvent = typeof automaticEvents[number]
type Status = { pendingInteraction?: { kind: string } }

/** Seed both runners, then expose equivalent fresh/repeated event operations. */
function automaticFixture(event: AutomaticEvent, facts: Partial<WiringSummary> = { retainedBy: {} }) {
  let turn = 0
  let row = facts
  const snapshot = (): WiringSnapshot => ({
    ids: ['session-a'],
    byId: { 'session-a': { ...completionSummary(turn), ...row } },
  })
  const fixture = bootstrap(snapshot())
  const status = observable<ReadonlyMap<string, Status>>(new Map())
  if (event === 'pending') fixture.connect('uiSession', { sessionStatus: status })
  apply(fixture.ctx)
  fixture.tick()
  const overlay = fixture.slot<InAppNotificationsInjected>('shell.overlay')
  const settings = fixture.slot<SettingsInjected>('settings.section')
  return {
    ...fixture, overlay, settings, status,
    reminders: () => overlay.hooks.notifications.getSnapshot(),
    advance: () => {
      if (event === 'completion') {
        turn += 1
        fixture.setSnapshot(snapshot())
        fixture.tick()
      } else {
        status.set(new Map())
        status.set(new Map([['session-a', { pendingInteraction: { kind: 'question' } }]]))
      }
    },
    repeat: () => {
      fixture.tick()
      if (event === 'pending') status.set(new Map(status.getSnapshot()))
    },
    select: (facts: Partial<WiringSummary>) => {
      row = facts
      fixture.setSnapshot(snapshot())
      fixture.tick()
    },
  }
}

const focus = vi.fn()

/** Browser globals the activation controller reads and writes. */
const locationStub = { pathname: '/', search: '', hash: '' }
const historyStub = {
  replaceState: vi.fn((_state: unknown, _title: string, _url?: string) => { locationStub.hash = '' }),
}
const windowHandlers = new Map<string, Set<() => void>>()

function dispatchWindowEvent(name: string): void {
  for (const handler of [...(windowHandlers.get(name) ?? [])]) handler()
}

/** Model the shell's `location.hash = ...` write, including `hashchange`. */
function setActivationHash(hash: string): void {
  locationStub.hash = hash
  dispatchWindowEvent('hashchange')
}

beforeEach(() => {
  vi.useFakeTimers()
  StubNotification.permission = 'granted'
  StubNotification.instances = []
  focus.mockReset()
  locationStub.pathname = '/'
  locationStub.search = ''
  locationStub.hash = ''
  historyStub.replaceState.mockClear()
  windowHandlers.clear()
  vi.stubGlobal('Notification', StubNotification)
  vi.stubGlobal('window', {
    focus,
    location: locationStub,
    history: historyStub,
    addEventListener: (name: string, handler: () => void) => {
      let handlers = windowHandlers.get(name)
      if (handlers === undefined) windowHandlers.set(name, handlers = new Set())
      handlers.add(handler)
    },
    removeEventListener: (name: string, handler: () => void) => {
      windowHandlers.get(name)?.delete(handler)
    },
  })
  vi.stubGlobal('document', {
    hidden: true,
    hasFocus: () => true,
    getElementById: () => null,
    createElement: () => ({ id: '', textContent: '' }),
    head: { appendChild: () => {} },
  })
})

afterEach(() => {
  for (const off of cleanup.splice(0).reverse()) off()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('notification click wiring', () => {
  it('does not require optional uiWorkspace or uiSession at boot', () => {
    expect(inject).not.toContain('uiWorkspace')
    expect(inject).not.toContain('uiSession')
  })

  it('focuses the window and opens the originating session, not the current one', () => {
    const { openSession } = completionFixture()
    expect(StubNotification.instances).toHaveLength(1)
    StubNotification.instances[0]!.onclick?.()
    expect(focus).toHaveBeenCalledTimes(1)
    expect(openSession).toHaveBeenCalledExactlyOnceWith('session-a')
  })

  it('degrades to focus-only when the session left the list before the click', () => {
    const fixture = completionFixture()
    const { openSession } = fixture
    StubNotification.instances[0]!.onclick?.()
    expect(openSession).toHaveBeenCalledTimes(1)
    fixture.setSnapshot({ ids: [], byId: {} })
    expect(() => StubNotification.instances[0]!.onclick?.()).not.toThrow()
    expect(openSession).toHaveBeenCalledTimes(1)
  })
})

describe('portable shell hash activation', () => {
  it('opens a session from a hash that predates uiWorkspace and clears it', () => {
    const fixture = bootstrap({ ids: ['session-a'], byId: { 'session-a': completionSummary(1) } })
    apply(fixture.ctx)
    locationStub.pathname = '/app'
    locationStub.search = '?profile=web'
    locationStub.hash = '#dsh-session=session-a&n=n-cold'
    const openSession = vi.fn()
    fixture.connect('uiWorkspace', { openSession })
    expect(openSession).toHaveBeenCalledExactlyOnceWith('session-a')
    expect(locationStub.hash).toBe('')
    expect(historyStub.replaceState).toHaveBeenCalledWith(null, '', '/app?profile=web')
  })

  it('opens on a later hashchange and ignores a repeated nonce', () => {
    const fixture = completionFixture()
    setActivationHash('#dsh-session=session-a&n=n-hot')
    expect(fixture.openSession).toHaveBeenCalledExactlyOnceWith('session-a')
    setActivationHash('#dsh-session=session-a&n=n-hot')
    expect(fixture.openSession).toHaveBeenCalledTimes(1)
  })

  it('opens once when a notification click and a hash coincide', () => {
    const fixture = completionFixture()
    setActivationHash('#dsh-session=session-a&n=n-both')
    StubNotification.instances[0]!.onclick?.()
    expect(fixture.openSession).toHaveBeenCalledExactlyOnceWith('session-a')
    expect(focus).toHaveBeenCalledTimes(1)
  })

  it('allows a deliberate reveal after the dedupe window', () => {
    const fixture = completionFixture()
    setActivationHash('#dsh-session=session-a&n=n-first')
    StubNotification.instances[0]!.onclick?.()
    expect(fixture.openSession).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(749)
    StubNotification.instances[0]!.onclick?.()
    expect(fixture.openSession).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1)
    StubNotification.instances[0]!.onclick?.()
    expect(fixture.openSession).toHaveBeenCalledTimes(2)
  })

  it('refreshes once for an unlisted id, then opens it when the list catches up', () => {
    const fixture = bootstrap({ ids: [], byId: {} })
    apply(fixture.ctx)
    const openSession = vi.fn()
    fixture.connect('uiWorkspace', { openSession })
    setActivationHash('#dsh-session=session-a&n=n-refresh')
    expect(fixture.refresh).toHaveBeenCalledTimes(1)
    expect(openSession).not.toHaveBeenCalled()
    expect(locationStub.hash).toBe('#dsh-session=session-a&n=n-refresh')

    fixture.setSnapshot({ ids: ['session-a'], byId: { 'session-a': completionSummary(1) } })
    fixture.tick()
    expect(fixture.refresh).toHaveBeenCalledTimes(1)
    expect(openSession).toHaveBeenCalledExactlyOnceWith('session-a')
    expect(locationStub.hash).toBe('')
  })

  it('drops a pending hash at the 20 second deadline', () => {
    const fixture = bootstrap({ ids: [], byId: {}, phase: 'pending' })
    apply(fixture.ctx)
    const openSession = vi.fn()
    fixture.connect('uiWorkspace', { openSession })
    setActivationHash('#dsh-session=session-a&n=n-slow')
    expect(openSession).not.toHaveBeenCalled()
    vi.advanceTimersByTime(20_000)
    expect(locationStub.hash).toBe('')
    expect(openSession).not.toHaveBeenCalled()
  })

  it('keeps the hash while uiWorkspace is absent and applies it on late activation', () => {
    const hash = '#dsh-session=session-a&n=n-late'
    const fixture = bootstrap({ ids: ['session-a'], byId: { 'session-a': completionSummary(1) } })
    apply(fixture.ctx)
    locationStub.hash = hash
    expect(locationStub.hash).toBe(hash)
    expect(fixture.register).toHaveBeenCalled()

    const openSession = vi.fn()
    fixture.connect('uiWorkspace', { openSession })
    expect(openSession).toHaveBeenCalledExactlyOnceWith('session-a')
    expect(locationStub.hash).toBe('')
  })

  it('skips an archived target', () => {
    const fixture = bootstrap({ ids: ['session-a'], byId: { 'session-a': completionSummary(1) } })
    apply(fixture.ctx)
    fixture.connect('workspaces', {
      list: {
        getSnapshot: () => ({ phase: 'ready', archivedSessionIds: ['session-a'] }),
        subscribe: () => () => {},
      },
    })
    const openSession = vi.fn()
    fixture.connect('uiWorkspace', { openSession })
    setActivationHash('#dsh-session=session-a&n=n-archived')
    expect(openSession).not.toHaveBeenCalled()
    expect(locationStub.hash).toBe('')
  })

  it('unsubscribes from hashchange when the workspace service leaves', () => {
    const fixture = completionFixture()
    fixture.disconnect('uiWorkspace')
    setActivationHash('#dsh-session=session-a&n=n-gone')
    expect(fixture.openSession).not.toHaveBeenCalled()
    expect(locationStub.hash).toBe('#dsh-session=session-a&n=n-gone')

    fixture.connect('uiWorkspace', { openSession: fixture.openSession })
    expect(fixture.openSession).toHaveBeenCalledExactlyOnceWith('session-a')
  })

  it('falls back to clearing the fragment when replaceState throws', () => {
    const fixture = completionFixture()
    historyStub.replaceState.mockImplementationOnce(() => { throw new Error('history is blocked') })
    setActivationHash('#dsh-session=session-a&n=n-fallback')
    expect(fixture.openSession).toHaveBeenCalledExactlyOnceWith('session-a')
    expect(locationStub.hash).toBe('')
  })
})

describe.each(automaticEvents)('%s layered routing', event => {
  const inViewCases: Array<{ label: string; facts: Partial<WiringSummary>; count: number }> = [
    { label: 'mainView=1', facts: { retainedBy: { mainView: 1 } }, count: 0 },
    { label: 'mainView=3 with another source', facts: { retainedBy: { mainView: 3, sidebar: 1 } }, count: 0 },
    { label: 'mainView=0', facts: { retainedBy: { mainView: 0 } }, count: 1 },
    { label: 'sidebar retention only', facts: { retainedBy: { sidebar: 2 } }, count: 1 },
    { label: 'empty retainedBy', facts: { retainedBy: {} }, count: 1 },
    { label: 'absent retainedBy', facts: { retainedBy: undefined }, count: 1 },
  ]

  it.each(inViewCases)('routes a foreground event using $label', ({ facts, count }) => {
    Object.assign(document, { hidden: false, hasFocus: () => true })
    const fixture = automaticFixture(event, facts)
    fixture.advance()
    expect(fixture.reminders()).toHaveLength(count)
    expect(StubNotification.instances).toHaveLength(0)
  })

  const permissions = ['granted', 'default', 'denied', 'unavailable'] as const
  const windows = [
    { hidden: false, focused: true },
    { hidden: false, focused: false },
    { hidden: true, focused: true },
    { hidden: true, focused: false },
  ]
  const setPermission = (permission: typeof permissions[number]): void => {
    if (permission === 'unavailable') vi.stubGlobal('Notification', undefined)
    else StubNotification.permission = permission
  }

  it.each(permissions)('shows only an in-app reminder for another foreground session with OS permission %s', permission => {
    Object.assign(document, { hidden: false, hasFocus: () => true })
    setPermission(permission)
    const fixture = automaticFixture(event, { retainedBy: { sidebar: 1 } }, 'session-a')
    fixture.advance()
    expect(fixture.reminders()).toEqual([expect.objectContaining({
      id: event === 'completion' ? 'dsh-notification-session-a-1' : 'dsh-notification-pending-session-a-1',
      title: event === 'completion' ? 'notify.titleCompleted' : 'notify.titleQuestion',
      body: event === 'completion' ? 'deploy done' : 'Deploy',
      sessionTitle: 'Deploy',
    })])
    expect(StubNotification.instances).toHaveLength(0)
  })

  it.each(permissions.flatMap(permission => windows.slice(1).flatMap(window =>
    [false, true].map(mainView => ({ permission, ...window, mainView })),
  )))('routes background events exclusively to system ($permission/$hidden/$focused/main=$mainView)', ({ permission, hidden, focused, mainView }) => {
    Object.assign(document, { hidden, hasFocus: () => focused })
    setPermission(permission)
    const fixture = automaticFixture(event, { retainedBy: mainView ? { mainView: 2 } : { sidebar: 1 } }, 'session-a')
    fixture.advance()
    expect(StubNotification.instances).toHaveLength(permission === 'granted' ? 1 : 0)
    expect(fixture.reminders()).toHaveLength(0)
  })

  it.each(permissions.flatMap(permission => windows.flatMap(window =>
    [false, true].map(mainView => ({ permission, ...window, mainView })),
  )))('keeps OFF always-system behavior ($permission/$hidden/$focused/main=$mainView)', ({ permission, hidden, focused, mainView }) => {
    Object.assign(document, { hidden, hasFocus: () => focused })
    setPermission(permission)
    const fixture = automaticFixture(event, { retainedBy: mainView ? { mainView: 2 } : {} }, 'session-a')
    fixture.settings.set({ backgroundOnly: false })
    fixture.advance()
    expect(StubNotification.instances).toHaveLength(permission === 'granted' ? 1 : 0)
    expect(fixture.reminders()).toHaveLength(0)
  })

  it('reads focus and visibility live for every event without replaying an event on another surface', () => {
    let focused = true
    Object.assign(document, { hidden: false, hasFocus: () => focused })
    const fixture = automaticFixture(event)
    fixture.advance()
    expect(fixture.reminders()).toHaveLength(1)
    fixture.overlay.dismiss(fixture.reminders()[0]!.id)
    focused = false
    fixture.repeat()
    expect(StubNotification.instances).toHaveLength(0)
    fixture.advance()
    expect(StubNotification.instances).toHaveLength(1)
    expect(fixture.reminders()).toHaveLength(0)
    focused = true
    fixture.advance()
    expect(StubNotification.instances).toHaveLength(1)
    expect(fixture.reminders()).toHaveLength(1)
    fixture.overlay.dismiss(fixture.reminders()[0]!.id)
    Object.assign(document, { hidden: true })
    fixture.advance()
    expect(StubNotification.instances).toHaveLength(2)
    expect(fixture.reminders()).toHaveLength(0)
  })

  it('re-reads main-view retention and does not replay a suppressed event after view changes', () => {
    Object.assign(document, { hidden: false, hasFocus: () => true })
    const fixture = automaticFixture(event, { retainedBy: { mainView: 2 } }, 'session-b')
    fixture.advance()
    expect(fixture.reminders()).toHaveLength(0)
    fixture.select({ retainedBy: { mainView: 0, sidebar: 1 } }, 'session-a')
    fixture.repeat()
    expect(fixture.reminders()).toHaveLength(0)
    fixture.advance()
    expect(fixture.reminders()).toHaveLength(1)
    fixture.overlay.dismiss(fixture.reminders()[0]!.id)
    fixture.select({ retainedBy: { mainView: 1 } }, 'session-b')
    fixture.advance()
    expect(fixture.reminders()).toHaveLength(0)
    expect(StubNotification.instances).toHaveLength(0)
  })

  it('reads ON/OFF changes live without changing the system route when OFF', () => {
    Object.assign(document, { hidden: false, hasFocus: () => true })
    const fixture = automaticFixture(event, { retainedBy: {} }, 'session-a')
    fixture.advance()
    expect(fixture.reminders()).toHaveLength(1)
    fixture.overlay.dismiss(fixture.reminders()[0]!.id)
    fixture.settings.set({ backgroundOnly: false })
    fixture.repeat()
    expect(StubNotification.instances).toHaveLength(0)
    fixture.advance()
    expect(StubNotification.instances).toHaveLength(1)
    expect(fixture.reminders()).toHaveLength(0)
    fixture.settings.set({ backgroundOnly: true })
    fixture.advance()
    expect(fixture.reminders()).toHaveLength(1)
    expect(StubNotification.instances).toHaveLength(1)
  })

  it.each([
    { label: 'master switch', patch: { enabled: false } },
    { label: 'outcome switch', patch: event === 'completion' ? { notifyCompleted: false } : { notifyQuestion: false } },
    { label: 'exclude rule', patch: { rules: [{ id: 'exclude-deploy', enabled: true, mode: 'exclude' as const, pattern: 'Deploy', isRegex: false, caseSensitive: false }] } },
  ])('keeps $label filtering ahead of in-app routing', ({ patch }) => {
    Object.assign(document, { hidden: false, hasFocus: () => true })
    const fixture = automaticFixture(event)
    fixture.settings.set(patch)
    fixture.advance()
    expect(fixture.reminders()).toHaveLength(0)
    expect(StubNotification.instances).toHaveLength(0)
  })
})

describe('in-app overlay wiring', () => {
  beforeEach(() => {
    Object.assign(document, { hidden: false, hasFocus: () => true })
  })

  it.each(automaticEvents)('opens the originating %s session through late workspace activation and dismisses the toast', event => {
    const fixture = automaticFixture(event, { retainedBy: {} }, 'session-b')
    fixture.advance()
    const openSession = vi.fn()
    fixture.connect('uiWorkspace', { openSession })
    fixture.overlay.activate(fixture.reminders()[0]!.id)
    expect(focus).toHaveBeenCalledTimes(1)
    expect(openSession).toHaveBeenCalledExactlyOnceWith('session-a')
    expect(fixture.reminders()).toHaveLength(0)
    expect(vi.getTimerCount()).toBe(0)
    expect(StubNotification.instances).toHaveLength(0)
  })

  it.each(['absent', 'disconnected', 'removed', 'throws'] as const)('degrades safely when navigation is %s at toast click time', navigation => {
    const fixture = automaticFixture('completion')
    const openSession = vi.fn(() => {
      if (navigation === 'throws') throw new Error('workspace no longer available')
    })
    if (navigation !== 'absent') fixture.connect('uiWorkspace', { openSession })
    fixture.advance()
    const id = fixture.reminders()[0]!.id
    if (navigation === 'disconnected') fixture.disconnect('uiWorkspace')
    if (navigation === 'removed') fixture.setSnapshot({ ids: [], byId: {} })
    expect(() => fixture.overlay.activate(id)).not.toThrow()
    expect(focus).toHaveBeenCalledTimes(1)
    expect(openSession).toHaveBeenCalledTimes(navigation === 'throws' ? 1 : 0)
    expect(fixture.reminders()).toHaveLength(0)
    expect(() => fixture.overlay.activate(id)).not.toThrow()
    expect(focus).toHaveBeenCalledTimes(1)
  })

  it('dismisses without opening or focusing a session', () => {
    const fixture = automaticFixture('completion')
    const openSession = vi.fn()
    fixture.connect('uiWorkspace', { openSession })
    fixture.advance()
    fixture.overlay.dismiss(fixture.reminders()[0]!.id)
    expect(fixture.reminders()).toHaveLength(0)
    expect(focus).not.toHaveBeenCalled()
    expect(openSession).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(automaticEvents)('deduplicates repeated %s state even after dismissing the reminder', event => {
    const fixture = automaticFixture(event)
    fixture.advance()
    const first = fixture.reminders()[0]!.id
    fixture.repeat()
    fixture.repeat()
    expect(fixture.reminders()).toHaveLength(1)
    fixture.overlay.dismiss(first)
    fixture.repeat()
    expect(fixture.reminders()).toHaveLength(0)
    fixture.advance()
    expect(fixture.reminders()).toHaveLength(1)
    expect(fixture.reminders()[0]!.id).not.toBe(first)
    expect(StubNotification.instances).toHaveLength(0)
  })

  it.each(automaticEvents)('passes requireInteraction to %s toast expiry and clears timers on teardown', event => {
    const fixture = automaticFixture(event)
    fixture.advance()
    vi.advanceTimersByTime(8_000)
    expect(fixture.reminders()).toHaveLength(0)
    fixture.settings.set({ requireInteraction: true })
    fixture.advance()
    vi.advanceTimersByTime(60_000)
    expect(fixture.reminders()).toHaveLength(1)
    expect(vi.getTimerCount()).toBe(0)
    fixture.settings.set({ requireInteraction: false })
    fixture.advance()
    expect(vi.getTimerCount()).toBe(1)
    fixture.dispose()
    expect(fixture.reminders()).toHaveLength(0)
    expect(vi.getTimerCount()).toBe(0)
    expect(fixture.listeners).toHaveLength(0)
    expect(fixture.status.listeners.size).toBe(0)
    fixture.advance()
    fixture.reset()
    expect(fixture.reminders()).toHaveLength(0)
    expect(StubNotification.instances).toHaveLength(0)
  })

  it('keeps manual tests on the system channel even for a visible main session and disabled master switch', () => {
    const fixture = automaticFixture('completion', { retainedBy: { mainView: 2 } }, 'session-a')
    fixture.settings.set({ enabled: false })
    expect(fixture.settings.sendTest()).toMatchObject({ ok: true })
    expect(StubNotification.instances).toHaveLength(1)
    expect(StubNotification.instances[0]!.title).toBe('notify.testTitle')
    expect(fixture.reminders()).toHaveLength(0)
  })

  it('does not turn an unavailable manual system test into an in-app reminder', () => {
    vi.stubGlobal('Notification', undefined)
    const fixture = automaticFixture('completion')
    expect(fixture.settings.sendTest()).toMatchObject({ ok: false })
    expect(fixture.reminders()).toHaveLength(0)
  })
})

describe('in-app history and reconnect wiring', () => {
  beforeEach(() => {
    Object.assign(document, { hidden: false, hasFocus: () => true })
  })

  it('seeds completion history, re-seeds on reset, and drops observations for removed sessions', () => {
    const snapshot = (turn: number): WiringSnapshot => ({
      ids: ['session-a'], byId: { 'session-a': { ...completionSummary(turn), retainedBy: {} } },
    })
    const fixture = bootstrap(snapshot(5))
    apply(fixture.ctx)
    const overlay = fixture.slot<InAppNotificationsInjected>('shell.overlay')
    const reminders = () => overlay.hooks.notifications.getSnapshot()
    // No unchanged tick: attachment must seed the already-populated list.
    expect(reminders()).toHaveLength(0)
    fixture.setSnapshot(snapshot(6))
    fixture.tick()
    expect(reminders()).toHaveLength(1)
    overlay.dismiss(reminders()[0]!.id)
    fixture.reset()
    fixture.setSnapshot(snapshot(12))
    fixture.tick()
    fixture.tick()
    expect(reminders()).toHaveLength(0)
    fixture.setSnapshot(snapshot(13))
    fixture.tick()
    expect(reminders()).toHaveLength(1)
    overlay.dismiss(reminders()[0]!.id)
    fixture.setSnapshot({ ids: [], byId: {} })
    fixture.tick()
    fixture.setSnapshot(snapshot(20))
    fixture.tick()
    expect(reminders()).toHaveLength(0)
    fixture.setSnapshot(snapshot(21))
    fixture.tick()
    expect(reminders()).toHaveLength(1)
    expect(StubNotification.instances).toHaveLength(0)
  })

  it.each(['startup', 'reconnect', 'missing', 'rollback'] as const)(
    'does not burst system notifications when historical projections return after %s', scenario => {
      Object.assign(document, { hidden: true })
      const ids = ['old-a', 'old-b', 'old-c']
      const snapshot = (turn: number | undefined): WiringSnapshot => ({
        ids,
        byId: Object.fromEntries(ids.map(id => [id, {
          ...completionSummary(turn ?? 0), id,
          ...(turn === undefined ? { projectionValues: {} } : {}),
        }])),
      })
      const fixture = bootstrap(snapshot(37))
      apply(fixture.ctx)
      if (scenario !== 'startup') fixture.tick()
      if (scenario === 'reconnect') fixture.reset()
      fixture.setSnapshot(snapshot(scenario === 'rollback' ? 12 : undefined))
      fixture.tick()
      const restoredTurn = scenario === 'reconnect' ? 65 : 37
      fixture.setSnapshot(snapshot(restoredTurn))
      fixture.tick()
      fixture.tick()
      expect(StubNotification.instances).toHaveLength(0)
      expect(fixture.slot<InAppNotificationsInjected>('shell.overlay').hooks.notifications.getSnapshot()).toHaveLength(0)

      fixture.setSnapshot(snapshot(restoredTurn + 1))
      fixture.tick()
      fixture.tick()
      expect(StubNotification.instances.map(notification => notification.options.tag))
        .toEqual(ids.map(id => `dsh-notification-${id}-${restoredTurn + 1}`))
    },
  )

  it('seeds existing pending waits on attach/reset/re-add without showing stale history', () => {
    const initial: WiringSnapshot = { ids: ['session-a'], byId: { 'session-a': { ...completionSummary(0), retainedBy: {} } } }
    const fixture = bootstrap(initial)
    const waiting: ReadonlyMap<string, Status> = new Map([['session-a', { pendingInteraction: { kind: 'question' } }]])
    const status = observable<ReadonlyMap<string, Status>>(waiting)
    fixture.connect('uiSession', { sessionStatus: status })
    apply(fixture.ctx)
    const overlay = fixture.slot<InAppNotificationsInjected>('shell.overlay')
    const reminders = () => overlay.hooks.notifications.getSnapshot()
    fixture.tick()
    status.set(new Map(waiting))
    expect(reminders()).toHaveLength(0)
    status.set(new Map())
    status.set(waiting)
    expect(reminders()).toHaveLength(1)
    overlay.dismiss(reminders()[0]!.id)
    fixture.reset()
    status.set(new Map(waiting))
    expect(reminders()).toHaveLength(0)
    fixture.disconnect('uiSession')
    fixture.connect('uiSession', { sessionStatus: status })
    status.set(new Map(waiting))
    expect(reminders()).toHaveLength(0)
    fixture.setSnapshot({ ids: [], byId: {} })
    fixture.tick()
    fixture.setSnapshot(initial)
    fixture.tick()
    status.set(new Map(waiting))
    expect(reminders()).toHaveLength(0)
    status.set(new Map())
    status.set(waiting)
    expect(reminders()).toHaveLength(1)
    expect(StubNotification.instances).toHaveLength(0)
  })
})

describe('pending source wiring', () => {
  const row = { ...completionSummary(0), retainedBy: {} }
  const initial = { ids: ['session-a'], byId: { 'session-a': row } }

  it.each([{ ids: [], byId: {} }, initial])('boots with only sessionStatus and snapshot $ids', snapshot => {
    const fixture = bootstrap(snapshot)
    const status = observable<ReadonlyMap<string, Status>>(new Map())
    fixture.connect('uiSession', { sessionStatus: status })
    expect(() => apply(fixture.ctx)).not.toThrow()
    expect(fixture.register).toHaveBeenCalled()
    expect(status.listeners.size).toBe(1)
    fixture.dispose()
    expect(status.listeners.size).toBe(0)
    expect(fixture.listeners).toHaveLength(0)
  })

  it('subscribes to late activation, seeds existing waits, and deduplicates status-only changes', () => {
    const fixture = bootstrap(initial)
    apply(fixture.ctx)
    const status = observable<ReadonlyMap<string, Status>>(new Map([['session-a', { pendingInteraction: { kind: 'question' } }]]))
    fixture.connect('uiSession', { sessionStatus: status })
    expect(StubNotification.instances).toHaveLength(0)
    status.set(new Map())
    status.set(new Map([['session-a', { pendingInteraction: { kind: 'approval' } }]]))
    status.set(new Map([['session-a', { pendingInteraction: { kind: 'approval' } }]]))
    expect(StubNotification.instances).toHaveLength(1)
    expect(StubNotification.instances[0]!.title).toBe('notify.titleApproval')
    fixture.disconnect('uiSession')
    expect(status.listeners.size).toBe(0)
    fixture.connect('uiSession', { sessionStatus: status })
    expect(StubNotification.instances).toHaveLength(1)
    fixture.dispose()
    expect(status.listeners.size).toBe(0)
  })

  it('re-seeds pending state on connection reset without notifying old waits', () => {
    const fixture = bootstrap(initial)
    const status = observable<ReadonlyMap<string, Status>>(new Map())
    fixture.connect('uiSession', { sessionStatus: status })
    apply(fixture.ctx)
    fixture.reset()
    status.set(new Map([['session-a', { pendingInteraction: { kind: 'question' } }]]))
    expect(StubNotification.instances).toHaveLength(1)
    fixture.reset()
    status.set(new Map([['session-a', { pendingInteraction: { kind: 'question' } }]]))
    expect(StubNotification.instances).toHaveLength(1)
  })

  it('suppresses pending notifications when the window is visible and focused', () => {
    Object.assign(document, { hidden: false, hasFocus: () => true })
    const fixture = bootstrap({ ids: ['session-a'], byId: { 'session-a': { ...row, retainedBy: { mainView: 1 } } } })
    const status = observable<ReadonlyMap<string, Status>>(new Map())
    fixture.connect('uiSession', { sessionStatus: status })
    apply(fixture.ctx)
    status.set(new Map([['session-a', { pendingInteraction: { kind: 'question' } }]]))
    expect(StubNotification.instances).toHaveLength(0)
  })

  it('notifies a still-selected session when the visible shell is unfocused', () => {
    Object.assign(document, { hidden: false, hasFocus: () => false })
    const fixture = bootstrap({ ids: ['session-a'], byId: { 'session-a': { ...row, retainedBy: { mainView: 1 } } } })
    const status = observable<ReadonlyMap<string, Status>>(new Map())
    fixture.connect('uiSession', { sessionStatus: status })
    apply(fixture.ctx)
    status.set(new Map([['session-a', { pendingInteraction: { kind: 'approval' } }]]))
    expect(StubNotification.instances).toHaveLength(1)
  })

  it('subscribes only to the unified session status source', () => {
    const fixture = bootstrap(initial)
    const status = observable<ReadonlyMap<string, Status>>(new Map())
    fixture.connect('uiSession', { sessionStatus: status })
    apply(fixture.ctx)
    expect(status.listeners.size).toBe(1)
    status.set(new Map([['session-a', { pendingInteraction: { kind: 'question' } }]]))
    expect(StubNotification.instances).toHaveLength(1)
  })

  it('does not notify row-level pending state without uiSession', () => {
    const fixture = bootstrap(initial)
    apply(fixture.ctx)
    fixture.setSnapshot({ ids: ['session-a'], byId: { 'session-a': { ...row } } })
    fixture.tick()
    expect(StubNotification.instances).toHaveLength(0)
  })
})

describe('settings contributions', () => {
  it('registers the section page and its navigation icon under one id', () => {
    const fixture = bootstrap()
    apply(fixture.ctx)
    const entries = fixture.register.mock.calls.map(([entry]) => entry as { name?: string; id?: string })
    expect(entries).toContainEqual(expect.objectContaining({ name: 'settings.section', id: 'notification' }))
    expect(entries).toContainEqual(expect.objectContaining({ name: 'settings.section.icon', id: 'notification' }))
  })
})
