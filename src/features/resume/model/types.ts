/**
 * The resume document. Every renderer (editable sheet, PDF) and every
 * producer (blank template, PDF import) speaks this shape.
 */

export type Id = string

/** A single line of content: a bullet point or a tag. */
export interface TextItem {
  id: Id
  text: string
}

/** A dated position: a job, a degree, a project... */
export interface EntryBlock {
  id: Id
  type: 'entry'
  title: string
  subtitle: string
  date: string
  location: string
  items: TextItem[]
}

/** A free paragraph. */
export interface TextBlock {
  id: Id
  type: 'text'
  text: string
}

/** A dotted list. */
export interface ListBlock {
  id: Id
  type: 'list'
  items: TextItem[]
}

/** A short inline list, optionally labelled ("Languages: Go, Rust"). */
export interface TagsBlock {
  id: Id
  type: 'tags'
  label: string
  items: TextItem[]
}

export type Block = EntryBlock | TextBlock | ListBlock | TagsBlock
export type BlockType = Block['type']

/** Blocks that hold a list of items. */
export type ItemBlock = Extract<Block, { items: TextItem[] }>

/** Editable single-value fields across block types. */
export type BlockTextField = 'title' | 'subtitle' | 'date' | 'location' | 'text' | 'label'

export interface Section {
  id: Id
  title: string
  hidden: boolean
  blocks: Block[]
}

export interface Basics {
  name: string
  headline: string
  email: string
  phone: string
  location: string
  /** Websites and profiles, shown as plain text so ATS software can read them. */
  links: TextItem[]
  /** A JPEG data URL, already downscaled. */
  photo: string | null
}

export type BasicsTextField = 'name' | 'headline' | 'email' | 'phone' | 'location'

export type TemplateId = 'classic' | 'professional' | 'modern' | 'compact' | 'elegant'
export type FontId = 'source-sans' | 'inter' | 'nunito-sans' | 'source-serif' | 'eb-garamond'
export type TextSize = 'small' | 'medium' | 'large'
export type PaperSize = 'a4' | 'letter'

export interface Design {
  template: TemplateId
  font: FontId
  /** Hex color used for headings and rules. */
  accent: string
  textSize: TextSize
  paper: PaperSize
}

export interface Resume {
  version: 1
  basics: Basics
  sections: Section[]
  design: Design
}

export function hasItems(block: Block): block is ItemBlock {
  return block.type !== 'text'
}

/** Items of the same kind can be dragged between blocks. */
export type ItemKind = 'bullet' | 'tag'

export function itemKind(block: ItemBlock): ItemKind {
  return block.type === 'tags' ? 'tag' : 'bullet'
}
