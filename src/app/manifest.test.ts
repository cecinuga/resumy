// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

interface ManifestImage {
  src: string
  sizes: string
  type: string
  purpose?: string
  form_factor?: 'wide' | 'narrow'
}

const publicDir = new URL('../../public/', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('manifest.json', publicDir), 'utf8')) as {
  name: string
  short_name: string
  start_url: string
  display: string
  icons: ManifestImage[]
  screenshots: ManifestImage[]
}

const publicFile = (src: string) => new URL(src.replace(/^\//, ''), publicDir)

/** Width and height from a PNG's IHDR chunk. */
function pngSize(src: string): string {
  const data = readFileSync(publicFile(src))
  return `${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`
}

const dimensions = (sizes: string) => sizes.split('x').map(Number) as [number, number]

describe('web app manifest', () => {
  it('is linked from the page', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
    expect(html).toContain('<link rel="manifest" href="/manifest.json" />')
  })

  it('meets the install requirements of browsers', () => {
    expect(manifest.name).toBeTruthy()
    expect(manifest.short_name).toBeTruthy()
    expect(manifest.start_url).toBe('/')
    expect(manifest.display).toBe('standalone')
    const pngIcons = manifest.icons.filter((icon) => icon.type === 'image/png')
    const anyIcons = pngIcons.filter((icon) => (icon.purpose ?? 'any') === 'any').map((icon) => icon.sizes)
    expect(anyIcons).toEqual(expect.arrayContaining(['192x192', '512x512']))
    expect(pngIcons.some((icon) => icon.purpose === 'maskable')).toBe(true)
  })

  it.each([...manifest.icons, ...manifest.screenshots].map((image) => [image.src, image] as const))(
    '%s exists with the declared size',
    (src, image) => {
      expect(existsSync(publicFile(src))).toBe(true)
      if (image.type === 'image/png') expect(pngSize(src)).toBe(image.sizes)
    },
  )

  // The rules for the richer install dialog in Chromium browsers.
  it.each(['wide', 'narrow'] as const)('has %s screenshots the install dialog can show', (formFactor) => {
    const screenshots = manifest.screenshots.filter((screenshot) => screenshot.form_factor === formFactor)
    expect(screenshots.length).toBeGreaterThan(0)
    expect(new Set(screenshots.map((screenshot) => screenshot.sizes)).size).toBe(1)
    for (const screenshot of screenshots) {
      const [width, height] = dimensions(screenshot.sizes)
      expect(Math.min(width, height)).toBeGreaterThanOrEqual(320)
      expect(Math.max(width, height)).toBeLessThanOrEqual(3840)
      expect(Math.max(width, height) / Math.min(width, height)).toBeLessThanOrEqual(2.3)
      expect(formFactor === 'wide' ? width > height : height > width).toBe(true)
    }
  })
})
