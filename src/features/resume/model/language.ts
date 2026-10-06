/**
 * The language a resume is written in, guessed from its most common short
 * words, among the languages Resumy reads headings in. It is set in the PDF
 * so screen readers pronounce it right. English when nothing stands out.
 */
const COMMON_WORDS: Record<string, readonly string[]> = {
  en: ['the', 'and', 'of', 'with', 'for', 'to', 'in', 'on', 'my', 'at'],
  it: ['di', 'e', 'il', 'la', 'con', 'per', 'del', 'della', 'nel', 'un', 'una', 'gli', 'dei'],
  es: ['de', 'y', 'el', 'la', 'con', 'para', 'en', 'los', 'las', 'del', 'un', 'una', 'por'],
  fr: ['de', 'et', 'le', 'la', 'les', 'des', 'pour', 'avec', 'du', 'en', 'un', 'une', 'dans'],
  de: ['und', 'der', 'die', 'das', 'mit', 'für', 'von', 'im', 'in', 'zu', 'ein', 'eine', 'den'],
}

export function guessLanguage(text: string): string {
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? []
  const counts = new Map<string, number>()
  for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1)
  let best = 'en'
  let bestScore = 0
  for (const [language, common] of Object.entries(COMMON_WORDS)) {
    const score = common.reduce((sum, word) => sum + (counts.get(word) ?? 0), 0)
    if (score > bestScore) [best, bestScore] = [language, score]
  }
  return best
}
