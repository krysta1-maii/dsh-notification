/** The turn-end reasons the client notifies on; anything else is ignored. */
export type NotificationReason = 'completed' | 'error' | 'aborted' | 'blocked' | 'max-tokens';
/** A live user interaction currently blocking a session. */
export type PendingKind = 'approval' | 'question' | 'plan-review';
/**
 * The host projection's wire payload: a bounded summary of the session's last
 * completed turn. The client reads this key off the session list's
 * `projectionValues` when a session's completion reminder arms.
 */
export interface NotificationProjectionValue {
    /** The turn number that last ended (0 before the first completed turn). */
    readonly turn: number;
    /** Why it ended — the raw `TurnEndReason` kind; the client maps the five known kinds. */
    readonly reason: string;
    /** The turn's final assistant reply text, bounded host-side. */
    readonly body: string;
    /** Tool names the turn called, deduplicated in first-seen order. */
    readonly tools: readonly string[];
}
/** Persistable Host fold state for the notification projection. */
export interface NotificationProjectionState {
    /** The open turn's text and tool names; null outside a turn. */
    readonly openTurn: {
        readonly turn: number;
        readonly text: string;
        readonly tools: string[];
    } | null;
    /** The last completed turn's summary; null before the first completion. */
    readonly last: NotificationProjectionValue | null;
}
/** One include/exclude keyword rule over a turn's title, reply text, and tool names. */
export interface NotificationRule {
    /** Stable opaque id minted at creation and unchanged across edits. */
    readonly id: string;
    /** Whether the rule participates; disabled rules are kept but ignored. */
    readonly enabled: boolean;
    /** `include` = only notify when a rule matches; `exclude` = suppress on match. */
    readonly mode: 'include' | 'exclude';
    /** The literal substring or regular expression to match. */
    readonly pattern: string;
    /** When true, `pattern` is a regular expression instead of a literal substring. */
    readonly isRegex: boolean;
    /** When true, matching is case-sensitive. */
    readonly caseSensitive: boolean;
}
/** The client-persisted notification preferences. */
export interface NotificationSettings {
    /** Master switch; false disables every notification. */
    readonly enabled: boolean;
    readonly notifyCompleted: boolean;
    readonly notifyError: boolean;
    readonly notifyAborted: boolean;
    readonly notifyBlocked: boolean;
    readonly notifyMaxTokens: boolean;
    /** Notify when a session waits for the user's approval. */
    readonly notifyApproval: boolean;
    /** Notify when a session waits for an answer to a question. */
    readonly notifyQuestion: boolean;
    /** Notify when a session waits for a plan review. */
    readonly notifyPlanReview: boolean;
    /** Ordered include/exclude filters over the session title, reply text, and tool names. */
    readonly rules: NotificationRule[];
    /**
     * Disable in-app toast expiry (the five-toast cap still applies; open/dismiss
     * removes a toast) and request persistent system notifications (browser/OS
     * support varies).
     */
    readonly requireInteraction: boolean;
    /**
     * Completion and pending reminders share this routing. When true, a hidden
     * or unfocused window uses system notifications for any session, including
     * the main view. A visible, focused window shows clickable, dismissible in-app
     * toasts only for non-main-view conversations; mainView conversations are
     * suppressed. System notifications require granted permission; in-app toasts
     * do not. False uses system notifications in foreground and background,
     * including the current conversation. Manual tests always use the system
     * channel and bypass this routing; the renderer must remain alive.
     */
    readonly backgroundOnly: boolean;
}
/** The projection key this plugin owns. */
declare module '@deepseek-ai/dsh-session-projection/types' {
    interface SessionProjectionMap {
        notification: NotificationProjectionValue;
    }
}
