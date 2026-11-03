/**
 * `notification` locale namespace: the settings-section copy and the system
 * notification/in-app reminder titles, bodies, and actions. Simplified Chinese
 * is the key-set source of truth; every other dictionary is type-checked
 * against it, and the eight dictionaries match the harness's shipped languages.
 */
import { de } from './locales/de.ts'
import { en } from './locales/en.ts'
import { es } from './locales/es.ts'
import { fr } from './locales/fr.ts'
import { ja } from './locales/ja.ts'
import { pt } from './locales/pt.ts'
import { ru } from './locales/ru.ts'
import { zh, type NotificationKey } from './locales/zh.ts'

export { de, en, es, fr, ja, pt, ru, zh }
export type { NotificationKey }

/** Locale namespace id registered under ctx.locale. */
export const NS = 'notification'

/** Every shipped dictionary, keyed by the harness locale id. */
export const DICTIONARIES = { zh, en, ja, es, fr, de, ru, pt }

/**
 * Fill one dictionary template's `{name}`-style placeholders.
 * @param template - dictionary text.
 * @param params - placeholder values; absent params replace nothing.
 * @returns the filled text.
 */
export function fmt(template: string, params?: Record<string, string>): string {
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => params[key] ?? whole)
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The notification settings copy and titles. */
    [NS]: NotificationKey
  }
}
