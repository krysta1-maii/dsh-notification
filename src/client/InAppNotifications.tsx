/** Native-like toast banners contributed through the shell.overlay list/root slot. */
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { SnapshotStore } from './snapshot-store.ts'
import type { InAppNotification } from './in-app.ts'
import type {} from './locales.ts'

/** The slot renderer binds hooks.notifications to the useNotifications selector. */
export interface InAppNotificationsInjected {
  hooks: { notifications: SnapshotStore<readonly InAppNotification[]> }
  dismiss: (id: string) => void
  activate: (id: string) => void
}

export type InAppNotificationsProps = InjectFace<InAppNotificationsInjected> & PropsLocale<'notification'>

/** No portal, global UI framework, or timer ownership in the component. */
export function InAppNotifications({ useNotifications, dismiss, activate, t }: InAppNotificationsProps) {
  const notifications = useNotifications(snapshot => snapshot)
  return (
    <div
      className="dsh_notification_toastStack"
      style={{ pointerEvents: 'none' }}
      role="status"
      aria-live="polite"
      aria-atomic="false"
      aria-label={t('notify.inAppLabel')}
    >
      {notifications.map(item => (
        <article className="dsh_notification_toast" key={item.id}>
          <span className="dsh_notification_toastText">
            <span className="dsh_notification_toastTitle">{item.title}</span>{' · '}
            <span className="dsh_notification_toastSession">{item.sessionTitle}</span>{': '}
            <span className="dsh_notification_toastBody">{item.body}</span>{' '}
            <button
              type="button"
              className="dsh_notification_toastAction"
              onClick={() => { activate(item.id) }}
            >{t('notify.open')}</button>{' '}
            <button
              type="button"
              className="dsh_notification_toastAction"
              aria-label={t('notify.dismiss')}
              title={t('notify.dismiss')}
              onClick={() => { dismiss(item.id) }}
            >{t('notify.dismiss')}</button>
          </span>
        </article>
      ))}
    </div>
  )
}
