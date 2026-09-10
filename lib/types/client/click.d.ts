/**
 * The notification click decision, split from the plugin body so the degraded
 * paths are unit-testable: a click reveals the session that produced the
 * notification through the workspace navigation service, and every failure —
 * no target, no service, an unlisted session, a throwing list read, or a
 * throwing navigation — stays silent and never propagates. Focusing the window
 * is the caller's job.
 */
/** The session a notification click should reveal. */
export interface NotificationClickTarget {
    readonly sessionId: string;
}
/** The click-time seams: list membership, workspace navigation, and a logger. */
export interface ClickDeps {
    /** Whether the session is still present in the live session list. */
    readonly isListed: (id: string) => boolean;
    /** The workspace navigation service, or undefined when it is unavailable. */
    readonly openSession: ((id: string) => void) | undefined;
    /** Diagnostic sink; the degraded paths stay observable without throwing. */
    readonly log?: (message: string) => void;
}
/**
 * Reveal the notification's originating session, or degrade to a no-op. Never
 * throws: the list check and the navigation both sit inside the guard, so a
 * throwing `isListed` is contained exactly like a throwing `openSession`, and a
 * click handler never surfaces a failure to the browser.
 * @param target - the originating session, absent for focus-only notifications.
 * @param deps - the live list check, the navigation service, and the logger.
 */
export declare function activateNotificationTarget(target: NotificationClickTarget | undefined, deps: ClickDeps): void;
