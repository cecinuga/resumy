import type { ResolvedDesign } from '../../resume/design/resolve'
import { contactEntries } from '../../resume/model/printable'
import type { Block, EntryBlock, Resume, TextItem } from '../../resume/model/types'
import { fieldIds } from './focus'
import type { BreakRule } from './pages'
import styles from './Sheet.module.css'

/** How a part behaves at a page end, and the editor field that shows it (see pages.ts). */
const breakAs = (rule: BreakRule, field: string) => ({ 'data-break': rule, 'data-for': field })

/**
 * The resume exactly as it will print: no placeholders, no controls.
 * Expects a printable resume (see printableResume).
 */
export function ResumePreview({ resume, design }: { resume: Resume; design: ResolvedDesign }) {
  const { basics, sections } = resume
  const contacts = contactEntries(basics)
  const datesRight = design.template.entry.datePlacement === 'right'

  return (
    <>
      <header className={styles.header} {...breakAs('keep', fieldIds.basics('name'))}>
        {basics.photo && <img className={styles.photo} src={basics.photo} alt="" />}
        <div className={styles.identity}>
          {basics.name && <h2 className={styles.name}>{basics.name}</h2>}
          {basics.headline && <p className={styles.headline}>{basics.headline}</p>}
          {contacts.length > 0 && (
            <p className={styles.contacts}>
              {contacts.map((contact) => (
                <span key={contact.key} className={styles.contact}>
                  {contact.text}
                </span>
              ))}
            </p>
          )}
        </div>
        {design.template.header.divider && <div className={styles.divider} />}
      </header>
      {sections.map((section) => (
        <section key={section.id} className={styles.section}>
          <div className={styles.headingBox} {...breakAs('heading', fieldIds.section(section.id))}>
            <h3 className={styles.heading}>{section.title}</h3>
          </div>
          {section.blocks.map((block) => (
            <PreviewBlock key={block.id} block={block} datesRight={datesRight} />
          ))}
        </section>
      ))}
    </>
  )
}

function PreviewBlock({ block, datesRight }: { block: Block; datesRight: boolean }) {
  switch (block.type) {
    case 'entry':
      return <PreviewEntry entry={block} datesRight={datesRight} />
    case 'text':
      return (
        <p className={styles.paragraph} {...breakAs('lines', fieldIds.block(block.id, 'text'))}>
          {block.text}
        </p>
      )
    case 'list':
      return <Bullets items={block.items} />
    case 'tags':
      return (
        <p className={styles.tags} {...breakAs('lines', fieldIds.block(block.id, 'label'))}>
          {block.label && <span className={styles.tagLabel}>{block.label}: </span>}
          {block.items.map((item) => item.text).join(', ')}
        </p>
      )
  }
}

function PreviewEntry({ entry, datesRight }: { entry: EntryBlock; datesRight: boolean }) {
  const meta = [entry.date, entry.location].filter(Boolean).join('  ·  ')
  const hasHead = Boolean(entry.title || entry.subtitle || meta)
  return (
    <div className={styles.entry}>
      {/* The PDF keeps these lines together on one page. */}
      {hasHead && (
        <div {...breakAs('keep', fieldIds.block(entry.id, 'title'))}>
          {(entry.title || (datesRight && entry.date)) && (
            <div className={styles.entryRow}>
              <span className={styles.entryTitle}>{entry.title}</span>
              {datesRight && entry.date && <span className={styles.entryMeta}>{entry.date}</span>}
            </div>
          )}
          {(entry.subtitle || (datesRight && entry.location)) && (
            <div className={styles.entryRow}>
              <span className={styles.entrySubtitle}>{entry.subtitle}</span>
              {datesRight && entry.location && <span className={styles.entryMeta}>{entry.location}</span>}
            </div>
          )}
          {!datesRight && meta && <div className={styles.entryMetaLine}>{meta}</div>}
        </div>
      )}
      {entry.items.length > 0 && <Bullets items={entry.items} />}
    </div>
  )
}

function Bullets({ items }: { items: readonly TextItem[] }) {
  return (
    <ul className={styles.bullets}>
      {items.map((item) => (
        <li key={item.id} className={styles.bullet} {...breakAs('keep', fieldIds.item(item.id))}>
          <span className={styles.bulletText}>{item.text}</span>
        </li>
      ))}
    </ul>
  )
}
