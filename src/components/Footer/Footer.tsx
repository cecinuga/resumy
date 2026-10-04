import styles from './Footer.module.css'

const AUTHOR_LINKS = [
  { label: 'GitHub', href: 'https://github.com/cecinuga' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/matteommarchetti' },
  { label: 'Blog', href: 'https://cecinuga.dev' },
] as const

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.about}>
          <p>Resumy is a free and open-source resume builder created by cecinuga.</p>
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
}
