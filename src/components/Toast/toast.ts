import { createContext, useContext } from 'react'

export interface ToastOptions {
  message: string
  action?: { label: string; onClick: () => void }
}

export const ToastContext = createContext<((toast: ToastOptions) => void) | null>(null)

/** Shows a short, polite message at the bottom of the screen. */
export function useToast(): (toast: ToastOptions) => void {
  const show = useContext(ToastContext)
  if (!show) throw new Error('useToast must be used inside <ToastProvider>')
  return show
}
