import { CircleAlert, FileUp, Upload } from 'lucide-react'
import { useId, useRef, useState, type DragEvent } from 'react'
import { Button } from '../../components/Button/Button'
import { track } from '../../lib/analytics'
import { IMPORT_ERROR_MESSAGES, importResumeFromFile } from '../import/importResume'
import type { Resume } from '../resume/model/types'
import styles from './HomePage.module.css'

type Status = { state: 'idle' } | { state: 'reading'; fileName: string } | { state: 'error'; message: string }

/** Upload an existing PDF, by picking it or dropping it on the card. */
export function UploadCard({ onImported }: { onImported: (resume: Resume) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>({ state: 'idle' })
  const [isDragging, setIsDragging] = useState(false)
  const titleId = useId()
  const reading = status.state === 'reading'

  const readFile = async (file: File) => {
    setStatus({ state: 'reading', fileName: file.name })
    const result = await importResumeFromFile(file)
    track({ name: 'upload_resume', params: { outcome: result.ok ? 'success' : result.reason } })
    if (result.ok) {
      setStatus({ state: 'idle' })
      onImported(result.resume)
    } else {
      setStatus({ state: 'error', message: IMPORT_ERROR_MESSAGES[result.reason] })
    }
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files[0]
    if (file && !reading) void readFile(file)
  }

  return (
    // Dropping a file is a pointer shortcut; the button inside is the accessible way in.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <article
      className={styles.card}
      aria-labelledby={titleId}
      data-dragging={isDragging || undefined}
      onDragEnter={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false)
      }}
      onDrop={onDrop}
    >
      <FileUp className={styles.cardIcon} aria-hidden />
      <h2 id={titleId} className={styles.cardTitle}>
        Upload your resume
      </h2>
      <p className={styles.cardText}>
        We'll read your PDF and lay out its content so you can edit it. The file never leaves your browser.
      </p>
      <div className={styles.cardActions}>
        <Button variant="primary" icon={Upload} loading={reading} onClick={() => inputRef.current?.click()}>
          {reading ? 'Reading your resume…' : 'Choose a PDF'}
        </Button>
        <span className={styles.hint}>or drop it here · PDF only, up to 10 MB</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void readFile(file)
        }}
      />
      {status.state === 'error' && (
        <p className={styles.error} role="alert">
          <CircleAlert aria-hidden />
          {status.message}
        </p>
      )}
    </article>
  )
}
