import { readFileSync, realpathSync, statSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'

const root = realpathSync(fileURLToPath(new URL('..', import.meta.url)))
const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const plugin = JSON.parse(readFileSync(resolve(root, 'dsh.plugin.json'), 'utf8'))

describe('plugin icon metadata', () => {
  it('keeps the package and plugin versions in sync', () => {
    expect(plugin.version).toBe(manifest.version)
  })

  it('declares a package-local icon within the DSH size limit', () => {
    expect(manifest.icon).toBe('assets/icon.svg')
    expect(isAbsolute(manifest.icon)).toBe(false)
    const icon = realpathSync(resolve(root, manifest.icon))
    const local = relative(root, icon)
    expect(isAbsolute(local)).toBe(false)
    expect(local === '..' || local.startsWith('..' + sep)).toBe(false)
    expect(statSync(icon).isFile()).toBe(true)
    expect(statSync(icon).size).toBeLessThanOrEqual(256 * 1024)
  })

  it('ships the icon and its third-party license', () => {
    expect(manifest.files).toContain(dirname(manifest.icon))
    const license = readFileSync(resolve(root, 'assets/LICENSE-tabler.txt'), 'utf8')
    expect(license).toContain('MIT License')
    expect(license).toContain('Copyright (c) 2020-2025 Paweł Kuna')
  })

  it('uses a self-contained SVG with explicit theme-independent colors', () => {
    const svg = readFileSync(resolve(root, manifest.icon), 'utf8')
    const dom = new JSDOM(svg, { contentType: 'image/svg+xml' })
    const document = dom.window.document
    expect(document.querySelector('parsererror')).toBeNull()
    expect(document.documentElement.localName).toBe('svg')
    expect(document.documentElement.namespaceURI).toBe('http://www.w3.org/2000/svg')
    expect(document.documentElement.getAttribute('viewBox')).toBe('0 0 32 32')
    expect(document.querySelectorAll('path')).toHaveLength(4)
    expect(document.querySelector('rect')?.getAttribute('fill')).toBe('#4f6bed')
    expect(document.querySelector('g')?.getAttribute('stroke')).toBe('#fff')
    expect(document.querySelector('script, foreignObject, image, use, style, [href]')).toBeNull()
    expect(svg).not.toContain('currentColor')
    dom.window.close()
  })
})
