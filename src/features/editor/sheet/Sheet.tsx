import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { resolveDesign, type ResolvedDesign } from '../../resume/design/resolve'
import { printableResume } from '../../resume/model/printable'
import type { Resume } from '../../resume/model/types'
import { measureUnits, paginate, type PageBreak } from './pages'
import { ResumeEditor } from './ResumeEditor'
import { ResumePreview } from './ResumePreview'
import { SheetFrame } from './SheetFrame'
import styles from './Sheet.module.css'

const PT_TO_PX = 4 / 3
/** Space between the pages of the preview, in pixels before scaling. */
const PAGE_GAP = 24

interface SheetProps {
  resume: Resume
  editing: boolean
  /** Told how many pages the PDF will have, whenever that changes. */
  onPageCount?: (pages: number) => void
}

/** The resume page, either editable in place or exactly as it will print, page by page. */
export function Sheet({ resume, editing, onPageCount }: SheetProps) {
  const design = useMemo(() => resolveDesign(resume.design), [resume.design])
  // Measuring the pages may trail typing a little; it never holds up a keystroke.
  const measured = useDeferredValue(resume)
  const printable = useMemo(() => printableResume(measured), [measured])
  const measuredDesign = useMemo(() => resolveDesign(measured.design), [measured.design])
  const [breaks, setBreaks] = useState<PageBreak[]>([])

  const onBreaks = useCallback((next: PageBreak[]) => {
    setBreaks((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next))
  }, [])
  useEffect(() => onPageCount?.(breaks.length + 1), [breaks.length, onPageCount])

  return (
    <>
      <PageMeasure resume={printable} design={measuredDesign} onBreaks={onBreaks} />
      {editing ? (
        <SheetFrame design={design} breaks={breaks}>
          <ResumeEditor resume={resume} design={design} />
        </SheetFrame>
      ) : (
        <PagedPreview resume={printable} design={measuredDesign} breaks={breaks} />
      )}
    </>
  )
}

/** A hidden copy of the preview at the paper's real width, measured to find the page breaks. */
function PageMeasure({ resume, design, onBreaks }: { resume: Resume; design: ResolvedDesign; onBreaks: (breaks: PageBreak[]) => void }) {
  const content = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = content.current
    if (!element) return
    let frame = 0
    const measure = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const pageHeight = (design.paper.height - 2 * design.margin) * PT_TO_PX
        // As the PDF does: a heading moves to the next page with less than four lines of room under it.
        const headingRoom = design.sizes.body * 4 * PT_TO_PX
        onBreaks(paginate(measureUnits(element), pageHeight, headingRoom))
      })
    }
    measure()
    // Also catches web fonts arriving, which reflows the text.
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(frame)
    }
  }, [resume, design, onBreaks])

  return (
    <div className={styles.measure} aria-hidden>
      <SheetFrame design={design} exact contentRef={content}>
        <ResumePreview resume={resume} design={design} />
      </SheetFrame>
    </div>
  )
}

/** The preview as the PDF's pages, scaled down to fit narrow screens. */
function PagedPreview({ resume, design, breaks }: { resume: Resume; design: ResolvedDesign; breaks: readonly PageBreak[] }) {
  const wrapper = useRef<HTMLDivElement>(null)
  const [available, setAvailable] = useState<number | null>(null)
  const paperWidth = design.paper.width * PT_TO_PX
  const paperHeight = design.paper.height * PT_TO_PX
  const scale = available === null ? 1 : Math.min(1, available / paperWidth)
  const starts = [0, ...breaks.map((pageBreak) => pageBreak.at)]
  const contentHeight = paperHeight - 2 * design.margin * PT_TO_PX

  useEffect(() => {
    const element = wrapper.current
    if (!element) return
    const observer = new ResizeObserver(() => setAvailable(element.clientWidth))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const height = (starts.length * paperHeight + (starts.length - 1) * PAGE_GAP) * scale
  return (
    <div ref={wrapper} className={styles.pages} style={{ height }}>
      <div className={styles.pageStack} style={{ width: paperWidth, transform: scale < 1 ? `scale(${scale})` : undefined, rowGap: PAGE_GAP }}>
        {starts.map((start, index) => (
          // Each page shows its slice of the same content; screen readers get it once, from the first.
          <div key={index} aria-hidden={index > 0 || undefined}>
            <SheetFrame design={design} page label={starts.length > 1 ? `Resume, page ${index + 1} of ${starts.length}` : 'Resume'}>
              <div className={styles.pageWindow} style={{ height: Math.min(contentHeight, (starts[index + 1] ?? Infinity) - start) }}>
                <div style={{ transform: `translateY(${-start}px)` }}>
                  <ResumePreview resume={resume} design={design} />
                </div>
              </div>
            </SheetFrame>
          </div>
        ))}
      </div>
    </div>
  )
}
