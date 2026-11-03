/**
 * Portable-shell activation: hash parsing and the wait/open/dedupe state
 * machine, exercised with injected browser seams.
 */
import { describe, expect, it, vi } from 'vitest'
import {
  ACTIVATION_TIMEOUT_MS,
  createActivationController,
  parseActivationHash,
  type ActivationListState,
  type ActivationWorkspaceState,
} from '../src/client/deeplink.ts'

function ready(ids: readonly string[] = []): ActivationListState {
  return { phase: 'ready', ids, byId: Object.fromEntries(ids.map(id => [id, {}])) }
}

function notReady(): ActivationListState {
  return { phase: 'pending', ids: [], byId: {} }
}

function workspaceList(
  phase: 'pending' | 'ready',
  archivedSessionIds: readonly string[] = [],
): ActivationWorkspaceState {
  return { phase, archivedSessionIds }
}

interface HarnessOptions {
  readonly list?: ActivationListState
  /** Omit to model a build without the workspaces service. */
  readonly workspaceState?: ActivationWorkspaceState
  readonly openSession?: (id: string) => void
  readonly refresh?: () => Promise<void>
  readonly omitRefresh?: boolean
  readonly clearHashThrows?: boolean
  readonly getWorkspacesThrows?: boolean
}

function harness(options: HarnessOptions = {}) {
  let now = 1_000
  let listState = options.list ?? ready()
  let workspaceState = options.workspaceState
  let hash = ''
  let clearHashCalls = 0
  let timerId = 0
  const logs: string[] = []
  const listListeners = new Set<() => void>()
  const workspaceListeners = new Set<() => void>()
  const timers = new Map<number, { callback: () => void; ms: number }>()
  const openSession = vi.fn(options.openSession)
  const refresh = vi.fn(options.refresh ?? (() => Promise.resolve()))

  const controller = createActivationController({
    readHash: () => hash,
    clearHash: () => {
      clearHashCalls += 1
      if (options.clearHashThrows === true) throw new Error('history is unavailable')
      hash = ''
    },
    subscribeList: listener => {
      listListeners.add(listener)
      return () => { listListeners.delete(listener) }
    },
    getList: () => listState,
    getWorkspaces: options.workspaceState === undefined && options.getWorkspacesThrows !== true
      ? undefined
      : () => {
        if (options.getWorkspacesThrows === true) throw new Error('workspaces are unavailable')
        return workspaceState
      },
    subscribeWorkspaces: options.workspaceState === undefined && options.getWorkspacesThrows !== true
      ? undefined
      : listener => {
        workspaceListeners.add(listener)
        return () => { workspaceListeners.delete(listener) }
      },
    openSession,
    refresh: options.omitRefresh === true ? undefined : refresh,
    now: () => now,
    setTimer: (callback, ms) => {
      const id = ++timerId
      timers.set(id, { callback, ms })
      return id
    },
    clearTimer: handle => { timers.delete(handle as number) },
    log: message => { logs.push(message) },
  })

  return {
    controller,
    openSession,
    refresh,
    logs,
    timers,
    listListeners,
    workspaceListeners,
    clearHashCalls: () => clearHashCalls,
    hash: () => hash,
    setHash: (next: string) => { hash = next },
    setList: (next: ActivationListState) => {
      listState = next
      for (const listener of [...listListeners]) listener()
    },
    setWorkspaces: (next: ActivationWorkspaceState) => {
      workspaceState = next
      for (const listener of [...workspaceListeners]) listener()
    },
    advance: (ms: number) => { now += ms },
    runTimers: () => {
      for (const [id, timer] of [...timers]) {
        timers.delete(id)
        timer.callback()
      }
    },
  }
}

