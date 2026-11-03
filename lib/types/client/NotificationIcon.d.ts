/**
 * Settings-navigation icon for the notification section. The packaged SVG is
 * published as a client package asset; the bundle factory's `require.asset`
 * maps the build-time reference to the URL the page loads. Source-level tests
 * run without that require, so the bare reference is the fallback.
 */
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
/**
 * Resolve the icon URL through the bundle's asset hook.
 * @returns the URL the page should load.
 */
export declare function notificationIconUrl(): string;
/**
 * The `settings.section.icon` contribution for the `notification` section.
 * @param props - the shell's square edge and selection state.
 * @returns the packaged icon at the requested size.
 */
export declare function NotificationSectionIcon({ size, active }: PropsRuntime<'settings.section.icon'>): import("react").JSX.Element;
