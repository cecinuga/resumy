import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { fontStack } from '../../resume/design/fonts'
import type { ResolvedDesign } from '../../resume/design/resolve'
import styles from './Sheet.module.css'

const PX_TO_PT = 0.75

/** The design as CSS variables (in points) and data attributes, mirroring the PDF styles. */
function frameStyle({ font, sizes, colors, spacing, margin, lineHeight, paper }: ResolvedDesign): CSSProperties {
  return {
    '--r-font': fontStack(font),
    '--r-body': `${sizes.body}pt`,
    '--r-small': `${sizes.small}pt`,
    '--r-name': `${sizes.name}pt`,
    '--r-headline': `${sizes.headline}pt`,
    '--r-heading': `${sizes.heading}pt`,
    '--r-line-height': lineHeight,
    '--r-text': colors.text,
    '--r-muted': colors.muted,
    '--r-rule': colors.rule,
    '--r-accent': colors.accent,
    '--r-name-color': colors.name,
    '--r-headline-color': colors.headline,
    '--r-heading-color': colors.heading,
    '--r-subtitle-color': colors.subtitle,
    '--r-margin': `${margin}pt`,
    '--r-gap-section': `${spacing.section}pt`,
    '--r-gap-block': `${spacing.block}pt`,
    '--r-gap-item': `${spacing.item}pt`,
    '--r-paper-width': `${paper.width}pt`,
    '--r-paper-height': `${paper.height}pt`,
  } as CSSProperties
}

/**
 * Where pages would end, in points from the top of the sheet. Each PDF page
 * holds its height minus the top and bottom margins. Only meaningful when the
 * sheet is shown at its real width.
 */
function usePageBreaks(content: RefObject<HTMLElement | null>, design: ResolvedDesign): number[] {
  const [breaks, setBreaks] = useState<number[]>([])
  const { margin, paper } = design

  useEffect(() => {
    const element = content.current
    if (!element) return
    const measure = () => {
      const frame = element.parentElement
      const fullWidth = frame !== null && frame.offsetWidth * PX_TO_PT >= paper.width - 1
      const contentBottom = margin + element.offsetHeight * PX_TO_PT
      const perPage = paper.height - 2 * margin
      const next: number[] = []
      for (let top = margin + perPage; fullWidth && top < contentBottom; top += perPage) next.push(top)
      setBreaks((current) => (current.join() === next.join() ? current : next))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    if (element.parentElement) observer.observe(element.parentElement)
    return () => observer.disconnect()
  }, [content, margin, paper.height, paper.width])

  return breaks
}

interface SheetFrameProps {
  design: ResolvedDesign
  children: ReactNode
}

/** The paper: size, margins and template variants of the resume. */
export function SheetFrame({ design, children }: SheetFrameProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const breaks = usePageBreaks(contentRef, design)
  const { template } = design

  return (
    <article
      className={styles.frame}
      aria-label="Resume"
      style={frameStyle(design)}
      data-align={template.header.align}
      data-heading={template.heading.decoration}
      data-heading-case={template.heading.uppercase ? 'upper' : undefined}
      data-subtitle={template.entry.subtitleStyle}
      data-photo={template.photoShape}
    >
      <div ref={contentRef}>{children}</div>
      {breaks.map((top, index) => (
        <div key={top} className={styles.pageBreak} style={{ top: `${top}pt` }} aria-hidden>
          <span>Page {index + 2}</span>
        </div>
      ))}
    </article>
  )
}
