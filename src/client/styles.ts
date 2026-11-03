/**
 * The settings-section stylesheet, hand-written as a template string and
 * injected once by the plugin body: the web server serves exactly one file per
 * client plugin, so no separate CSS artifact may exist. Tokens come only from
 * the shared `--dsw-*` design platform (no literal colors); class names
 * carry the `dsh_notification` prefix to stay unique in the assembled shell.
 */

/** Stable `<style>` element id (idempotent injection across HMR re-runs). */
export const STYLE_ID = 'dsh-notification-style'

/** The settings section's injected stylesheet text. */
export const cssText = `
.dsh_notification_section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.dsh_notification_navIcon {
  display: block;
  border-radius: 4px;
}
.dsh_notification_heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.dsh_notification_title {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 18px;
  line-height: 26px;
  font-weight: 600;
}
.dsh_notification_subtitle {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 20px;
}
.dsh_notification_card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 14px 16px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1);
}
.dsh_notification_cardTitle {
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  line-height: 22px;
  font-weight: 600;
}
.dsh_notification_cardDesc {
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 20px;
}
.dsh_notification_grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
  min-width: 0;
}
.dsh_notification_toggleRow {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  cursor: pointer;
}
.dsh_notification_checkbox {
  flex: none;
  width: 16px;
  height: 16px;
  margin: 3px 0 0;
  accent-color: var(--dsw-alias-brand-primary);
  cursor: pointer;
}
.dsh_notification_toggleText {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.dsh_notification_toggleLabel {
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  line-height: 22px;
}
.dsh_notification_toggleDesc {
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 20px;
}
.dsh_notification_permissionRow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}
.dsh_notification_badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 10px;
  border-radius: 11px;
  font-size: 12px;
  line-height: 16px;
}
.dsh_notification_badgeGranted {
  color: var(--dsw-alias-state-success-primary);
  background: var(--dsw-alias-state-success-tertiary);
}
.dsh_notification_badgeDenied {
  color: var(--dsw-alias-state-error-primary);
  background: var(--dsw-alias-interactive-bg-hover-danger);
}
.dsh_notification_badgeDefault {
  color: var(--dsw-alias-state-warn-label);
  background: var(--dsw-alias-state-warn-tertiary);
}
.dsh_notification_button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 14px;
  border-radius: 14px;
  font: inherit;
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
}
.dsh_notification_buttonPrimary {
  border: 0;
  background: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-primary-inverted);
}
.dsh_notification_buttonPrimary:hover {
  background: var(--dsw-alias-button-primary-hover);
}
.dsh_notification_buttonPrimary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.dsh_notification_buttonGhost {
  border: 1px solid var(--dsw-alias-border-l2);
  background: none;
  color: var(--dsw-alias-label-primary);
}
.dsh_notification_buttonGhost:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsh_notification_rules {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.dsh_notification_ruleRow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-2);
}
.dsh_notification_ruleSelect {
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.dsh_notification_ruleInput {
  flex: 1;
  min-width: 160px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
}
.dsh_notification_ruleInput:focus {
  outline: none;
  border-color: var(--dsw-alias-brand-primary);
}
.dsh_notification_ruleCheck {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
}
.dsh_notification_ruleCheck input {
  margin: 0;
  accent-color: var(--dsw-alias-brand-primary);
  cursor: pointer;
}
.dsh_notification_ruleDelete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 14px;
  background: none;
  color: var(--dsw-alias-label-dimmed);
  cursor: pointer;
}
.dsh_notification_ruleDelete:hover {
  background: var(--dsw-alias-interactive-bg-hover-danger);
  color: var(--dsw-alias-state-error-primary);
}
.dsh_notification_ruleDelete svg {
  width: 14px;
  height: 14px;
}
.dsh_notification_error {
  color: var(--dsw-alias-state-error-primary);
  font-size: 12px;
  line-height: 18px;
}
.dsh_notification_hint {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}
.dsh_notification_empty {
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 20px;
}
.dsh_notification_unsavedHint {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}
.dsh_notification_rulesFooter {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}
.dsh_notification_toastStack {
  position: fixed;
  top: 40px;
  left: 50%;
  right: auto;
  bottom: auto;
  z-index: 1100;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: max-content;
  max-width: min(640px, calc(100vw - 48px));
  max-height: calc(100vh - 80px);
  overflow-y: auto;
  pointer-events: none;
}
.dsh_notification_toast {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
  min-width: 0;
  max-width: 100%;
  padding: 12px 16px;
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-toast-bg);
  color: var(--dsw-alias-toast-label);
  font-size: 14px;
  line-height: 22px;
  box-shadow: var(--dsw-shadow-lv3);
  white-space: normal;
  overflow-wrap: anywhere;
  pointer-events: none;
}
.dsh_notification_toastText {
  min-width: 0;
}
.dsh_notification_toastAction {
  display: inline;
  padding: 0;
  border: 0;
  background: none;
  color: var(--dsw-static-deepseek-400);
  font: inherit;
  cursor: pointer;
  margin-inline: 3px;
  pointer-events: auto;
}
.dsh_notification_toastAction:hover {
  opacity: 0.8;
}
.dsh_notification_toastAction:focus-visible {
  outline: 2px solid var(--dsw-static-deepseek-400);
  outline-offset: 2px;
}
`

/**
 * Inject the stylesheet once (stable id; HMR-safe).
 */
export function adoptStyles(): void {
  if (document.getElementById(STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = cssText
  document.head.appendChild(style)
}
