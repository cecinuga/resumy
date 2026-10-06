import { createContext, useContext } from 'react'

export interface ToastOptions {
  message: string
  action?: { label: string; onClick: () => void }
  /** Stays until the person acts on it or closes it, and later messages don't replace it. */
  persistent?: boolean
}

export const ToastContext = createContext<((toast: ToastOptions) => void) | null>(null)

/** Shows a short, polite message at the bottom of the screen. */
export function useToast(): (toast: ToastOptions) => void {
  const show = useContext(ToastContext)
  if (!show) throw new Error('useToast must be used inside <ToastProvider>')
  return show
}

export const ToastDismissContext = createContext<(() => void) | null>(null)

/** Hides every toast, e.g. when their actions no longer apply to the resume on screen. */
export function useDismissToasts(): () => void {
  return useContext(ToastDismissContext) ?? noop
}

function noop() {}
