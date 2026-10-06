import { Download } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button, type ButtonVariant } from '../../components/Button/Button'
import { Dialog } from '../../components/Dialog/Dialog'
import { useToast } from '../../components/Toast/toast'
import { track } from '../../lib/analytics'
import { saveBlob } from '../../lib/download'
import { getResumeFont } from '../resume/design/fonts'
import { resumeFileName } from '../resume/model/inspect'
import { printableResume, printedText } from '../resume/model/printable'
import type { Resume } from '../resume/model/types'
import { useResume } from '../resume/state/context'
import { findGaps } from './beforeDownload'
import { fontThatPrints, unsupportedCharacters } from './fontCoverage'
import styles from './DownloadButton.module.css'

/** How many of the characters the font can't print are named in the warning. */
const SHOWN_CHARACTERS = 8

interface MissingGlyphs {
  characters: string[]
  fontLabel: string
  /** Another resume font that prints everything, if there is one. */
  alternative?: string
}

/** The characters the PDF couldn't print in the chosen font, or null when it prints them all. */
function findMissingGlyphs(resume: Resume): MissingGlyphs | null {
  const font = getResumeFont(resume.design.font)
  const text = printedText(printableResume(resume))
  const characters = unsupportedCharacters(font, text)
  if (characters.length === 0) return null
  return { characters, fontLabel: font.label, alternative: fontThatPrints(text)?.label }
}

/** Characters that won't print, as one sentence for the check before download. */
function describeMissing(missing: MissingGlyphs): string {
  const shown = missing.characters.slice(0, SHOWN_CHARACTERS).join(' ')
  const more = missing.characters.length > SHOWN_CHARACTERS ? ' and others' : ''
  const fix = missing.alternative ? `${missing.alternative} can print them: choose it under Style.` : 'Remove them, or write them in Latin letters.'
  return `${missing.fontLabel} can't print ${shown}${more}: in the PDF they would come out as unrelated symbols. ${fix}`
}

interface DownloadButtonProps {
  /** Primary in the header; secondary where it repeats it, next to the preview. */
  variant?: Extract<ButtonVariant, 'primary' | 'secondary'>
}

/** Downloads the PDF, after a word on anything that looks forgotten or won't print. */
export function DownloadButton({ variant = 'primary' }: DownloadButtonProps) {
  const resume = useResume()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [findings, setFindings] = useState<string[] | null>(null)
  // Once the person has chosen to download anyway, the same findings don't stop them again.
  const acknowledged = useRef('')

  const download = async () => {
    setBusy(true)
    try {
      const { renderResumePdf } = await import('./renderPdf')
      const fileName = resumeFileName(resume)
      saveBlob(await renderResumePdf(resume), fileName)
      toast({ message: `Downloaded ${fileName}. You'll find it in your downloads.` })
      const { template, font, paper } = resume.design
      track({ name: 'download_resume', params: { template, font, paper } })
    } catch (error) {
      console.error(error)
      toast({ message: "We couldn't create the PDF. Please try again." })
    } finally {
      setBusy(false)
    }
  }

  const requestDownload = () => {
    const missing = findMissingGlyphs(resume)
    const found = [...(missing ? [describeMissing(missing)] : []), ...findGaps(resume)]
    if (found.length > 0 && found.join('\n') !== acknowledged.current) setFindings(found)
    else void download()
  }

  return (
    <>
      <Button variant={variant} icon={Download} loading={busy} onClick={requestDownload} className={variant === 'primary' ? styles.download : undefined}>
        <span className={variant === 'primary' ? styles.label : undefined}>Download PDF</span>
      </Button>
      <Dialog
        open={findings !== null}
        onClose={() => setFindings(null)}
        title="Before you download"
        description={findings && findings.length === 1 ? findings[0] : undefined}
        actions={
          <>
            <Button variant="quiet" onClick={() => setFindings(null)}>
              Go back
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                acknowledged.current = findings?.join('\n') ?? ''
                setFindings(null)
                void download()
              }}
            >
              Download anyway
            </Button>
          </>
        }
      >
        {findings && findings.length > 1 && (
          <ul className={styles.findings}>
            {findings.map((finding) => (
              <li key={finding}>{finding}</li>
            ))}
          </ul>
        )}
      </Dialog>
    </>
  )
}
