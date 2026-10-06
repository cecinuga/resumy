import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { fontStack } from '../../resume/design/fonts'
import type { ResolvedDesign } from '../../resume/design/resolve'
import type { PageBreak } from './pages'
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
 * Where each page break falls on the editable sheet, in pixels: just above
 * the field the next page starts with. Only while the sheet is shown at the
 * width of the paper, so lines wrap as in the PDF.
 */
function useBreakLines(content: RefObject<HTMLElement | null>, breaks: readonly PageBreak[], paperWidth: number): number[] {
  const [lines, setLines] = useState<number[]>([])

  useLayoutEffect(() => {
    const element = content.current
    if (!element) return
    const place = () => {
      const fullWidth = (element.parentElement?.offsetWidth ?? 0) * PX_TO_PT >= paperWidth - 1
      const origin = element.getBoundingClientRect().top
      const next: number[] = []
      for (const { field, offset } of fullWidth ? breaks : []) {
        const target = field && element.querySelector(`[data-field="${CSS.escape(field)}"]`)
        if (target) next.push(Math.round(target.getBoundingClientRect().top - origin + offset))
      }
      setLines((current) => (current.join() === next.join() ? current : next))
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(element)
    return () => observer.disconnect()
  })

  return lines
}

interface SheetFrameProps {
  design: ResolvedDesign
  children: ReactNode
  /** Page breaks to mark on the sheet while editing (see pages.ts). */
  breaks?: readonly PageBreak[]
  /**
   * The exact page, as printed: real paper width at every screen size,
   * for the preview and for measuring it.
   */
  exact?: boolean
  /** One page of the preview, cut to the paper's height. */
  page?: boolean
  contentRef?: RefObject<HTMLDivElement>
  label?: string
}

/** The paper: size, margins and template variants of the resume. */
export function SheetFrame({ design, children, breaks = [], exact, page, contentRef, label = 'Resume' }: SheetFrameProps) {
  const ownRef = useRef<HTMLDivElement>(null)
  const content = contentRef ?? ownRef
  const lines = useBreakLines(content, breaks, design.paper.width)
  const { template } = design

  return (
    <article
      className={styles.frame}
      aria-label={label}
      style={frameStyle(design)}
      data-exact={exact || page || undefined}
      data-page={page || undefined}
      data-align={template.header.align}
      data-heading={template.heading.decoration}
      data-heading-case={template.heading.uppercase ? 'upper' : undefined}
      data-subtitle={template.entry.subtitleStyle}
      data-photo={template.photoShape}
    >
      <div ref={content}>{children}</div>
      {lines.map((top, index) => (
        <div key={top} className={styles.pageBreak} style={{ top: `calc(var(--r-margin) + ${top}px - 4px)` }} aria-hidden>
          <span>Page {index + 2}</span>
        </div>
      ))}
    </article>
  )
}
