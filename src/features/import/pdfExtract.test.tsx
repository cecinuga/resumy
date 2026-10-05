// @vitest-environment node
import { Document, Page, renderToBuffer, Text, View } from '@react-pdf/renderer'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { beforeAll, describe, expect, it } from 'vitest'
import { extractTextLines } from './pdfExtract'

beforeAll(async () => {
  // In Node, pdf.js runs its worker on the main thread.
  const worker: unknown = await import('pdfjs-dist/legacy/build/pdf.worker.mjs')
  Object.assign(globalThis, { pdfjsWorker: worker })
})

/** A list item whose bullet is a drawn dot, the way browsers print web pages. */
function DotItem({ children }: { children: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6 }}>
      <View style={{ width: 3, height: 3, marginRight: 8, borderRadius: 1.5, backgroundColor: '#222' }} />
      <Text>{children}</Text>
    </View>
  )
}

describe('extractTextLines', () => {
  it('reads bullets drawn as shapes as bullets', async () => {
    const buffer = await renderToBuffer(
      <Document>
        <Page size="A4" style={{ padding: 40, fontSize: 10 }}>
          <Text>WebAgency</Text>
          <DotItem>Built a design system shared by four teams</DotItem>
          <DotItem>Cut load times by 30%</DotItem>
          {/* Two dots on a line are a rating, not a bullet. */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text>Italian</Text>
            <View style={{ width: 3, height: 3, marginLeft: 8, backgroundColor: '#222' }} />
            <View style={{ width: 3, height: 3, marginLeft: 4, backgroundColor: '#222' }} />
          </View>
        </Page>
      </Document>,
    )
    const lines = await extractTextLines(pdfjs, new Uint8Array(buffer))
    expect(lines.map((line) => line.text)).toEqual([
      'WebAgency',
      '• Built a design system shared by four teams',
      '• Cut load times by 30%',
      'Italian',
    ])
  })
})
