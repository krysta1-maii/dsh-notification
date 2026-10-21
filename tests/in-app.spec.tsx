// @vitest-environment jsdom
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInAppNotifications, type InAppNotification, type InAppNotificationController } from '../src/client/in-app.ts'
import { InAppNotifications, type InAppNotificationsProps } from '../src/client/InAppNotifications.tsx'
import { cssText } from '../src/client/styles.ts'

const labels: Record<string, string> = {
  'notify.open': 'Open session',
  'notify.dismiss': 'Dismiss',
  'notify.inAppLabel': 'In-app notifications',
}

function item(id = 'one', patch: Partial<InAppNotification> = {}): InAppNotification {
  return { id, title: 'Turn completed', body: 'Here is the result.', sessionTitle: 'My session', target: { sessionId: 'session-' + id }, ...patch }
}

let controllers: InAppNotificationController[]
let root: Root | undefined
let container: HTMLDivElement

function controller(onActivate = vi.fn()): InAppNotificationController {
  const next = createInAppNotifications(onActivate)
  controllers.push(next)
  return next
}

function mount(next: InAppNotificationController, t: InAppNotificationsProps['t'] = key => labels[key] ?? key): void {
  const store = next.notifications
  const useNotifications: InAppNotificationsProps['useNotifications'] = selector => {
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
    return selector(snapshot)
  }
  root = createRoot(container)
  act(() => { root!.render(<InAppNotifications useNotifications={useNotifications} dismiss={next.dismiss} activate={next.activate} t={t} />) })
}

