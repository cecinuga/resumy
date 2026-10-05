import { describe, expect, it } from 'vitest'
import { linkify, toHref } from './links'

/** The links found in the text, as [text, href] pairs. */
const linksIn = (text: string) => linkify(text).flatMap((part) => (part.href ? [[part.text, part.href]] : []))

describe('linkify', () => {
  it('keeps the text intact, split around its links', () => {
    const text = 'Portfolio at https://jane.dev/work, code on github.com/jane. Mail jane@example.com!'
    const parts = linkify(text)
    expect(parts.map((part) => part.text).join('')).toBe(text)
    expect(parts).toEqual([
      { text: 'Portfolio at ' },
      { text: 'https://jane.dev/work', href: 'https://jane.dev/work' },
      { text: ', code on ' },
      { text: 'github.com/jane', href: 'https://github.com/jane' },
      { text: '. Mail ' },
      { text: 'jane@example.com', href: 'mailto:jane@example.com' },
      { text: '!' },
    ])
  })

  it('links addresses with a scheme, with www. or with a known domain ending', () => {
    expect(linksIn('http://old.example.org/a?b=1#c')).toEqual([['http://old.example.org/a?b=1#c', 'http://old.example.org/a?b=1#c']])
    expect(linksIn('See www.janedoe.design')).toEqual([['www.janedoe.design', 'https://www.janedoe.design']])
    expect(linksIn('Built resumy.app and docs.example.co.uk/guide')).toEqual([
      ['resumy.app', 'https://resumy.app'],
      ['docs.example.co.uk/guide', 'https://docs.example.co.uk/guide'],
    ])
    expect(linksIn('Speaker at GitHub.com/events')).toEqual([['GitHub.com/events', 'https://GitHub.com/events']])
  })

  it('leaves out trailing punctuation and unmatched brackets', () => {
    expect(linksIn('Cut bundle size by 38% (see github.com/acme/checkout).')).toEqual([
      ['github.com/acme/checkout', 'https://github.com/acme/checkout'],
    ])
    expect(linksIn('[https://example.com/a]')).toEqual([['https://example.com/a', 'https://example.com/a']])
    expect(linksIn('en.wikipedia.org/wiki/Ada_(language), and more')).toEqual([
      ['en.wikipedia.org/wiki/Ada_(language)', 'https://en.wikipedia.org/wiki/Ada_(language)'],
    ])
    expect(linksIn('"https://example.com"')).toEqual([['https://example.com', 'https://example.com']])
  })

  it('does not mistake technologies, abbreviations, numbers or file names for links', () => {
    const text =
      'Node.js, Vue.js, Next.js/React, ASP.NET, e.g. i.e. Ph.D. U.S. v2.0, 1.2 seconds, README.md, main.py, deploy.sh, St.Louis'
    expect(linksIn(text)).toEqual([])
  })

  it('does not link an address inside a longer word or an email domain on its own', () => {
    expect(linksIn('jane@example.com')).toEqual([['jane@example.com', 'mailto:jane@example.com']])
    expect(linksIn('path/to/example.com')).toEqual([])
    expect(linksIn('example.community and https://')).toEqual([])
  })

  it('returns plain text unchanged', () => {
    expect(linkify('Led a team of five.')).toEqual([{ text: 'Led a team of five.' }])
    expect(linkify('')).toEqual([])
  })
})

describe('toHref', () => {
  it('accepts any domain in a field meant for links', () => {
    expect(toHref('linkedin.com/in/jane')).toBe('https://linkedin.com/in/jane')
    expect(toHref(' https://jane.example ')).toBe('https://jane.example')
    expect(toHref('jane.portfolio')).toBe('https://jane.portfolio')
    expect(toHref('Jane Doe')).toBeUndefined()
  })
})