describe('parseActivationHash', () => {
  it('reads the session and nonce with or without the leading hash', () => {
    expect(parseActivationHash('#dsh-session=session-a&n=n-1')).toEqual({ sessionId: 'session-a', nonce: 'n-1' })
    expect(parseActivationHash('dsh-session=session-a&n=n-1')).toEqual({ sessionId: 'session-a', nonce: 'n-1' })
  })

  it('defaults a missing nonce to the empty string', () => {
    expect(parseActivationHash('#dsh-session=session-a')).toEqual({ sessionId: 'session-a', nonce: '' })
  })

  it('ignores extra parameters and decodes percent-encoding', () => {
    expect(parseActivationHash('#v=2&dsh-session=session%2Da&n=n%2D1&other=1'))
      .toEqual({ sessionId: 'session-a', nonce: 'n-1' })
  })

  it('keeps the first of duplicate parameters', () => {
    expect(parseActivationHash('#dsh-session=first&dsh-session=second&n=one&n=two'))
      .toEqual({ sessionId: 'first', nonce: 'one' })
  })

  it('accepts ids with dots, underscores, hyphens, digits, and an agent prefix', () => {
    expect(parseActivationHash('#dsh-session=agent.one-session_42&n=x')?.sessionId)
      .toBe('agent.one-session_42')
  })

  it.each([
    ['empty hash', ''],
    ['only the marker', '#'],
    ['no session parameter', '#n=n-1'],
    ['empty session', '#dsh-session=&n=n-1'],
    ['oversized session', `#dsh-session=${'a'.repeat(201)}&n=n-1`],
    ['newline in the session', '#dsh-session=session%0Aa&n=n-1'],
    ['space in the session', '#dsh-session=session%20a&n=n-1'],
    ['slash in the session', '#dsh-session=session/a&n=n-1'],
  ])('rejects %s', (_label, hash) => {
    expect(parseActivationHash(hash)).toBeUndefined()
  })

  it('accepts the largest legal session id', () => {
    const sessionId = 'a'.repeat(200)
    expect(parseActivationHash(`#dsh-session=${sessionId}`)?.sessionId).toBe(sessionId)
  })
})

