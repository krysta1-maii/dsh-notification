/** Native-like toast banners contributed through the shell.overlay list/root slot. */
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { SnapshotStore } from './snapshot-store.ts';
import type { InAppNotification } from './in-app.ts';
/** The slot renderer binds hooks.notifications to the useNotifications selector. */
export interface InAppNotificationsInjected {
    hooks: {
        notifications: SnapshotStore<readonly InAppNotification[]>;
    };
    dismiss: (id: string) => void;
    activate: (id: string) => void;
}
export type InAppNotificationsProps = InjectFace<InAppNotificationsInjected> & PropsLocale<'notification'>;
/** No portal, global UI framework, or timer ownership in the component. */
export declare function InAppNotifications({ useNotifications, dismiss, activate, t }: InAppNotificationsProps): import("react").JSX.Element;
