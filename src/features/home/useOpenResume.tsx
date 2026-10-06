import { useLayoutEffect, useRef, useState, type ReactElement } from 'react'
import { navigate } from '../../app/router'
import { Button } from '../../components/Button/Button'
import { Dialog } from '../../components/Dialog/Dialog'
import { track, type AnalyticsEvent } from '../../lib/analytics'
import { announceImport, reviewImport } from '../editor/importReview'
import type { ImportSource } from '../import/importResume'
import { isResumeEmpty } from '../resume/model/inspect'
import type { Resume } from '../resume/model/types'
import { useResumeActions, useResumeState } from '../resume/state/context'

interface Opening {
  resume: Resume
  /** Counted only once the resume is actually opened, not when the person keeps the current one. */
  event: AnalyticsEvent
  /** For an upload: where the content came from, so the editor can point out what to check. */
  source?: ImportSource
}

/**
 * Opens a resume in the editor. When that would replace a draft with real
 * content, it asks first: the draft only exists in this browser.
 */
export function useOpenResume(): {
  open: (resume: Resume, event: AnalyticsEvent, source?: ImportSource) => void
  confirmDialog: ReactElement
} {
  const { resume: current } = useResumeState()
  const { load } = useResumeActions()
  const [pending, setPending] = useState<Opening | null>(null)
  // An upload calls `open` when it finishes, from the render where it began:
  // the draft is read at that moment, not as it was then.
  const currentRef = useRef(current)
  useLayoutEffect(() => {
    currentRef.current = current
  })

  const replace = ({ resume, event, source }: Opening) => {
    track(event)
    announceImport(source ? reviewImport(resume, source) : null)
    load(resume)
    navigate('editor')
  }

  const open = (resume: Resume, event: AnalyticsEvent, source?: ImportSource) => {
    const draft = currentRef.current
    if (draft && !isResumeEmpty(draft)) setPending({ resume, event, source })
    else replace({ resume, event, source })
  }

  const confirmDialog = (
    <Dialog
      open={pending !== null}
      onClose={() => setPending(null)}
      title="Replace your current resume?"
      description="The resume you're working on will be replaced. It's only saved in this browser, so this can't be undone."
      actions={
        <>
          <Button variant="quiet" onClick={() => setPending(null)}>
            Keep current resume
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (pending) replace(pending)
              setPending(null)
            }}
          >
            Replace it
          </Button>
        </>
      }
    />
  )

  return { open, confirmDialog }
}