describe('createActivationController', () => {
  it('waits for a pending list, then opens and clears the hash', () => {
    const test = harness({ list: notReady() })
    test.setHash('#dsh-session=session-a&n=n-1')
    test.controller.handleHash(test.hash())
    expect(test.openSession).not.toHaveBeenCalled()
    expect(test.timers.size).toBe(1)

    test.setList(ready(['session-a']))
    expect(test.openSession).toHaveBeenCalledExactlyOnceWith('session-a')
    expect(test.clearHashCalls()).toBe(1)
    expect(test.hash()).toBe('')
    expect(test.timers.size).toBe(0)
    expect(test.logs.join('\n')).toContain('activation opened session session-a')
  })

  it('opens immediately when the list is already ready', () => {
    const test = harness({ list: ready(['session-a']) })
    test.controller.handleHash('#dsh-session=session-a&n=n-1')
    expect(test.openSession).toHaveBeenCalledExactlyOnceWith('session-a')
    expect(test.clearHashCalls()).toBe(1)
  })

  it('refreshes once when the id is missing and opens it after it appears', () => {
    const test = harness({ list: ready(['session-b']) })
    test.controller.handleHash('#dsh-session=session-a&n=n-1')
    expect(test.refresh).toHaveBeenCalledTimes(1)
    expect(test.openSession).not.toHaveBeenCalled()

    test.setList(ready(['session-b']))
    expect(test.refresh).toHaveBeenCalledTimes(1)
    expect(test.openSession).not.toHaveBeenCalled()

    test.setList(ready(['session-a', 'session-b']))
    expect(test.openSession).toHaveBeenCalledExactlyOnceWith('session-a')
  })

  it('keeps waiting without a refresh implementation and without throwing', () => {
    const test = harness({ list: ready(), omitRefresh: true })
    expect(() => test.controller.handleHash('#dsh-session=session-a&n=n-1')).not.toThrow()
    test.setList(ready())
    expect(test.openSession).not.toHaveBeenCalled()
    expect(test.refresh).not.toHaveBeenCalled()
  })

  it('clears the hash and gives up at the 20 second deadline', () => {
    const test = harness({ list: notReady() })
    test.controller.handleHash('#dsh-session=session-a&n=n-1')
    expect(ACTIVATION_TIMEOUT_MS).toBe(20_000)
    test.advance(ACTIVATION_TIMEOUT_MS)
    test.runTimers()
    expect(test.openSession).not.toHaveBeenCalled()
    expect(test.clearHashCalls()).toBe(1)
    expect(test.logs.join('\n')).toContain('activation timed out after 20000ms for session session-a')

    test.setList(ready(['session-a']))
    expect(test.openSession).not.toHaveBeenCalled()
  })

  it('expires an overdue target on a later flush even before its timer fires', () => {
    const test = harness({ list: notReady() })
    test.controller.handleHash('#dsh-session=session-a&n=n-1')
    test.advance(ACTIVATION_TIMEOUT_MS)
    test.setList(ready(['session-a']))
    expect(test.openSession).not.toHaveBeenCalled()
    expect(test.clearHashCalls()).toBe(1)
  })

  it('waits for workspaces and skips an archived session', () => {
    const test = harness({ list: ready(['session-a']), workspaceState: workspaceList('pending') })
    test.controller.handleHash('#dsh-session=session-a&n=n-1')
    expect(test.openSession).not.toHaveBeenCalled()

    test.setWorkspaces(workspaceList('ready', ['session-a']))
    expect(test.openSession).not.toHaveBeenCalled()
    expect(test.clearHashCalls()).toBe(1)
    expect(test.logs.join('\n')).toContain('activation skipped archived session session-a')
  })

  it('opens when workspaces are ready and the session is not archived', () => {
    const test = harness({ list: ready(['session-a']), workspaceState: workspaceList('ready', ['session-b']) })
    test.controller.handleHash('#dsh-session=session-a&n=n-1')
    expect(test.openSession).toHaveBeenCalledExactlyOnceWith('session-a')
  })

  it('skips the archived check when the workspaces service is absent', () => {
    const test = harness({ list: ready(['session-a']) })
    test.controller.handleHash('#dsh-session=session-a&n=n-1')
    expect(test.openSession).toHaveBeenCalledExactlyOnceWith('session-a')
    expect(test.clearHashCalls()).toBe(1)
  })

  it('opens even when the workspaces read throws', () => {
    const test = harness({ list: ready(['session-a']), getWorkspacesThrows: true })
    test.controller.handleHash('#dsh-session=session-a&n=n-1')
    expect(test.openSession).toHaveBeenCalledExactlyOnceWith('session-a')
    expect(test.logs.join('\n')).toContain('activation could not read the workspace list')
  })

  it('ignores a repeated nonce', () => {
    const test = harness({ list: notReady() })
    test.controller.handleHash('#dsh-session=session-a&n=n-1')
    test.controller.handleHash('#dsh-session=session-a&n=n-1')
    expect(test.timers.size).toBe(1)
    test.setList(ready(['session-a']))
    expect(test.openSession).toHaveBeenCalledTimes(1)
  })

  it('keeps only the newest of consecutive hashes', () => {
    const test = harness({ list: notReady() })
    test.controller.handleHash('#dsh-session=session-a&n=n-1')
    test.controller.handleHash('#dsh-session=session-b&n=n-2')
    expect(test.timers.size).toBe(1)
    test.setList(ready(['session-a', 'session-b']))
    expect(test.openSession).toHaveBeenCalledExactlyOnceWith('session-b')
    test.runTimers()
    expect(test.openSession).toHaveBeenCalledTimes(1)
  })

  it('does not let a replayed older nonce replace a newer target', () => {
    const test = harness({ list: ready(['session-a']) })
    test.controller.handleHash('#dsh-session=session-a&n=n-1')
    expect(test.openSession).toHaveBeenCalledTimes(1)

    test.setList(notReady())
    test.controller.handleHash('#dsh-session=session-b&n=n-2')
    test.controller.handleHash('#dsh-session=session-a&n=n-1')
    test.setList(ready(['session-a', 'session-b']))
    expect(test.openSession).toHaveBeenCalledTimes(2)
    expect(test.openSession).toHaveBeenLastCalledWith('session-b')
  })

  it('allows the same session under a fresh nonce', () => {
    const test = harness({ list: ready(['session-a']) })
    test.controller.handleHash('#dsh-session=session-a&n=n-1')
    test.controller.handleHash('#dsh-session=session-a&n=n-2')
    expect(test.openSession).toHaveBeenCalledTimes(2)
  })

  it('contains open failures, clears the hash, and keeps the plugin alive', () => {
    const test = harness({
      list: ready(['session-a']),
      openSession: () => { throw new Error('workspace is gone') },
    })
    expect(() => test.controller.handleHash('#dsh-session=session-a&n=n-1')).not.toThrow()
    expect(test.clearHashCalls()).toBe(1)
    expect(test.logs.join('\n')).toContain('activation failed to open session session-a: workspace is gone')
  })

  it('contains hash cleanup failures', () => {
    const test = harness({ list: ready(['session-a']), clearHashThrows: true })
    expect(() => test.controller.handleHash('#dsh-session=session-a&n=n-1')).not.toThrow()
    expect(test.openSession).toHaveBeenCalledOnce()
    expect(test.logs.join('\n')).toContain('activation hash cleanup failed')
  })

  it('contains rejected and synchronously throwing refreshes', async () => {
    const rejecting = harness({
      list: ready(),
      refresh: () => Promise.reject(new Error('offline')),
    })
    rejecting.controller.handleHash('#dsh-session=session-a&n=n-1')
    await Promise.resolve()
    expect(rejecting.logs.join('\n')).toContain('activation refresh failed: offline')

    const throwing = harness({
      list: ready(),
      refresh: (() => { throw new Error('immediate') }) as () => Promise<void>,
    })
    expect(() => throwing.controller.handleHash('#dsh-session=session-a&n=n-1')).not.toThrow()
    expect(throwing.logs.join('\n')).toContain('activation refresh failed: immediate')
  })

  it('reads the current hash when handleHash is called without one', () => {
    const test = harness({ list: ready(['session-a']) })
    test.setHash('#dsh-session=session-a&n=n-1')
    test.controller.handleHash()
    expect(test.openSession).toHaveBeenCalledExactlyOnceWith('session-a')
  })

  it('does nothing for an invalid hash and keeps any pending target', () => {
    const test = harness({ list: notReady() })
    test.controller.handleHash('#dsh-session=session-a&n=n-1')
    test.controller.handleHash('#other=1')
    test.setList(ready(['session-a']))
    expect(test.openSession).toHaveBeenCalledExactlyOnceWith('session-a')
  })

  it('drops the pending target, timers, and subscriptions on dispose', () => {
    const test = harness({ list: notReady() })
    test.controller.handleHash('#dsh-session=session-a&n=n-1')
    expect(test.listListeners.size).toBe(1)
    test.controller.dispose()
    expect(test.timers.size).toBe(0)
    expect(test.listListeners.size).toBe(0)

    test.setList(ready(['session-a']))
    expect(test.openSession).not.toHaveBeenCalled()
    expect(() => test.controller.handleHash('#dsh-session=session-a&n=n-2')).not.toThrow()
    expect(test.openSession).not.toHaveBeenCalled()
  })

  it('treats flush without a pending target as a no-op', () => {
    const test = harness({ list: ready(['session-a']) })
    expect(() => test.controller.flush()).not.toThrow()
    expect(test.openSession).not.toHaveBeenCalled()
  })
})
