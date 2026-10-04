const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

/**
 * Creates a short random id for resume nodes.
 * Uses `getRandomValues`, which (unlike `randomUUID`) also works outside
 * secure contexts, such as a dev server opened from a phone over the LAN.
 */
export function createId(length = 10): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let id = ''
  for (const byte of bytes) id += ALPHABET[byte % ALPHABET.length]
  return id
}
