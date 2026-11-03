/**
 * Locale coverage: every shipped dictionary carries the zh key set, the package
 * publishes one metadata file per harness language, and placeholders survive
 * translation.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { DICTIONARIES, NS, en, fmt, zh } from '../src/client/locales.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const languages = ['de', 'en', 'es', 'fr', 'ja', 'pt', 'ru', 'zh']

describe('locale dictionaries', () => {
  it('ships one dictionary per harness language', () => {
    expect(Object.keys(DICTIONARIES).sort()).toEqual(languages)
  })

  it('covers the zh key set in every dictionary', () => {
    const keys = Object.keys(zh).sort()
    for (const [language, dictionary] of Object.entries(DICTIONARIES)) {
      expect(Object.keys(dictionary).sort(), language).toEqual(keys)
    }
  })

  it('keeps every value non-empty and every placeholder intact', () => {
    for (const [language, dictionary] of Object.entries(DICTIONARIES)) {
      const entries = Object.entries(dictionary as Record<string, string>)
      for (const [key, value] of entries) expect(value.trim(), `${language}:${key}`).not.toBe('')
      expect(dictionary['settings.permission.testFailed'], language).toContain('{message}')
    }
  })

  it('namespaces the dictionaries', () => {
    expect(NS).toBe('notification')
    expect(fmt(en['notify.open'])).toBe('Open conversation')
  })
})

describe('plugin metadata', () => {
  it('publishes one locale file per language', () => {
    expect(manifest.exports['./locale/*.json']).toBe('./locale/*.json')
    for (const language of languages) {
      const meta = JSON.parse(readFileSync(resolve(root, `locale/${language}.json`), 'utf8'))
      expect(meta.meta.title.trim(), language).not.toBe('')
      expect(meta.meta.description.trim(), language).not.toBe('')
    }
  })
})
