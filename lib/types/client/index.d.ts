/**
 * dsh-notification client plugin: the browser half of the completion
 * notification. Persists the notification preferences in a local snapshot
 * store, watches the session list for advances of the host `notification`
 * projection (a freshly completed turn), and routes reminders to the OS in
 * background windows or the shell overlay for other foreground conversations.
 * Also registers the
 * settings section and the locale dictionaries. No harness allowlist is touched.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
/** Required services: the session list, slots, and locale. */
export declare const inject: string[];
/**
 * Compose the notification surface.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
