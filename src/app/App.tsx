import { LucideProvider } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef } from 'react'
import { Footer } from '../components/Footer/Footer'
import { Header } from '../components/Header/Header'
import { ToastProvider } from '../components/Toast/ToastProvider'
import { DownloadButton } from '../features/export/DownloadButton'
import { HomePage } from '../features/home/HomePage'
import { useResumeState } from '../features/resume/state/context'
import { ResumeProvider } from '../features/resume/state/ResumeProvider'
import { track } from '../lib/analytics'
import styles from './App.module.css'
import { navigate, pathFor, routeFromPath, useRoute, type Route } from './router'
import { useServiceWorker } from './serviceWorker'

// The editor (and its drag-and-drop engine) loads only when it is needed.
const EditorPage = lazy(() => import('../features/editor/EditorPage'))

// A constant element keeps the (memoized) header from re-rendering with every keystroke.
const DOWNLOAD_BUTTON = <DownloadButton />

const PAGE_TITLES: Record<Route, string> = {
  home: 'Resumy · Free, private resume builder',
  editor: 'Editor · Resumy',
}

export function App() {
  return (
    <LucideProvider size={18} strokeWidth={1.5} absoluteStrokeWidth>
      <ToastProvider>
        <ResumeProvider>
          <Shell />
        </ResumeProvider>
      </ToastProvider>
    </LucideProvider>
  )
}

function Shell() {
  useServiceWorker()
  const route = useRoute()
  const { resume } = useResumeState()
  const page: Route = route === 'editor' && resume ? 'editor' : 'home'
  const mainRef = useRef<HTMLElement>(null)
  const isFirstPage = useRef(true)

  // Unknown paths, and the editor without a resume, fall back to home.
  useEffect(() => {
    if (routeFromPath(window.location.pathname) !== page) navigate(page, { replace: true })
  }, [page, route])

  useEffect(() => {
    document.title = PAGE_TITLES[page]
    track({ name: 'page_view', params: { page_title: PAGE_TITLES[page], page_path: pathFor(page) } })
    // After in-app navigation, move focus to the new page for keyboard and screen reader users.
    if (isFirstPage.current) isFirstPage.current = false
    else mainRef.current?.focus({ preventScroll: true })
  }, [page])

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main">
        Skip to content
      </a>
      <Header primaryAction={page === 'editor' ? DOWNLOAD_BUTTON : undefined} />
      <main id="main" ref={mainRef} tabIndex={-1} className={styles.main}>
        {page === 'editor' ? (
          <Suspense fallback={<p className={styles.loading}>Opening the editor…</p>}>
            <EditorPage />
          </Suspense>
        ) : (
          <HomePage />
        )}
      </main>
      <Footer />
    </div>
  )
}
