/** Text patterns used to recognise the parts of a resume. */

const MONTHS = [
  // English
  'jan(?:uary)?', 'feb(?:ruary)?', 'mar(?:ch)?', 'apr(?:il)?', 'may', 'june?', 'july?', 'aug(?:ust)?',
  'sep(?:t(?:ember)?)?', 'oct(?:ober)?', 'nov(?:ember)?', 'dec(?:ember)?',
  // Italian
  'gen(?:naio)?', 'febbraio', 'marzo', 'aprile', 'mag(?:gio)?', 'giu(?:gno)?', 'lug(?:lio)?', 'ago(?:sto)?',
  'set(?:tembre)?', 'ott(?:obre)?', 'novembre', 'dic(?:embre)?',
  // Spanish, French, German
  'ene(?:ro)?', 'febrero', 'abr(?:il)?', 'mayo', 'junio', 'julio', 'septiembre', 'octubre', 'noviembre',
  'diciembre', 'janv(?:ier)?', 'f[ée]vr?(?:ier)?', 'mars', 'avr(?:il)?', 'mai', 'juin', 'juil(?:let)?',
  'ao[uû]t', 'd[ée]c(?:embre)?', 'j[äa]n(?:ner|uar)?', 'februar', 'm[äa]rz', 'juni', 'juli', 'okt(?:ober)?',
  'dez(?:ember)?',
].join('|')

const YEAR = '(?:19|20)\\d{2}'
const DATE = `(?:(?:${MONTHS})\\.?\\s*${YEAR}|\\d{1,2}\\s*[/.-]\\s*${YEAR}|${YEAR}\\s*[/.-]\\s*\\d{1,2}|${YEAR})`
const PRESENT =
  "(?:present|current(?:ly)?|now|today|ongoing|oggi|ad oggi|presente|attuale|in corso|actualidad|actual|aujourd['’]hui|heute|jetzt)"
const SEPARATOR = '(?:\\s*[-–—~]\\s*|\\s+(?:to|until|till|a|ad|al|fino a|hasta|à|au|bis)\\s+)'
const NOT_WORD_BEFORE = '(?<![\\p{L}\\d])'
const NOT_WORD_AFTER = '(?![\\p{L}\\d])'

/** "Jan 2020 – Present", "03/2018 - 06/2020", "2015 to 2017", "Gen 2021 – Oggi"... */
export const DATE_RANGE = new RegExp(
  `${NOT_WORD_BEFORE}(?:(?:from|since|dal|da|desde|de|du|von)\\s+)?${DATE}${SEPARATOR}(?:${DATE}|${PRESENT})${NOT_WORD_AFTER}`,
  'iu',
)

/** A text that is only a date: "2017", "June 2017", "Since 2019". */
export const SINGLE_DATE = new RegExp(`^(?:(?:since|dal|da|desde|depuis|seit)\\s+)?(?:${DATE}|${PRESENT})$`, 'iu')

export function findDateRange(text: string): string | null {
  return DATE_RANGE.exec(text)?.[0].trim() ?? null
}

export function hasDate(text: string): boolean {
  return DATE_RANGE.test(text) || SINGLE_DATE.test(text.trim())
}

/** Bullet markers, including private-use glyphs from symbol fonts (Wingdings, Symbol). */
export const BULLET = /^(?:[•●○◦▪▫■□‣⁃∙⋅·►▸▹▶➢➤➔→✓✔❖◆◇♦\uE000-\uF8FF]\s*|[-–—*+]\s+|\d{1,2}[.)]\s+)/u

export function isBullet(text: string): boolean {
  return BULLET.test(text)
}

export function stripBullet(text: string): string {
  return text.replace(BULLET, '').trim()
}

export const EMAIL = /[\p{L}\d._%+-]+@[\p{L}\d.-]+\.\p{L}{2,}/u

const TLDS =
  'com|net|org|io|dev|me|app|ai|co|info|eu|it|de|fr|es|uk|ch|nl|be|at|pt|pl|se|no|dk|fi|ie|us|ca|au|in|br|tech|site|online|xyz|page|blog|design|studio|codes|cloud|link|bio|ly'

/** Websites and profiles; e-mail domains are excluded. Global: use with match/replace only. */
export const URL_PATTERN = new RegExp(
  `(?<![@\\p{L}\\d.-])(?:https?:\\/\\/)?(?:www\\.)?[\\p{L}\\d-]+(?:\\.[\\p{L}\\d-]+)*\\.(?:${TLDS})(?![\\p{L}\\d-])(?:\\/[^\\s|,;]*)?`,
  'giu',
)

const PHONE = /(?:\+|00)?\(?\d[\d\s()./-]{5,}\d/

/** A phone number: 7 to 15 digits, not a year range. */
export function findPhone(text: string): string | null {
  const match = PHONE.exec(text)?.[0]
  if (!match) return null
  const digits = match.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 15 || DATE_RANGE.test(match)) return null
  return match.trim()
}

const REMOTE = /^(?:remote|hybrid|on-?site|fully remote|da remoto|in remoto|smart working|remoto|t[ée]l[ée]travail)$/iu
const PLACE = "[\\p{Lu}][\\p{L}'’.-]*(?:\\s+[\\p{L}'’.-]+){0,3}"
const CITY_REGION = new RegExp(`^${PLACE}\\s*,\\s*${PLACE}(?:\\s*,\\s*${PLACE})?$`, 'u')
const CITY_PROVINCE = new RegExp(`^${PLACE}\\s*\\(\\s*\\p{Lu}{2,3}\\s*\\)$`, 'u')

/** Words that make "Software Engineer, Backend" a role rather than a place. */
const ROLE_WORDS =
  /\b(?:engineer|developer|manager|designer|analyst|scientist|consultant|specialist|director|intern|lead|architect|student|officer|assistant|coordinator|administrator|technician|founder|owner|head|senior|junior|ingegnere|sviluppatore|responsabile|tecnico|studente|consulente|stagista|science|engineering|university|universit[àa]|bachelor|master|degree|laurea)\b/i

/** "Milan, Italy", "Austin, TX", "Roma (RM)", "Remote". */
export function isLocation(text: string): boolean {
  const value = text.trim()
  if (REMOTE.test(value)) return true
  return (CITY_REGION.test(value) || CITY_PROVINCE.test(value)) && !ROLE_WORDS.test(value)
}

export function isUpperCase(text: string): boolean {
  const letters = text.replace(/[^\p{L}]/gu, '')
  return letters.length >= 2 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

/** "WORK EXPERIENCE" -> "Work experience"; mixed case is kept as written. */
export function toSentenceCase(text: string): string {
  if (!isUpperCase(text)) return text
  const lower = text.toLocaleLowerCase()
  return lower.charAt(0).toLocaleUpperCase() + lower.slice(1)
}

/** "JANE DOE" -> "Jane Doe"; mixed case is kept as written. */
export function toNameCase(text: string): string {
  if (!isUpperCase(text)) return text
  return text.toLocaleLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_, before: string, letter: string) => before + letter.toLocaleUpperCase())
}
