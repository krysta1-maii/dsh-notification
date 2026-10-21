/** Ephemeral, plugin-scoped notifications; persistence and navigation belong elsewhere. */
import { type SnapshotStore } from './snapshot-store.ts';
export interface InAppNotification {
    id: string;
    title: string;
    body: string;
    sessionTitle: string;
    target: {
        sessionId: string;
    };
}
export interface InAppNotificationController {
    notifications: SnapshotStore<readonly InAppNotification[]>;
    show(item: InAppNotification, requireInteraction: boolean): void;
    dismiss(id: string): void;
    activate(id: string): void;
    dispose(): void;
}
/** The parent supplies guarded navigation and owns this controller's disposal. */
export declare function createInAppNotifications(onActivate: (target: InAppNotification['target']) => void): InAppNotificationController;
