import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from '../Button/Button'
import styles from './Drawer.module.css'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/**
 * A bottom sheet for small screens, built on the native modal <dialog>. It
 * takes half the screen and leaves the page above it uncovered, so the
 * effect of a choice made in it shows right away.
 */
export function Drawer({ open, onClose, title, children }: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // Always open at the top, whatever the focus or the last visit scrolled to.
      if (bodyRef.current) bodyRef.current.scrollTop = 0
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    // Closing on a backdrop click is a pointer shortcut; Escape is the keyboard equivalent.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      className={styles.drawer}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className={styles.top}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <Button variant="quiet" iconOnly icon={X} onClick={onClose}>
          Close
        </Button>
      </div>
      <div ref={bodyRef} className={styles.body}>
        {children}
      </div>
    </dialog>
  )
}
