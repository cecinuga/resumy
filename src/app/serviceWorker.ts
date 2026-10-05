import { useRegisterSW } from 'virtual:pwa-register/react'
import { useToast } from '../components/Toast/toast'

/** How often an app that stays open checks for a new version. */
const UPDATE_CHECK_MS = 60 * 60 * 1000

/**
 * Registers the service worker that lets Resumy be installed and work offline.
 * It only exists in production builds; in development this does nothing.
 *
 * A new version waits until the person chooses to reload. Reloading is safe:
 * the draft is saved when the page unloads.
 */
export function useServiceWorker(): void {
  const toast = useToast()
  const { updateServiceWorker } = useRegisterSW({
    onOfflineReady: () => toast({ message: 'Resumy is ready to work offline.' }),
    onNeedRefresh: () =>
      toast({
        message: 'A new version of Resumy is ready.',
        action: { label: 'Reload', onClick: () => void updateServiceWorker() },
      }),
    onRegisteredSW: (_url, registration) => {
      if (!registration) return
      // Offline, the check fails; the next one tries again.
      window.setInterval(() => registration.update().catch(() => {}), UPDATE_CHECK_MS)
    },
  })
}
