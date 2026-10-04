import { Download } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/Button/Button'
import { useToast } from '../../components/Toast/toast'
import { track } from '../../lib/analytics'
import { saveBlob } from '../../lib/download'
import { resumeFileName } from '../resume/model/inspect'
import { useResume } from '../resume/state/context'
import styles from './DownloadButton.module.css'

/** The page's primary action: always at the far right of the header. */
export function DownloadButton() {
  const resume = useResume()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const download = async () => {
    setBusy(true)
    try {
      const { renderResumePdf } = await import('./renderPdf')
      saveBlob(await renderResumePdf(resume), resumeFileName(resume))
      const { template, font, paper } = resume.design
      track({ name: 'download_resume', params: { template, font, paper } })
    } catch (error) {
      console.error(error)
      toast({ message: "We couldn't create the PDF. Please try again." })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant="primary" icon={Download} loading={busy} onClick={download} className={styles.download}>
      <span className={styles.label}>Download PDF</span>
    </Button>
  )
}
