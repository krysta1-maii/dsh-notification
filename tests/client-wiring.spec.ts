/**
 * Plugin-body wiring for the notification click. The exported inject list must
 * NOT require the workspace navigation service (a pending required service
 * fails the whole web boot), and a completion notification's onclick must focus
 * the window and open the SESSION that produced it through the lazily injected
 * uiWorkspace face — never the currently selected session. The client context is
 * a minimal hand-written fake; document/window/Notification are stubs so the
 * runner body executes under Node.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { apply, inject } from '../src/client/index.ts'

interface WiringSummary {
  readonly id: string
  readonly origin?: string
  readonly title?: string
  readonly projectionValues?: {
    readonly notification?: { readonly turn: number; readonly reason: string; readonly body: string; readonly tools: readonly string[] }
  }
}

interface WiringSnapshot {
  readonly ids: readonly string[]
  readonly byId: Readonly<Record<string, WiringSummary>>
  readonly current: string | undefined
}

/** A notification stub: records instances and lets the test fire onclick. */
class StubNotification {
  static permission = 'granted'
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
    projectionValues: { notification: { turn, reason: 'completed', body: 'deploy done', tools: ['bash'] } },
  }
}

/** Apply the plugin over a minimal fake context; expose the mutable list snapshot. */
function bootstrap(): {
  ctx: ClientContext
  listeners: Array<() => void>
  lazy: Array<(scope: ClientContext) => unknown>
  setSnapshot: (snapshot: WiringSnapshot) => void
} {
  const listeners: Array<() => void> = []
  const lazy: Array<(scope: ClientContext) => unknown> = []
  let snapshot: WiringSnapshot = { ids: [], byId: {}, current: undefined }
  const sessions = {
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
  const ctx = {
    effect: (callback: () => unknown) => {
      const disposer = callback()
      return typeof disposer === 'function' ? disposer : () => {}
    },
    locale: { register: () => () => {}, bind: () => (key: string) => key },
    get: (name: string) => (name === 'sessions' ? sessions : undefined),
    inject: (_deps: string[], callback: (scope: ClientContext) => unknown) => {
      lazy.push(callback)
      return () => {}
    },
    on: () => () => {},
    slots: { inject: (_name: string, factory: () => unknown) => factory(), register: () => ({}) },
  } as unknown as ClientContext
  return { ctx, listeners, lazy, setSnapshot: (next) => { snapshot = next } }
}

/** Apply, advance one completion, and resolve the lazy uiWorkspace inject. */
function completionFixture(): ReturnType<typeof bootstrap> & { openSession: ReturnType<typeof vi.fn> } {
  const fixture = bootstrap()
  apply(fixture.ctx)
  fixture.setSnapshot({ ids: ['session-a'], byId: { 'session-a': completionSummary(0) }, current: 'session-b' })
  for (const listener of fixture.listeners) listener()
  fixture.setSnapshot({ ids: ['session-a'], byId: { 'session-a': completionSummary(1) }, current: 'session-b' })
  for (const listener of fixture.listeners) listener()
  const openSession = vi.fn()
  const scope = { get: (name: string) => (name === 'uiWorkspace' ? { openSession } : undefined) } as unknown as ClientContext
  for (const callback of fixture.lazy) callback(scope)
  return { ...fixture, openSession }
}

const focus = vi.fn()

beforeEach(() => {
  StubNotification.instances = []
  focus.mockReset()
  ;(globalThis as unknown as { Notification: unknown }).Notification = StubNotification
  ;(globalThis as unknown as { window: unknown }).window = { focus }
  ;(globalThis as unknown as { document: unknown }).document = {
    hidden: true,
    getElementById: () => null,
    createElement: () => ({ id: '', textContent: '' }),
    head: { appendChild: () => {} },
  }
})

afterEach(() => {
  delete (globalThis as unknown as { Notification?: unknown }).Notification
  delete (globalThis as unknown as { window?: unknown }).window
  delete (globalThis as unknown as { document?: unknown }).document
})

describe('notification click wiring', () => {
  it('does not require uiWorkspace in the exported inject list', () => {
    expect(inject).not.toContain('uiWorkspace')
  })

  it('focuses the window and opens the originating session, not the current one', () => {
    const { openSession } = completionFixture()
    expect(StubNotification.instances).toHaveLength(1)

    StubNotification.instances[0]!.onclick?.()

    expect(focus).toHaveBeenCalledTimes(1)
    expect(openSession).toHaveBeenCalledTimes(1)
    expect(openSession).toHaveBeenCalledWith('session-a')
    expect(openSession).not.toHaveBeenCalledWith('session-b')
  })

  it('degrades to focus-only when the session left the list before the click', () => {
    const fixture = completionFixture()
    const { openSession } = fixture
    StubNotification.instances[0]!.onclick?.()
    expect(openSession).toHaveBeenCalledTimes(1)

    fixture.setSnapshot({ ids: [], byId: {}, current: undefined })
    expect(() => StubNotification.instances[0]!.onclick?.()).not.toThrow()
    expect(openSession).toHaveBeenCalledTimes(1)
  })
})
