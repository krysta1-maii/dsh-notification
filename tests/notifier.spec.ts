/**
 * Client notification helpers: localized titles, body selection, the
 * layered surface routing, and the per-session grouping tag.
 */
import { describe, expect, it } from 'vitest'
import {
  bodyText,
  createBrowserNotification,
  NOTIFICATION_TAG_PREFIX,
  notificationSurface,
  notificationTag,
  PENDING_NOTIFICATION_TAG_PREFIX,
  pendingNotificationTag,
  pendingTitleKey,
  TEST_NOTIFICATION_TAG_PREFIX,
  testNotificationTag,
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

  it('matches the frozen portable-shell vector', () => {
    const sessionId = 'session-123e4567-e89b-12d3-a456-426614174000'
    expect(notificationTag(sessionId, 3))
      .toBe('dsh-notification-session-123e4567-e89b-12d3-a456-426614174000-3')
    expect(notificationTag(sessionId, 3)).toHaveLength(63)
    expect(notificationTag(sessionId, 10)).toHaveLength(64)
    expect(notificationTag(sessionId, 100)).toHaveLength(65)
  })
})

describe('pendingNotificationTag', () => {
  it('keeps each pending interaction distinct', () => {
    expect(pendingNotificationTag('session-1', 2)).toBe('dsh-notification-pending-session-1-2')
  })

  it('matches the frozen portable-shell vector and always exceeds 64 characters', () => {
    const sessionId = 'session-123e4567-e89b-12d3-a456-426614174000'
    expect(pendingNotificationTag(sessionId, 2))
      .toBe('dsh-notification-pending-session-123e4567-e89b-12d3-a456-426614174000-2')
    expect(pendingNotificationTag(sessionId, 2)).toHaveLength(71)
    expect(pendingNotificationTag(sessionId, 2).length).toBeGreaterThan(64)
  })
})

describe('tag prefixes', () => {
  it('lets the shell check the longest prefix first', () => {
    expect(PENDING_NOTIFICATION_TAG_PREFIX).toBe('dsh-notification-pending-')
    expect(TEST_NOTIFICATION_TAG_PREFIX).toBe('dsh-notification-test-')
    expect(NOTIFICATION_TAG_PREFIX).toBe('dsh-notification-')
    // Both longer prefixes start with the completion prefix, so completion must
    // be matched last; the two longer prefixes do not shadow each other.
    expect(PENDING_NOTIFICATION_TAG_PREFIX.startsWith(NOTIFICATION_TAG_PREFIX)).toBe(true)
    expect(TEST_NOTIFICATION_TAG_PREFIX.startsWith(NOTIFICATION_TAG_PREFIX)).toBe(true)
    expect(PENDING_NOTIFICATION_TAG_PREFIX.startsWith(TEST_NOTIFICATION_TAG_PREFIX)).toBe(false)
    expect(TEST_NOTIFICATION_TAG_PREFIX.startsWith(PENDING_NOTIFICATION_TAG_PREFIX)).toBe(false)
  })

  it('builds each tag from its named prefix', () => {
    expect(notificationTag('session-a', 1)).toBe(`${NOTIFICATION_TAG_PREFIX}session-a-1`)
    expect(pendingNotificationTag('session-a', 1)).toBe(`${PENDING_NOTIFICATION_TAG_PREFIX}session-a-1`)
    expect(testNotificationTag(123)).toBe(`${TEST_NOTIFICATION_TAG_PREFIX}123`)
  })
})

describe('testNotificationTag', () => {
  it('matches the frozen portable-shell vector', () => {
    expect(testNotificationTag(1760000000000)).toBe('dsh-notification-test-1760000000000')
    expect(testNotificationTag(1760000000000)).toHaveLength(35)
  })

  it('uses the current time by default and stays numeric', () => {
    expect(testNotificationTag()).toMatch(/^dsh-notification-test-\d+$/)
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
