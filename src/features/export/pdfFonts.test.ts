// @vitest-environment node
import { Font } from '@react-pdf/renderer'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { getResumeFont } from '../resume/design/fonts'
import { registerPdfFonts, releasePdfFonts } from './pdfFonts'

beforeAll(() => {
  registerPdfFonts((fileName, packageName) => path.resolve('node_modules/@fontsource', packageName, 'files', fileName))
})

const inter = { fontFamily: getResumeFont('inter').family, fontStyle: 'normal', fontWeight: 400 } as const
const helvetica = { fontFamily: 'Helvetica', fontStyle: 'normal', fontWeight: 400 } as const

describe('releasePdfFonts', () => {
  it('lets go of loaded fonts, which load again for the next PDF', async () => {
    await Font.load(inter)
    expect(Font.getFont(inter).data).not.toBeNull()

    releasePdfFonts()
    expect(Font.getFont(inter).data).toBeNull()

    // Font.reset() would keep the finished load, and the font would never come back.
    await Font.load(inter)
    expect(Font.getFont(inter).data).not.toBeNull()
  })

  it('leaves the built-in fonts of react-pdf alone', async () => {
    await Font.load(helvetica)
    releasePdfFonts()
    expect(Font.getFont(helvetica).data).not.toBeNull()
  })
})
