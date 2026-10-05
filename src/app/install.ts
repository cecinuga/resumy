import { useSyncExternalStore } from 'react'

/** Chromium's install prompt, not yet part of the DOM typings. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
}

/**
 * The browser fires its install event once, possibly before React renders,
 * so it is captured as soon as this module loads. Browsers without it
 * (Safari, Firefox) and an app that is already installed never offer it.
 */
let installEvent: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

function setInstallEvent(event: BeforeInstallPromptEvent | null): void {
  installEvent = event
  listeners.forEach((listener) => listener())
}

window.addEventListener('beforeinstallprompt', (event) => {
  // The header offers the install instead of the browser's mini-infobar.
  event.preventDefault()
  setInstallEvent(event as BeforeInstallPromptEvent)
})
window.addEventListener('appinstalled', () => setInstallEvent(null))

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

/** Opens the browser's install dialog, or null when the app can't be installed now. */
export function useInstallApp(): (() => void) | null {
  const event = useSyncExternalStore(subscribe, () => installEvent)
  if (!event) return null
  return () => {
    // The event can prompt only once; the browser fires a new one if the person declines.
    setInstallEvent(null)
    void event.prompt()
  }
}
