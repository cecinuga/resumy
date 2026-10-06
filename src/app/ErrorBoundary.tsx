import { RotateCw } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '../components/Button/Button'
import styles from './App.module.css'

interface ErrorBoundaryProps {
  children: ReactNode
}

/**
 * Catches anything that fails while rendering the page (including a code
 * chunk that didn't load), so the person sees what to do instead of a blank
 * page. The resume lives outside it and keeps being saved.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean }> {
  override state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(error, info.componentStack)
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children
    return (
      <div className={styles.failure} role="alert">
        <h1 className={styles.failureTitle}>Something went wrong</h1>
        <p>Your resume is saved in this browser. Reload the page to continue where you left off.</p>
        <Button variant="primary" icon={RotateCw} onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    )
  }
}
