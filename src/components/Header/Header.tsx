import { MonitorDown, Moon, Sprout, Sun } from 'lucide-react'
import { memo, type ReactNode } from 'react'
import { useInstallApp } from '../../app/install'
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

export const Header = memo(function Header({ primaryAction }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const installApp = useInstallApp()

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <AppLink to="home" className={styles.logo} aria-label="Resumy, home">
          <span className={styles.logoMark} aria-hidden>
            <Sprout />
          </span>
          <span className={styles.logoText}>Resumy</span>
        </AppLink>
        <div className={styles.actions} data-has-primary={primaryAction ? '' : undefined}>
          {/* First, and smaller on phones: well away from the page's primary action. */}
          <LinkButton
            variant="github"
            icon={GithubMark}
            href={REPOSITORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.github}
            title="Resumy on GitHub"
          >
            <span className={styles.label}>GitHub</span>
          </LinkButton>
          {installApp && (
            // In the editor on phones, the tools' "More actions" menu offers it instead.
            <Button variant="quiet" icon={MonitorDown} onClick={installApp} className={styles.install} aria-label="Install Resumy as an app" title="Install Resumy as an app">
              Install
            </Button>
          )}
          <Button variant="quiet" iconOnly icon={theme === 'dark' ? Sun : Moon} onClick={toggleTheme}>
            {`Switch to ${nextTheme} theme`}
          </Button>
          {primaryAction}
        </div>
      </div>
    </header>
  )
})
