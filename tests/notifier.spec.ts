/**
 * Client notification helpers: localized titles, body selection, the
 * layered surface routing, and the per-session grouping tag.
 */
import { describe, expect, it } from 'vitest'
import {
  bodyText,
  createBrowserNotification,
  notificationSurface,
  notificationTag,
  pendingNotificationTag,
  pendingTitleKey,
  titleKey,
} from '../src/client/notifier.ts'

describe('titleKey', () => {
  it('maps every reason to its title key', () => {
    expect(titleKey('completed')).toBe('notify.titleCompleted')
    expect(titleKey('error')).toBe('notify.titleError')
    expect(titleKey('aborted')).toBe('notify.titleAborted')
    expect(titleKey('blocked')).toBe('notify.titleBlocked')
    expect(titleKey('max-tokens')).toBe('notify.titleMaxTokens')
  })
})

describe('bodyText', () => {
  it('trims the reply snippet', () => {
    expect(bodyText('  done  ', 'fallback')).toBe('done')
  })

  it('falls back when the reply is empty', () => {
    expect(bodyText('   ', 'fallback')).toBe('fallback')
  })
})

describe('notificationSurface', () => {
  const permissions = ['granted', 'default', 'denied'] as const
  const windows = [
    { hidden: false, focused: true },
    { hidden: false, focused: false },
    { hidden: true, focused: true },
    { hidden: true, focused: false },
  ]

  it.each(permissions)('uses in-app reminders for a foreground non-main session regardless of permission (%s)', permission => {
    expect(notificationSurface(permission, true, false, true, false)).toBe('in-app')
  })

  it.each(permissions)('suppresses the foreground main session regardless of permission (%s)', permission => {
    expect(notificationSurface(permission, true, false, true, true)).toBe('none')
  })

  it.each(permissions.flatMap(permission => windows.slice(1).flatMap(window =>
    [false, true].map(sessionInView => ({ permission, ...window, sessionInView })),
  )))('uses only the system surface in background ($permission/$hidden/$focused/$sessionInView)', ({ permission, hidden, focused, sessionInView }) => {
    expect(notificationSurface(permission, true, hidden, focused, sessionInView))
      .toBe(permission === 'granted' ? 'system' : 'none')
  })

  it.each(permissions.flatMap(permission => windows.flatMap(window =>
    [false, true].map(sessionInView => ({ permission, ...window, sessionInView })),
  )))('keeps the always-system route when the switch is OFF ($permission/$hidden/$focused/$sessionInView)', ({ permission, hidden, focused, sessionInView }) => {
    expect(notificationSurface(permission, false, hidden, focused, sessionInView))
      .toBe(permission === 'granted' ? 'system' : 'none')
  })
})

describe('notificationTag', () => {
  it('namespaces the tag per session and turn', () => {
    expect(notificationTag('session-1', 3)).toBe('dsh-notification-session-1-3')
  })
})

describe('pendingNotificationTag', () => {
  it('keeps each pending interaction distinct', () => {
    expect(pendingNotificationTag('session-1', 2)).toBe('dsh-notification-pending-session-1-2')
  })
})

describe('pendingTitleKey', () => {
  it('maps each pending kind', () => {
    expect(pendingTitleKey('approval')).toBe('notify.titleApproval')
    expect(pendingTitleKey('question')).toBe('notify.titleQuestion')
    expect(pendingTitleKey('plan-review')).toBe('notify.titlePlanReview')
  })
})

describe('createBrowserNotification', () => {
  it('reports unavailable and ungranted browser surfaces', () => {
    expect(createBrowserNotification(undefined, 'test', {})).toEqual({
      ok: false,
      message: 'The Notification API is unavailable in this browser context.',
    })
    const ungranted = class { static permission = 'default' } as unknown as typeof Notification
    expect(createBrowserNotification(ungranted, 'test', {})).toEqual({
      ok: false,
      message: 'Notification permission is not granted.',
    })
  })

  it('returns the created notification', () => {
    let created: object | undefined
    const api = class {
      static permission = 'granted'
      onclick = null
      onerror = null
      constructor() { created = this }
    } as unknown as typeof Notification
    const result = createBrowserNotification(api, 'test', { body: 'body' })
    expect(result).toEqual({ ok: true, notification: created })
  })

  it('contains constructor failures', () => {
    const api = class {
      static permission = 'granted'
      constructor() { throw new Error('system notifications unavailable') }
    } as unknown as typeof Notification
    expect(createBrowserNotification(api, 'test', {})).toEqual({
      ok: false,
      message: 'system notifications unavailable',
    })
  })
})
