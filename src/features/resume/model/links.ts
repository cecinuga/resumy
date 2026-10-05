/**
 * Web addresses and emails in resume text. A field meant for a link (the
 * header's websites) accepts any domain; free text only links what can't be
 * mistaken for something else, so "Node.js", "ASP.NET" or "e.g." stay text.
 */

/** A piece of text and, for a web address or an email, the link it opens. */
export interface TextPart {
  text: string
  href?: string
}

/** "linkedin.com/in/jane" -> "https://linkedin.com/in/jane"; anything odd gets no link. */
export function toHref(text: string): string | undefined {
  const value = text.trim()
  if (/^https?:\/\//i.test(value)) return value
  return /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(value) ? `https://${value}` : undefined
}

/**
 * Domain endings that make a bare "name.tld" a link in free text. Endings
 * that are also file extensions or common words (.md, .py, .sh, .rs, .pl,
 * .js, .so, .is, .no) are left out: those need "https://" or "www.".
 */
const BARE_DOMAIN_ENDINGS = new Set(
  (
    'com org net edu gov io dev app ai co me info biz xyz tech page site online blog cloud design studio art ' +
    'email digital agency network website works space live store shop pro codes software engineering systems ' +
    'solutions consulting eu it uk de fr es ch nl be at se dk fi ie pt cz gr hu ro ua us ca au nz in jp kr sg hk ' +
    'br mx ar cl za il tr tv ly gg fm'
  ).split(' '),
)

const LINK = new RegExp(
  [
    // Not inside a longer word, address or path.
    String.raw`(?<![\w@./+-])(?:`,
    String.raw`(?<email>[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[A-Za-z]{2,}(?![\w-]))`,
    String.raw`|(?<url>(?:https?:\/\/|www\.)[^\s<>"]+)`,
    // The ending is lowercase, so "ASP.NET" is not a domain.
    String.raw`|(?<domain>(?:[\w-]+\.)+(?<ending>[a-z]{2,})(?![\w-])(?:[/?#][^\s<>"]*)?)`,
    ')',
  ].join(''),
  'g',
)

/** Drops sentence punctuation and unmatched closing brackets after an address: "(see x.com/a)." -> "x.com/a". */
function trimTrailing(address: string): string {
  let end = address.length
  while (end > 0) {
    const last = address[end - 1]!
    const body = address.slice(0, end)
    const unmatched =
      (last === ')' && body.split(')').length > body.split('(').length) ||
      (last === ']' && body.split(']').length > body.split('[').length)
    if (!/[.,;:!?'"]/.test(last) && !unmatched) break
    end -= 1
  }
  return address.slice(0, end)
}

/** Splits text into plain parts and links, for its web addresses and emails. */
export function linkify(text: string): TextPart[] {
  const parts: TextPart[] = []
  let plainStart = 0
  for (const match of text.matchAll(LINK)) {
    const { email, url, domain, ending } = match.groups ?? {}
    let href: string | undefined
    let address = match[0]
    if (email) {
      href = `mailto:${email}`
    } else if (url || (domain && ending && BARE_DOMAIN_ENDINGS.has(ending))) {
      address = trimTrailing(address)
      // "https://" followed by punctuation only is not an address.
      if (/^(?:https?:\/\/|www\.)?\w/i.test(address)) href = /^https?:\/\//i.test(address) ? address : `https://${address}`
    }
    if (!href) continue
    if (match.index > plainStart) parts.push({ text: text.slice(plainStart, match.index) })
    parts.push({ text: address, href })
    plainStart = match.index + address.length
  }
  if (plainStart < text.length) parts.push({ text: text.slice(plainStart) })
  return parts
}
