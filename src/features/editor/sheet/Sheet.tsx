import { useMemo } from 'react'
import { resolveDesign } from '../../resume/design/resolve'
import { printableResume } from '../../resume/model/printable'
import type { Resume } from '../../resume/model/types'
import { ResumeEditor } from './ResumeEditor'
import { ResumePreview } from './ResumePreview'
import { SheetFrame } from './SheetFrame'

/** The resume page, either editable in place or exactly as it will print. */
export function Sheet({ resume, editing }: { resume: Resume; editing: boolean }) {
  const design = useMemo(() => resolveDesign(resume.design), [resume.design])
  const printable = useMemo(() => (editing ? null : printableResume(resume)), [editing, resume])

  return (
    <SheetFrame design={design}>
      {printable ? <ResumePreview resume={printable} design={design} /> : <ResumeEditor resume={resume} design={design} />}
    </SheetFrame>
  )
}
