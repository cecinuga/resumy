import { memo } from 'react'
import styles from './Footer.module.css'

const AUTHOR_LINKS = [
  { label: 'GitHub', href: 'https://github.com/cecinuga' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/matteommarchetti' },
  { label: 'Blog', href: 'https://cecinuga.dev' },
] as const

/** `compact`: one quiet line under the editor, where the page is a workspace rather than a site. */
export const Footer = memo(function Footer({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={styles.footer} data-compact={compact || undefined}>
      <div className={styles.inner}>
        <div className={styles.about}>
          {!compact && <p>Resumy is a free and open-source resume builder created by Cecinuga.</p>}
          <p className={styles.love}>Made with love by Cecinuga ❤️</p>
        </div>
        <nav aria-label="Author" className={styles.links}>
          {AUTHOR_LINKS.map(({ label, href }) => (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer">
              {label}
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          ))}
        </nav>
      </div>
    </footer>
  )
})
