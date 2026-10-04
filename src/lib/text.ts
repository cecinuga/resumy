/** Splits on commas, semicolons and bullet-like separators, but not inside parentheses. */
export function splitList(text: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const char of text) {
    if (char === '(' || char === '[') depth += 1
    if (char === ')' || char === ']') depth = Math.max(0, depth - 1)
    if (depth === 0 && /[,;|•·⋅∙◦▪]/.test(char)) {
      parts.push(current)
      current = ''
    } else {
      current += char
    }
  }
  parts.push(current)
  return parts.map((part) => part.trim().replace(/\.$/, '')).filter(Boolean)
}
