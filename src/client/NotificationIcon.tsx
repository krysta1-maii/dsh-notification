/**
 * Settings-navigation icon for the notification section. The packaged SVG is
 * published as a client package asset; the bundle factory's `require.asset`
 * maps the build-time reference to the URL the page loads. Source-level tests
 * run without that require, so the bare reference is the fallback.
 */
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'

/** Build-time package-asset reference: package name plus published asset path. */
const ICON_REFERENCE = 'plugins/dsh-notification/assets/icon.svg'

/** The module-table require handed to the CJS bundle factory. */
declare const require: { asset(reference: string): string } | undefined

/**
 * Resolve the icon URL through the bundle's asset hook.
 * @returns the URL the page should load.
 */
export function notificationIconUrl(): string {
  return typeof require === 'undefined' || typeof require.asset !== 'function'
    ? ICON_REFERENCE
    : require.asset(ICON_REFERENCE)
}

/**
 * The `settings.section.icon` contribution for the `notification` section.
 * @param props - the shell's square edge and selection state.
 * @returns the packaged icon at the requested size.
 */
export function NotificationSectionIcon({ size, active }: PropsRuntime<'settings.section.icon'>) {
  return (
    <img
      className="dsh_notification_navIcon"
      src={notificationIconUrl()}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      data-active={active ? 'true' : 'false'}
    />
  )
}