function button(text: string): HTMLButtonElement {
  const result = Array.from(container.querySelectorAll('button')).find(node => node.textContent === text || node.getAttribute('aria-label') === text)
  expect(result).toBeDefined()
  return result!
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  controllers = []
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  act(() => { root?.unmount(); root = undefined })
  for (const next of controllers) next.dispose()
  container.remove()
  vi.restoreAllMocks()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('in-app notification store', () => {
  it('publishes ephemeral snapshots and auto-dismisses at eight seconds', () => {
    const persist = vi.spyOn(Storage.prototype, 'setItem')
    const next = controller()
    const listener = vi.fn()
    const off = next.notifications.subscribe(listener)
    next.show(item(), false)
    expect(next.notifications.getSnapshot()).toEqual([item()])
    expect(listener).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(7_999)
    expect(next.notifications.getSnapshot()).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(next.notifications.getSnapshot()).toEqual([])
    expect(listener).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
    expect(persist).not.toHaveBeenCalled()
    off()
  })

  it('keeps requireInteraction entries until explicit dismissal', () => {
    const next = controller()
    next.show(item(), true)
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(80_000)
    expect(next.notifications.getSnapshot()).toHaveLength(1)
    next.dismiss('one')
    expect(next.notifications.getSnapshot()).toEqual([])
  })

  it('replaces matching tags and starts a fresh expiry deadline', () => {
    const next = controller()
    next.show(item(), false)
    vi.advanceTimersByTime(4_000)
    const replacement = item('one', { body: 'Updated', target: { sessionId: 'updated-session' } })
    next.show(replacement, false)
    expect(next.notifications.getSnapshot()).toEqual([replacement])
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(4_000)
    expect(next.notifications.getSnapshot()).toEqual([replacement])
    vi.advanceTimersByTime(4_000)
    expect(next.notifications.getSnapshot()).toEqual([])
  })

  it('clears a replacement timer when interaction becomes required and restores it when not', () => {
    const next = controller()
    next.show(item(), false)
    next.show(item('one', { title: 'Persistent replacement' }), true)
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(8_000)
    expect(next.notifications.getSnapshot()).toHaveLength(1)
    next.show(item(), false)
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(8_000)
    expect(next.notifications.getSnapshot()).toEqual([])
  })

  it('caps the stack at five, refreshes replacement recency, and clears eviction timers', () => {
    const next = controller()
    for (let id = 1; id <= 5; id++) next.show(item(String(id)), false)
    next.show(item('1', { body: 'Newest replacement' }), false)
    next.show(item('6'), true)
    expect(next.notifications.getSnapshot().map(entry => entry.id)).toEqual(['3', '4', '5', '1', '6'])
    expect(vi.getTimerCount()).toBe(4)
    vi.advanceTimersByTime(8_000)
    expect(next.notifications.getSnapshot()).toEqual([item('6')])
    expect(vi.getTimerCount()).toBe(0)
  })

  it('clears dismissal timers and makes unknown or repeated dismissal a no-op', () => {
    const next = controller()
    next.show(item(), false)
    next.dismiss('one')
    expect(vi.getTimerCount()).toBe(0)
    const snapshot = next.notifications.getSnapshot()
    next.dismiss('one')
    next.dismiss('unknown')
    expect(next.notifications.getSnapshot()).toBe(snapshot)
    next.show(item(), true)
    vi.advanceTimersByTime(8_000)
    expect(next.notifications.getSnapshot()).toHaveLength(1)
  })

  it('activates the current target once, then dismisses and clears its timer', () => {
    const open = vi.fn()
    const next = controller(open)
    next.show(item(), false)
    next.show(item('one', { target: { sessionId: 'replacement-session' } }), false)
    next.activate('one')
    expect(open).toHaveBeenCalledExactlyOnceWith({ sessionId: 'replacement-session' })
    expect(next.notifications.getSnapshot()).toEqual([])
    expect(vi.getTimerCount()).toBe(0)
    next.activate('one')
    next.activate('unknown')
    expect(open).toHaveBeenCalledTimes(1)
  })

  it('contains navigation failures and still dismisses', () => {
    const next = controller(vi.fn(() => { throw new Error('Session was archived') }))
    next.show(item(), false)
    expect(() => { next.activate('one') }).not.toThrow()
    expect(next.notifications.getSnapshot()).toEqual([])
    expect(vi.getTimerCount()).toBe(0)
  })

  it('disposes idempotently, clears all timers and entries, and rejects future show/activate', () => {
    const open = vi.fn()
    const next = controller(open)
    next.show(item('one'), false)
    next.show(item('two'), false)
    next.show(item('three'), true)
    next.dispose()
    next.dispose()
    expect(vi.getTimerCount()).toBe(0)
    expect(next.notifications.getSnapshot()).toEqual([])
    next.show(item('future'), false)
    next.activate('future')
    vi.advanceTimersByTime(80_000)
    expect(next.notifications.getSnapshot()).toEqual([])
    expect(vi.getTimerCount()).toBe(0)
    expect(open).not.toHaveBeenCalled()
  })

  it('leaves no orphan timer when a synchronous subscriber dismisses or disposes', () => {
    const dismissed = controller()
    const offDismiss = dismissed.notifications.subscribe(() => { dismissed.dismiss('one') })
    dismissed.show(item(), false)
    expect(dismissed.notifications.getSnapshot()).toEqual([])
    expect(vi.getTimerCount()).toBe(0)
    offDismiss()
    const disposed = controller()
    const offDispose = disposed.notifications.subscribe(disposed.dispose)
    disposed.show(item(), false)
    expect(disposed.notifications.getSnapshot()).toEqual([])
    expect(vi.getTimerCount()).toBe(0)
    offDispose()
  })
})

describe('InAppNotifications React DOM', () => {
  it('renders an inline title, session, body and actions as escaped text in a polite live region', () => {
    const next = controller()
    mount(next)
    const hostile = item('unsafe', {
      title: '<img src=x onerror=alert(1)>',
      sessionTitle: '<b>Session & title</b>',
      body: '<script>alert("body")</script>\nSecond line & text',
    })
    act(() => { next.show(hostile, true) })
    const status = container.querySelector('[role="status"]')!
    expect(status.getAttribute('aria-live')).toBe('polite')
    expect(status.getAttribute('aria-atomic')).toBe('false')
    expect(status.getAttribute('aria-label')).toBe('In-app notifications')
    expect(container.querySelector('.dsh_notification_toastTitle')!.textContent).toBe(hostile.title)
    expect(container.querySelector('.dsh_notification_toastSession')!.textContent).toBe(hostile.sessionTitle)
    expect(container.querySelector('.dsh_notification_toastBody')!.textContent).toBe(hostile.body)
    const sentence = container.querySelector('.dsh_notification_toastText')!
    expect(sentence.textContent).toBe(hostile.title + ' · ' + hostile.sessionTitle + ': ' + hostile.body + ' Open session Dismiss')
    expect(Array.from(sentence.children).map(node => node.tagName)).toEqual(['SPAN', 'SPAN', 'SPAN', 'BUTTON', 'BUTTON'])
    expect(container.querySelector('article')!.children).toHaveLength(1)
    expect(container.querySelectorAll('p, .dsh_notification_toastHeader, .dsh_notification_toastActions, .dsh_notification_buttonGhost')).toHaveLength(0)
    expect(container.querySelectorAll('img, script, b')).toHaveLength(0)
    expect(container.innerHTML).toContain('&lt;script&gt;')
    expect(button('Open session').type).toBe('button')
    expect(button('Dismiss').type).toBe('button')
    expect(document.body.querySelectorAll('.dsh_notification_toastStack')).toHaveLength(1)
    expect(container.contains(status)).toBe(true)
  })

  it('opens only through the open button and dismisses without opening through close', () => {
    const open = vi.fn()
    const next = controller(open)
    mount(next)
    act(() => { next.show(item(), false) })
    act(() => { container.querySelector('article')!.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    expect(open).not.toHaveBeenCalled()
    expect(next.notifications.getSnapshot()).toHaveLength(1)
    act(() => { button('Dismiss').click() })
    expect(open).not.toHaveBeenCalled()
    expect(container.querySelectorAll('article')).toHaveLength(0)
    expect(vi.getTimerCount()).toBe(0)
    act(() => { next.show(item(), false) })
    act(() => { button('Open session').click() })
    expect(open).toHaveBeenCalledExactlyOnceWith({ sessionId: 'session-one' })
    expect(container.querySelectorAll('article')).toHaveLength(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('scopes inline open and dismiss actions to each notification id', () => {
    const open = vi.fn()
    const next = controller(open)
    mount(next)
    act(() => {
      next.show(item('one'), true)
      next.show(item('two'), true)
    })
    const banners = container.querySelectorAll('article')
    act(() => { banners[1]!.querySelectorAll('button')[1]!.click() })
    expect(next.notifications.getSnapshot().map(entry => entry.id)).toEqual(['one'])
    expect(open).not.toHaveBeenCalled()
    act(() => { banners[0]!.querySelector('button')!.click() })
    expect(open).toHaveBeenCalledExactlyOnceWith({ sessionId: 'session-one' })
    expect(container.querySelectorAll('article')).toHaveLength(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('renders deduplication, five-banner cap, and automatic expiry through the actual store hook', () => {
    const next = controller()
    mount(next)
    act(() => {
      for (let id = 1; id <= 6; id++) next.show(item(String(id), { title: 'Title ' + id }), false)
      next.show(item('6', { title: 'Replacement title' }), false)
    })
    expect(container.querySelectorAll('article')).toHaveLength(5)
    expect(container.textContent).not.toContain('Title 1')
    expect(container.textContent).not.toContain('Title 6')
    expect(container.textContent).toContain('Replacement title')
    act(() => { vi.advanceTimersByTime(8_000) })
    expect(container.querySelectorAll('article')).toHaveLength(0)
    expect(container.querySelector('[role="status"]')).not.toBeNull()
  })

  it('uses localized labels supplied by the locale seat', () => {
    const next = controller()
    const translated: Record<string, string> = { 'notify.open': '打开会话', 'notify.dismiss': '关闭通知', 'notify.inAppLabel': '应用内通知' }
    mount(next, key => translated[key] ?? key)
    act(() => { next.show(item(), true) })
    expect(container.querySelector('[role="status"]')!.getAttribute('aria-label')).toBe('应用内通知')
    expect(button('打开会话')).toBeDefined()
    expect(button('关闭通知')).toBeDefined()
  })

  it('unsubscribes on unmount while timer disposal remains parent-owned', () => {
    const next = controller()
    const off = vi.fn()
    const subscribe = next.notifications.subscribe
    vi.spyOn(next.notifications, 'subscribe').mockImplementation(listener => {
      const unsubscribe = subscribe(listener)
      return () => { off(); unsubscribe() }
    })
    mount(next)
    act(() => { next.show(item(), false) })
    expect(vi.getTimerCount()).toBe(1)
    act(() => { root!.unmount(); root = undefined })
    expect(off).toHaveBeenCalledTimes(1)
    expect(container.textContent).toBe('')
    expect(vi.getTimerCount()).toBe(1)
    next.dispose()
    expect(vi.getTimerCount()).toBe(0)
    expect(next.notifications.getSnapshot()).toEqual([])
    next.show(item('late'), false)
    expect(container.textContent).toBe('')
  })

  it.each(['before', 'after'] as const)('keeps top-native banner styles and click-through when shell CSS loads %s plugin CSS', order => {
    // jsdom has no geometric hit testing; computed declarations prove the
    // native overlay cascade leaves only inline action text interactive.
    const pluginStyle = document.createElement('style')
    pluginStyle.textContent = cssText
    const shellStyle = document.createElement('style')
    shellStyle.textContent = '.overlayLayer { position: absolute; inset: 0; z-index: 20; pointer-events: none; } .overlayLayer > * { pointer-events: auto; }'
    document.head.append(...(order === 'after' ? [pluginStyle, shellStyle] : [shellStyle, pluginStyle]))
    container.className = 'overlayLayer'
    container.setAttribute('data-shell-overlay', '')
    try {
      const next = controller()
      mount(next)
      act(() => { next.show(item(), true) })
      const stack = container.querySelector<HTMLElement>('.dsh_notification_toastStack')!
      const banner = container.querySelector('.dsh_notification_toast')!
      const nativeOverlay = document.createElement('button')
      container.appendChild(nativeOverlay)
      expect(getComputedStyle(nativeOverlay).pointerEvents).toBe('auto')
      expect(stack.parentElement).toBe(container)
      const stackStyle = getComputedStyle(stack)
      expect(stackStyle.position).toBe('fixed')
      expect(stackStyle.top).toBe('40px')
      expect(stackStyle.left).toBe('50%')
      expect(stackStyle.transform).toBe('translateX(-50%)')
      expect(stackStyle.bottom).toBe('auto')
      expect(stackStyle.right).toBe('auto')
      expect(stackStyle.zIndex).toBe('1100')
      expect(stackStyle.width).toBe('max-content')
      expect(stackStyle.maxWidth).toBe('min(640px, calc(100vw - 48px))')
      expect(stackStyle.alignItems).toBe('center')
      expect(stackStyle.pointerEvents).toBe('none')
      expect(stack.style.pointerEvents).toBe('none')
      const bannerStyle = getComputedStyle(banner)
      expect(bannerStyle.display).toBe('flex')
      expect(bannerStyle.padding).toBe('12px 16px')
      expect(bannerStyle.background).toBe('var(--dsw-alias-toast-bg)')
      expect(bannerStyle.color).toBe('var(--dsw-alias-toast-label)')
      expect(bannerStyle.borderRadius).toBe('var(--dsw-radius-lg)')
      expect(bannerStyle.boxShadow).toBe('var(--dsw-shadow-lv3)')
      expect(bannerStyle.borderTopStyle).toBe('none')
      expect(bannerStyle.fontSize).toBe('14px')
      expect(bannerStyle.lineHeight).toBe('22px')
      expect(bannerStyle.maxWidth).toBe('100%')
      expect(bannerStyle.whiteSpace).toBe('normal')
      expect(bannerStyle.overflowWrap).toBe('anywhere')
      expect(bannerStyle.pointerEvents).toBe('none')
      for (const text of banner.querySelectorAll('span')) {
        expect(getComputedStyle(text).display).toBe('inline')
        expect(getComputedStyle(text).pointerEvents).toBe('none')
      }
      for (const action of banner.querySelectorAll('button')) {
        const actionStyle = getComputedStyle(action)
        expect(actionStyle.display).toBe('inline')
        expect(actionStyle.pointerEvents).toBe('auto')
        expect(actionStyle.color).toBe('var(--dsw-static-deepseek-400)')
        expect(actionStyle.padding).toBe('0px')
        expect(actionStyle.borderTopWidth).toBe('0px')
        expect(actionStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)')
        expect(actionStyle.fontSize).toBe('14px')
        expect(actionStyle.lineHeight).toBe('22px')
      }
      act(() => { vi.advanceTimersByTime(80_000) })
      expect(container.querySelectorAll('article')).toHaveLength(1)
      expect(vi.getTimerCount()).toBe(0)
      act(() => { button('Dismiss').click() })
      expect(container.querySelectorAll('article')).toHaveLength(0)
      expect(getComputedStyle(stack).pointerEvents).toBe('none')
      expect(getComputedStyle(nativeOverlay).pointerEvents).toBe('auto')
    } finally {
      pluginStyle.remove()
      shellStyle.remove()
    }
  })

  it('has no bottom-right card surface, block sections, or timed fade CSS', () => {
    const toastCSS = cssText.slice(cssText.indexOf('.dsh_notification_toastStack'))
    expect(toastCSS).not.toMatch(/\b(?:right|bottom):(?!\s*auto\b)[^;]+;/)
    expect(toastCSS).not.toContain('360px')
    expect(toastCSS).not.toMatch(/toastHeader|toastDismiss|toastActions/)
    expect(toastCSS).not.toMatch(/border: 1px|margin-top:|white-space: pre-wrap|animation:/)
    expect(toastCSS).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i)
    expect(toastCSS).not.toContain('var(--dsw-alias-bg-layer-1)')
    expect(toastCSS).not.toContain('var(--dsw-alias-border-l2)')
  })
})
