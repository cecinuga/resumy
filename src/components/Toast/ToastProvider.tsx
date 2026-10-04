import { X } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createId } from '../../lib/id'
import { ToastContext, type ToastOptions } from './toast'
import styles from './Toast.module.css'

const TOAST_DURATION_MS = 6000

interface Toast extends ToastOptions {
  id: string
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  // Only the latest message matters; older ones are replaced.
  const show = useCallback((toast: ToastOptions) => setToasts([{ ...toast, id: createId() }]), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <ToastMessage key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastMessage({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [paused, setPaused] = useState(false)
  const close = () => onDismiss(toast.id)

  // Stays while hovered or focused, so there is time to read it and act.
  useEffect(() => {
    if (paused) return
    const timer = window.setTimeout(() => onDismiss(toast.id), TOAST_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [paused, onDismiss, toast.id])

  return (
    <div
      className={styles.toast}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className={styles.message}>{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            toast.action?.onClick()
            close()
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" className={styles.close} onClick={close} aria-label="Dismiss">
        <X aria-hidden />
      </button>
    </div>
  )
}
