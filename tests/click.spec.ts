/**
 * Notification click activation: a listed session opens through the workspace
 * navigation service, and every degraded path (no target, no navigation
 * service, an unlisted session, a throwing list read, a throwing service) stays
 * silent and never throws.
 */
import { describe, expect, it, vi } from 'vitest'
import { activateNotificationTarget } from '../src/client/click.ts'

describe('activateNotificationTarget', () => {
  it('opens a listed session exactly once with its id', () => {
    const openSession = vi.fn()
    activateNotificationTarget({ sessionId: 'session-a' }, { isListed: () => true, openSession })
    expect(openSession).toHaveBeenCalledTimes(1)
    expect(openSession).toHaveBeenCalledWith('session-a')
  })

  it('keeps consecutive targets independent', () => {
    const openSession = vi.fn()
    const deps = { isListed: () => true, openSession }
    activateNotificationTarget({ sessionId: 'session-a' }, deps)
    activateNotificationTarget({ sessionId: 'session-b' }, deps)
    expect(openSession.mock.calls).toEqual([['session-a'], ['session-b']])
  })

  it('does not open an unlisted session and logs the degradation', () => {
    const openSession = vi.fn()
    const log = vi.fn()
    expect(() => {
      activateNotificationTarget({ sessionId: 'gone' }, { isListed: () => false, openSession, log })
    }).not.toThrow()
    expect(openSession).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledTimes(1)
  })

  it('is a no-op without the workspace navigation service', () => {
    const log = vi.fn()
    expect(() => {
      activateNotificationTarget({ sessionId: 'session-a' }, { isListed: () => true, openSession: undefined, log })
    }).not.toThrow()
    expect(log).not.toHaveBeenCalled()
  })

  it('contains a throwing list check without opening or propagating', () => {
    const openSession = vi.fn()
    const log = vi.fn()
    const isListed = (): boolean => { throw new Error('list read failed') }
    expect(() => {
      activateNotificationTarget({ sessionId: 'session-a' }, { isListed, openSession, log })
    }).not.toThrow()
    expect(openSession).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledTimes(1)
    expect(String(log.mock.calls[0]?.[0])).toContain('list read failed')
  })

  it('swallows a navigation failure and logs it', () => {
    const log = vi.fn()
    const openSession = (): void => { throw new Error('selection failed') }
    expect(() => {
      activateNotificationTarget({ sessionId: 'session-a' }, { isListed: () => true, openSession, log })
    }).not.toThrow()
    expect(log).toHaveBeenCalledTimes(1)
    expect(String(log.mock.calls[0]?.[0])).toContain('selection failed')
  })

  it('is a no-op without a target', () => {
    const openSession = vi.fn()
    const log = vi.fn()
    expect(() => {
      activateNotificationTarget(undefined, { isListed: () => true, openSession, log })
    }).not.toThrow()
    expect(openSession).not.toHaveBeenCalled()
    expect(log).not.toHaveBeenCalled()
  })
})
