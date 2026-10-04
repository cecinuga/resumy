/**
 * Thin wrapper over localStorage that never throws: storage can be disabled
 * (private mode, strict privacy settings) or full, and the app must keep
 * working in memory when that happens.
 */
export const storage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },

  /** Returns false when the value could not be stored (e.g. quota exceeded). */
  set(key: string, value: string): boolean {
    try {
      window.localStorage.setItem(key, value)
      return true
    } catch {
      return false
    }
  },

  remove(key: string): void {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Nothing to clean up if storage is unavailable.
    }
  },
}
