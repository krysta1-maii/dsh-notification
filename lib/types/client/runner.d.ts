/**
 * The completion runner's pure decision: one session's list facts + the current
 * settings → an optional notification plan. The host `notification` projection
 * supplies the turn reason, reply text, and tool names; the `title` projection
 * is the fallback when the notification projection has not landed yet. Browser
 * reads (permission, visibility) and the Notification construction stay in the
 * plugin body.
 */
import type { NotificationProjectionValue, NotificationReason, NotificationSettings, PendingKind } from '../contract.ts';
/**
 * Fold one session's projection-turn observation: the first available value
 * seeds the baseline without firing. Missing or older projections must not
 * lower that baseline, or restoring history would look like a new completion.
 * Only a later turn advance fires, using that projection's reason and body.
 * @param prevTurn - the highest observed turn (undefined = not yet seeded).
 * @param projection - the current host projection value (absent = not loaded).
 * @returns the next baseline and whether a newer completed turn was observed.
 */
export declare function projectionAdvance(prevTurn: number | undefined, projection: NotificationProjectionValue | undefined): {
    nextTurn: number | undefined;
    fresh: boolean;
};
/** A decided notification ready to surface. */
export interface NotificationPlan {
    readonly reason: NotificationReason;
    readonly body: string;
    readonly tag: string;
}
/**
 * Decide one completed session's notification, free of any browser read.
 * @param sessionId - the completed session.
 * @param origin - the session's durable origin (subagents are skipped).
 * @param title - the session's durable title (absent until the host projects one).
 * @param projection - the host `notification` projection value.
 * @param settings - the live client settings.
 * @returns the plan, or null when this completion must not notify.
 */
export declare function notificationFor(sessionId: string, origin: string | undefined, title: string | undefined, projection: NotificationProjectionValue | undefined, settings: NotificationSettings): NotificationPlan | null;
/** Fold one session's pending-interaction state and detect a fresh wait. */
export declare function pendingAdvance(prev: {
    kind: PendingKind | undefined;
} | undefined, kind: PendingKind | undefined): {
    kind: PendingKind | undefined;
    fresh: boolean;
};
/** A decided pending-interaction notification. */
export interface PendingNotificationPlan {
    readonly kind: PendingKind;
    readonly body: string;
    readonly tag: string;
}
/** Decide one pending interaction without reading browser state. */
export declare function pendingNotificationFor(sessionId: string, origin: string | undefined, title: string | undefined, kind: PendingKind, sequence: number, settings: NotificationSettings): PendingNotificationPlan | null;
