import { Document, Image, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { Fragment, type ComponentProps } from 'react'
import { resolveDesign, type ResolvedDesign } from '../resume/design/resolve'
import { guessLanguage } from '../resume/model/language'
import { linkify } from '../resume/model/links'
import { contactEntries, printableResume, printedText } from '../resume/model/printable'
import type { Block, EntryBlock, Resume, TextItem } from '../resume/model/types'
import { pdfFontFamilies } from './fontCoverage'

/**
 * The resume as a PDF. Single column, real text, standard headings and
 * reading order identical to the visual order: what applicant tracking
 * systems parse best. Mirrors the on-screen sheet via the shared design.
 */
export function ResumeDocument({ resume }: { resume: Resume }) {
  const printable = printableResume(resume)
  const design = resolveDesign(resume.design)
  const text = printedText(printable)
  const styles = createStyles(design, pdfFontFamilies(design.font, text))
  const { basics } = printable
  const skills = printable.sections.flatMap((section) =>
    section.blocks.flatMap((block) => (block.type === 'tags' ? block.items.map((item) => item.text) : [])),
  )

  return (
    <Document
      title={basics.name ? `${basics.name} – Resume` : 'Resume'}
      author={basics.name || undefined}
      subject={basics.headline || 'Resume'}
      keywords={skills.slice(0, 40).join(', ') || undefined}
      creator="Resumy"
      producer="Resumy"
      language={guessLanguage(text)}
    >
      <Page size={resume.design.paper === 'letter' ? 'LETTER' : 'A4'} style={styles.page}>
        <Header resume={printable} design={design} styles={styles} />
        {/*
          Headings and blocks sit directly on the page rather than in a View per
          section: react-pdf only moves an element to the next page when
          something precedes it in its container, and a heading always comes
          first in its section. Directly on the page, a heading moves along
          with the start of its section instead of staying behind alone.
        */}
        {printable.sections.map((section, index) => (
          <Fragment key={section.id}>
            <Heading title={section.title} first={section.blocks[0]} spaced={index > 0} design={design} styles={styles} />
            {section.blocks.map((block) => (
              <PdfBlock key={block.id} block={block} design={design} styles={styles} />
            ))}
          </Fragment>
        ))}
      </Page>
    </Document>
  )
}

type Styles = ReturnType<typeof createStyles>

interface PartProps {
  design: ResolvedDesign
  styles: Styles
}

// react-pdf rejects bare strings outside <Text>, so conditions below are
// explicit booleans: `{name && <Text/>}` would render '' for an empty name.

/**
 * Between two runs of text (a link and the bracket after it) or before a
 * double space, react-pdf may break the line and add a hyphen that is not in
 * the text. Its line breaker treats 10000 as an infinite penalty, which rules
 * those breaks out; lines still break at spaces.
 */
const NO_HYPHEN_BREAKS = 10_000

/** Sits between contacts and between date and location; it stays at the end of a line, never starts one. */
const SEPARATOR = '\u00a0\u00a0·\u00a0 '

/** Text that may hold links; see NO_HYPHEN_BREAKS. */
function Prose(props: ComponentProps<typeof Text>) {
  return <Text hyphenationPenalty={NO_HYPHEN_BREAKS} {...props} />
}

/**
 * The text with its web addresses and emails clickable. Links keep the color
 * of the text around them (react-pdf draws them blue and underlined).
 */
function Linked({ text, color }: { text: string; color: string }) {
  return (
    <>
      {linkify(text).map((part, index) =>
        part.href ? (
          <Link key={index} src={part.href} style={{ color, textDecoration: 'none' }}>
            {part.text}
          </Link>
        ) : (
          part.text
        ),
      )}
    </>
  )
}

function Header({ resume, design, styles }: PartProps & { resume: Resume }) {
  const { basics } = resume
  const contacts = contactEntries(basics)
  return (
    <View style={styles.header}>
      {basics.photo !== null && <Image src={basics.photo} style={styles.photo} />}
      <View style={styles.identity}>
        {basics.name !== '' && <Text style={styles.name}>{basics.name}</Text>}
        {basics.headline !== '' && <Text style={styles.headline}>{basics.headline}</Text>}
        {contacts.length > 0 && (
          <Prose style={styles.contacts}>
            {contacts.map((contact, index) => (
              <Fragment key={contact.key}>
                {index > 0 && <Text style={styles.separator}>{SEPARATOR}</Text>}
                {contact.href ? (
                  <Link src={contact.href} style={styles.link}>
                    {contact.text}
                  </Link>
                ) : (
                  contact.text
                )}
              </Fragment>
            ))}
          </Prose>
        )}
      </View>
      {design.template.header.divider && <View style={styles.divider} />}
    </View>
  )
}

/**
 * How much of a section's first block must follow its heading on the same
 * page, in points: an entry's title lines (kept together anyway), or the
 * first two lines of anything else. Never less than four lines.
 */
function startOfSection(block: Block | undefined, design: ResolvedDesign): number {
  const line = design.sizes.body * design.lineHeight
  let lines = 2
  if (block?.type === 'entry') {
    const datesRight = design.template.entry.datePlacement === 'right'
    lines = datesRight
      ? Number(Boolean(block.title || block.date)) + Number(Boolean(block.subtitle || block.location))
      : Number(Boolean(block.title)) + Number(Boolean(block.subtitle)) + Number(Boolean(block.date || block.location))
  }
  return Math.max(design.sizes.body * 4, lines * line + design.spacing.block)
}

interface HeadingProps extends PartProps {
  title: string
  /** The section's first block, which the heading stays with. */
  first: Block | undefined
  /** The space between sections, above every heading but the first (the header has its own). */
  spaced: boolean
}

function Heading({ title, first, spaced, design, styles }: HeadingProps) {
  const { decoration } = design.template.heading
  // A heading moves to the next page along with the start of its section, never alone at the bottom.
  return (
    <View style={spaced ? [styles.headingBox, styles.headingSpaced] : styles.headingBox} minPresenceAhead={startOfSection(first, design)}>
      <Text style={styles.heading}>{title}</Text>
      {decoration === 'underline' && <View style={styles.headingUnderline} />}
    </View>
  )
}

function PdfBlock({ block, design, styles }: PartProps & { block: Block }) {
  switch (block.type) {
    case 'entry':
      return <Entry entry={block} design={design} styles={styles} />
    case 'text':
      return (
        <Prose style={styles.paragraph}>
          <Linked text={block.text} color={design.colors.text} />
        </Prose>
      )
    case 'list':
      return <Bullets items={block.items} design={design} styles={styles} />
    case 'tags':
      return (
        <Prose style={styles.tags}>
          {block.label !== '' && <Text style={styles.tagLabel}>{`${block.label}: `}</Text>}
          <Linked text={block.items.map((item) => item.text).join(', ')} color={design.colors.text} />
        </Prose>
      )
  }
}

function Entry({ entry, design, styles }: PartProps & { entry: EntryBlock }) {
  const { colors } = design
  const datesRight = design.template.entry.datePlacement === 'right'
  const meta = [entry.date, entry.location].filter(Boolean).join(SEPARATOR)
  return (
    <View style={styles.entry}>
      <View wrap={false}>
        {(entry.title !== '' || (datesRight && entry.date !== '')) && (
          <View style={styles.entryRow}>
            <Prose style={styles.entryTitle}>
              <Linked text={entry.title} color={colors.text} />
            </Prose>
            {datesRight && entry.date !== '' && <Text style={styles.entryMeta}>{entry.date}</Text>}
          </View>
        )}
        {(entry.subtitle !== '' || (datesRight && entry.location !== '')) && (
          <View style={styles.entryRow}>
            <Prose style={styles.entrySubtitle}>
              <Linked text={entry.subtitle} color={colors.subtitle} />
            </Prose>
            {datesRight && entry.location !== '' && (
              <Prose style={styles.entryMeta}>
                <Linked text={entry.location} color={colors.muted} />
              </Prose>
            )}
          </View>
        )}
        {!datesRight && meta !== '' && (
          <Prose style={styles.entryMetaLine}>
            <Linked text={meta} color={colors.muted} />
          </Prose>
        )}
      </View>
      {entry.items.length > 0 && <Bullets items={entry.items} design={design} styles={styles} />}
    </View>
  )
}

function Bullets({ items, design, styles }: PartProps & { items: readonly TextItem[] }) {
  return (
    <View style={styles.bullets}>
      {items.map((item) => (
        <View key={item.id} style={styles.bullet} wrap={false}>
          <Text style={styles.bulletMark}>•</Text>
          <Prose style={styles.bulletText}>
            <Linked text={item.text} color={design.colors.text} />
          </Prose>
        </View>
      ))}
    </View>
  )
}

/** `fontFamilies`: the font's Latin family, then one fallback per other script the text uses. */
function createStyles(design: ResolvedDesign, fontFamilies: string[]) {
  const { template, sizes, colors, spacing } = design
  const centered = template.header.align === 'center'
  const photoSize = sizes.name * 2.6
  const decoration = template.heading.decoration

  return StyleSheet.create({
    page: {
      paddingVertical: design.margin,
      paddingHorizontal: design.margin,
      fontFamily: fontFamilies,
      fontSize: sizes.body,
      lineHeight: design.lineHeight,
      color: colors.text,
      // Ligatures can come out as single odd characters in some ATS parsers.
      fontFeatureSettings: { liga: false, clig: false },
    },
    header: {
      flexDirection: centered ? 'column' : 'row',
      flexWrap: 'wrap',
      alignItems: centered ? 'center' : 'flex-start',
      gap: centered ? 8 : 14,
      marginBottom: spacing.section,
    },
    photo: {
      width: photoSize,
      height: photoSize,
      borderRadius: template.photoShape === 'circle' ? photoSize / 2 : 6,
      objectFit: 'cover',
    },
    identity: {
      flexGrow: 1,
      flexShrink: 1,
      alignItems: centered ? 'center' : 'flex-start',
    },
    name: {
      fontSize: sizes.name,
      fontWeight: 700,
      lineHeight: 1.15,
      color: colors.name,
      textAlign: centered ? 'center' : 'left',
    },
    headline: {
      marginTop: 3,
      fontSize: sizes.headline,
      color: colors.headline,
      textAlign: centered ? 'center' : 'left',
    },
    contacts: {
      marginTop: 6,
      fontSize: sizes.small,
      color: colors.muted,
      textAlign: centered ? 'center' : 'left',
    },
    separator: { color: colors.rule },
    link: { color: colors.muted, textDecoration: 'none' },
    divider: {
      width: '100%',
      marginTop: centered ? 4 : 0,
      borderBottomWidth: 0.75,
      borderBottomColor: colors.rule,
    },
    headingSpaced: { marginTop: spacing.section },
    headingBox: {
      marginBottom: spacing.block * 0.8,
      ...(decoration === 'rule' && { borderBottomWidth: 0.75, borderBottomColor: colors.rule, paddingBottom: 2 }),
      ...(decoration === 'bar' && { borderLeftWidth: 3, borderLeftColor: colors.accent, paddingLeft: 6 }),
    },
    heading: {
      fontSize: sizes.heading,
      fontWeight: 700,
      lineHeight: 1.2,
      color: colors.heading,
      textTransform: template.heading.uppercase ? 'uppercase' : 'none',
    },
    headingUnderline: { width: 28, marginTop: 3, borderBottomWidth: 1.5, borderBottomColor: colors.accent },
    paragraph: { marginBottom: spacing.block },
    tags: { marginBottom: spacing.item * 2 },
    tagLabel: { fontWeight: 700 },
    entry: { marginBottom: spacing.block },
    entryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    entryTitle: { flexShrink: 1, fontWeight: 700 },
    entrySubtitle: {
      flexShrink: 1,
      color: colors.subtitle,
      fontStyle: template.entry.subtitleStyle === 'italic' ? 'italic' : 'normal',
    },
    entryMeta: { flexShrink: 0, fontSize: sizes.small, color: colors.muted, textAlign: 'right' },
    entryMetaLine: { fontSize: sizes.small, color: colors.muted },
    bullets: { marginTop: spacing.item * 2 },
    bullet: { flexDirection: 'row', marginBottom: spacing.item },
    bulletMark: { width: 10, color: colors.accent },
    bulletText: { flex: 1 },
  })
}
