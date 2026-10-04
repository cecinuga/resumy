import type { Analytics } from 'firebase/analytics'

/**
 * Anonymous usage counts (visits, new resumes, uploads, downloads) through
 * Firebase Analytics. Resume content is never sent. The SDK is loaded lazily
 * and only when it is configured, and visitors who send Global Privacy
 * Control or Do Not Track are not tracked at all.
 */

export type UploadOutcome = 'success' | 'not_pdf' | 'too_large' | 'no_text' | 'protected' | 'unreadable'

export type AnalyticsEvent =
  | { name: 'page_view'; params: { page_title: string; page_path: string } }
  | { name: 'create_resume' }
  | { name: 'upload_resume'; params: { outcome: UploadOutcome } }
  | { name: 'download_resume'; params: { template: string; font: string; paper: string } }

const env = import.meta.env
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
}

function isConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.appId && firebaseConfig.measurementId)
}

function visitorOptedOut(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
  return nav.globalPrivacyControl === true || nav.doNotTrack === '1'
}

let analytics: Promise<Analytics | null> | null = null

function loadAnalytics(): Promise<Analytics | null> {
  analytics ??= (async () => {
    if (!isConfigured() || visitorOptedOut()) return null
    const [{ initializeApp }, sdk] = await Promise.all([import('firebase/app'), import('firebase/analytics')])
    if (!(await sdk.isSupported())) return null
    // No advertising features: only count usage.
    sdk.setConsent({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
    })
    return sdk.initializeAnalytics(initializeApp(firebaseConfig), {
      config: { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false },
    })
  })().catch(() => null)
  return analytics
}

/** Fire-and-forget: tracking must never slow down or break the app. */
export function track(event: AnalyticsEvent): void {
  void loadAnalytics().then(async (instance) => {
    if (!instance) return
    const { logEvent } = await import('firebase/analytics')
    if (event.name === 'page_view') logEvent(instance, 'page_view', event.params)
    else logEvent(instance, event.name, 'params' in event ? event.params : undefined)
  })
}
