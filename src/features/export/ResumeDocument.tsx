import { Document, Image, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { Fragment } from 'react'
import { resolveDesign, type ResolvedDesign } from '../resume/design/resolve'
import { contactEntries, printableResume } from '../resume/model/printable'
import type { Block, EntryBlock, Resume, TextItem } from '../resume/model/types'
import { extendedFamily } from './pdfFonts'

/**
 * The resume as a PDF. Single column, real text, standard headings and
 * reading order identical to the visual order: what applicant tracking
 * systems parse best. Mirrors the on-screen sheet via the shared design.
 */
export function ResumeDocument({ resume }: { resume: Resume }) {
  const printable = printableResume(resume)
  const design = resolveDesign(resume.design)
  const styles = createStyles(design)
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
    >
      <Page size={resume.design.paper === 'letter' ? 'LETTER' : 'A4'} style={styles.page}>
        <Header resume={printable} design={design} styles={styles} />
        {printable.sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Heading title={section.title} design={design} styles={styles} />
            {section.blocks.map((block) => (
              <PdfBlock key={block.id} block={block} design={design} styles={styles} />
            ))}
          </View>
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
          <Text style={styles.contacts}>
            {contacts.map((contact, index) => (
              <Fragment key={contact.key}>
                {index > 0 && <Text style={styles.separator}>{'  ·  '}</Text>}
                {contact.href ? (
                  <Link src={contact.href} style={styles.link}>
                    {contact.text}
                  </Link>
                ) : (
                  contact.text
                )}
              </Fragment>
            ))}
          </Text>
        )}
      </View>
      {design.template.header.divider && <View style={styles.divider} />}
    </View>
  )
}

function Heading({ title, design, styles }: PartProps & { title: string }) {
  const { decoration } = design.template.heading
  // Keep a heading on the same page as the start of its section.
  return (
    <View style={styles.headingBox} minPresenceAhead={design.sizes.body * 4}>
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
      return <Text style={styles.paragraph}>{block.text}</Text>
    case 'list':
      return <Bullets items={block.items} styles={styles} />
    case 'tags':
      return (
        <Text style={styles.tags}>
          {block.label !== '' && <Text style={styles.tagLabel}>{`${block.label}: `}</Text>}
          {block.items.map((item) => item.text).join(', ')}
        </Text>
      )
  }
}

function Entry({ entry, design, styles }: PartProps & { entry: EntryBlock }) {
  const datesRight = design.template.entry.datePlacement === 'right'
  const meta = [entry.date, entry.location].filter(Boolean).join('  ·  ')
  return (
    <View style={styles.entry}>
      <View wrap={false}>
        {(entry.title !== '' || (datesRight && entry.date !== '')) && (
          <View style={styles.entryRow}>
            <Text style={styles.entryTitle}>{entry.title}</Text>
            {datesRight && entry.date !== '' && <Text style={styles.entryMeta}>{entry.date}</Text>}
          </View>
        )}
        {(entry.subtitle !== '' || (datesRight && entry.location !== '')) && (
          <View style={styles.entryRow}>
            <Text style={styles.entrySubtitle}>{entry.subtitle}</Text>
            {datesRight && entry.location !== '' && <Text style={styles.entryMeta}>{entry.location}</Text>}
          </View>
        )}
        {!datesRight && meta !== '' && <Text style={styles.entryMetaLine}>{meta}</Text>}
      </View>
      {entry.items.length > 0 && <Bullets items={entry.items} styles={styles} />}
    </View>
  )
}

function Bullets({ items, styles }: { items: readonly TextItem[]; styles: Styles }) {
  return (
    <View style={styles.bullets}>
      {items.map((item) => (
        <View key={item.id} style={styles.bullet} wrap={false}>
          <Text style={styles.bulletMark}>•</Text>
          <Text style={styles.bulletText}>{item.text}</Text>
        </View>
      ))}
    </View>
  )
}

function createStyles(design: ResolvedDesign) {
  const { template, sizes, colors, spacing } = design
  const centered = template.header.align === 'center'
  const photoSize = sizes.name * 2.6
  const decoration = template.heading.decoration

  return StyleSheet.create({
    page: {
      paddingVertical: design.margin,
      paddingHorizontal: design.margin,
      fontFamily: [design.font.family, extendedFamily(design.font)],
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
    section: { marginBottom: spacing.section },
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
