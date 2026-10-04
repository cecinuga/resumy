import type { Block, Resume } from './types'

function blockHasContent(block: Block): boolean {
  switch (block.type) {
    case 'entry':
      return [block.title, block.subtitle, block.date, block.location].some(filled) || block.items.some((i) => filled(i.text))
    case 'text':
      return filled(block.text)
    case 'list':
      return block.items.some((item) => filled(item.text))
    case 'tags':
      return filled(block.label) || block.items.some((item) => filled(item.text))
  }
}

function filled(value: string): boolean {
  return value.trim().length > 0
}

/** True when nothing has been written yet, so replacing it loses nothing. */
export function isResumeEmpty(resume: Resume): boolean {
  const { name, headline, email, phone, location, links, photo } = resume.basics
  const basicsFilled = [name, headline, email, phone, location].some(filled) || links.some((l) => filled(l.text))
  return !basicsFilled && !photo && !resume.sections.some((section) => section.blocks.some(blockHasContent))
}

export function resumeDisplayName(resume: Resume): string {
  return resume.basics.name.trim() || 'Untitled resume'
}

/** Letters that Unicode normalization does not reduce to plain Latin ones. */
const TRANSLITERATIONS: Record<string, string> = {
  ł: 'l', Ł: 'L', đ: 'd', Đ: 'D', ø: 'o', Ø: 'O', ß: 'ss', æ: 'ae', Æ: 'AE', œ: 'oe', Œ: 'OE', þ: 'th', Þ: 'Th', ı: 'i',
}

/** "Jane-Doe-Resume.pdf": the name recruiters expect, safe on every OS and upload form. */
export function resumeFileName(resume: Resume): string {
  const name = resume.basics.name
    .replace(/[łŁđĐøØßæÆœŒþÞı]/g, (letter) => TRANSLITERATIONS[letter] ?? letter)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return name ? `${name}-Resume.pdf` : 'Resume.pdf'
}
