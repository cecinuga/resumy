import { Moon, Sprout, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTheme } from '../../app/theme'
import { AppLink } from '../AppLink/AppLink'
import { Button, LinkButton } from '../Button/Button'
import { GithubMark } from '../GithubMark/GithubMark'
import styles from './Header.module.css'

export const REPOSITORY_URL = 'https://github.com/cecinuga/resumy'

interface HeaderProps {
  /** Rendered last, at the far right: the page's primary action. */
  primaryAction?: ReactNode
}

export function Header({ primaryAction }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <AppLink to="home" className={styles.logo} aria-label="Resumy, home">
          <span className={styles.logoMark} aria-hidden>
            <Sprout />
          </span>
          <span className={styles.logoText}>Resumy</span>
        </AppLink>
        <div className={styles.actions}>
          <Button variant="quiet" iconOnly icon={theme === 'dark' ? Sun : Moon} onClick={toggleTheme}>
            {`Switch to ${nextTheme} theme`}
          </Button>
          <LinkButton
            variant="github"
            icon={GithubMark}
            href={REPOSITORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.collapsible}
            title="Resumy on GitHub"
          >
            <span className={styles.label}>GitHub</span>
          </LinkButton>
          {primaryAction}
        </div>
      </div>
    </header>
  )
}
