/**
 * Runs `load` again once if it fails: a code chunk can fail to download on a
 * flaky connection and succeed a moment later.
 */
export function retryOnce<T>(load: () => Promise<T>, delayMs = 1000): Promise<T> {
  return load().catch(() => new Promise<T>((resolve) => setTimeout(() => resolve(load()), delayMs)))
}
