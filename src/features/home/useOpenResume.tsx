import { useState, type ReactElement } from 'react'
import { navigate } from '../../app/router'
import { Button } from '../../components/Button/Button'
import { Dialog } from '../../components/Dialog/Dialog'
import { isResumeEmpty } from '../resume/model/inspect'
import type { Resume } from '../resume/model/types'
import { useResumeActions, useResumeState } from '../resume/state/context'

/**
 * Opens a resume in the editor. When that would replace a draft with real
 * content, it asks first: the draft only exists in this browser.
 */
export function useOpenResume(): { open: (resume: Resume) => void; confirmDialog: ReactElement } {
  const { resume: current } = useResumeState()
  const { load } = useResumeActions()
  const [pending, setPending] = useState<Resume | null>(null)

  const replace = (next: Resume) => {
    load(next)
    navigate('editor')
  }

  const open = (next: Resume) => {
    if (current && !isResumeEmpty(current)) setPending(next)
    else replace(next)
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
