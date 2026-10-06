import { ArrowRight, FilePlus2, HeartHandshake, Plus, ScanText, ShieldCheck } from 'lucide-react'
import { useId, useState } from 'react'
import { navigate } from '../../app/router'
import { Button } from '../../components/Button/Button'
import { formatRelativeTime } from '../../lib/time'
import { createEmptyResume } from '../resume/model/factories'
import { isResumeEmpty, resumeDisplayName } from '../resume/model/inspect'
import { useResumeState } from '../resume/state/context'
import styles from './HomePage.module.css'
import { UploadCard } from './UploadCard'
import { useOpenResume } from './useOpenResume'

const PROMISES = [
  {
    icon: ScanText,
    title: 'Readable by hiring software',
    text: 'Real, selectable text in a clean single-column layout that applicant tracking systems parse correctly.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by design',
    text: 'No accounts, no ads, no cookies. Your resume stays in this browser; we only count visits and downloads.',
  },
  {
    icon: HeartHandshake,
    title: 'Free and open source',
    text: 'Every template and feature is free, for good. Read the code, suggest an idea or host your own copy.',
  },
] as const

export function HomePage() {
  const { resume, savedAt } = useResumeState()
  const { open, confirmDialog } = useOpenResume()
  const newTitleId = useId()
  const hasDraft = resume !== null && !isResumeEmpty(resume)
  // While a PDF is being read, starting another way would race with it.
  const [importing, setImporting] = useState(false)

  const startFromScratch = () => open(createEmptyResume(), { name: 'create_resume' })

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.title}>A calm place to write your resume</h1>
        <p className={styles.lead}>
          Resumy is a free, open-source resume builder. Start from your current resume or a blank page, choose a
          template, and download a PDF that's ready for any job application.
        </p>
      </section>

      {resume && hasDraft && (
        <section className={styles.draft} aria-label="Resume in progress">
          <div>
            <p className={styles.draftName}>{resumeDisplayName(resume)}</p>
            <p className={styles.draftMeta}>
              In progress{savedAt ? ` · saved ${formatRelativeTime(savedAt)}` : ''} · stored only in this browser
            </p>
          </div>
          <Button icon={ArrowRight} disabled={importing} onClick={() => navigate('editor')}>
            Continue editing
          </Button>
        </section>
      )}

      <div className={styles.options}>
        <UploadCard
          onImported={(imported, source) => open(imported, { name: 'upload_resume', params: { outcome: 'success' } }, source)}
          onReadingChange={setImporting}
        />
        <article className={styles.card} aria-labelledby={newTitleId}>
          <FilePlus2 className={styles.cardIcon} aria-hidden />
          <h2 id={newTitleId} className={styles.cardTitle}>
            Start from scratch
          </h2>
          <p className={styles.cardText}>
            Begin with an empty resume and the sections recruiters expect: summary, experience, education and skills.
          </p>
          <div className={styles.cardActions}>
            <Button icon={Plus} disabled={importing} onClick={startFromScratch}>
              New resume
            </Button>
          </div>
        </article>
      </div>

      <section className={styles.promises} aria-label="Why Resumy">
        {PROMISES.map(({ icon: Icon, title, text }) => (
          <div key={title} className={styles.promise}>
            <Icon className={styles.promiseIcon} aria-hidden />
            <h3 className={styles.promiseTitle}>{title}</h3>
            <p className={styles.promiseText}>{text}</p>
          </div>
        ))}
      </section>
      {confirmDialog}
    </div>
  )
}
