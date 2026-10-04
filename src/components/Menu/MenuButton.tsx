import type { LucideIcon } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Button, type ButtonProps } from '../Button/Button'
import styles from './Menu.module.css'

export interface MenuItem {
  id: string
  label: string
  hint?: string
  icon?: LucideIcon
  onSelect: () => void
}

interface MenuButtonProps extends Pick<ButtonProps, 'variant' | 'size' | 'icon' | 'iconOnly' | 'className'> {
  /** Text of the trigger button; also names the menu. */
  label: string
  items: readonly MenuItem[]
  align?: 'start' | 'end'
}

/** A button that opens a list of actions (WAI-ARIA menu button pattern). */
export function MenuButton({ label, items, align = 'start', ...buttonProps }: MenuButtonProps) {
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<'below' | 'above'>('below')
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const menuItems = () => [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]

  const close = (restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // Open upwards when there is no room below, then focus the first item.
  useLayoutEffect(() => {
    if (!open || !menuRef.current || !triggerRef.current) return
    const trigger = triggerRef.current.getBoundingClientRect()
    const height = menuRef.current.offsetHeight
    const fitsBelow = trigger.bottom + height + 8 <= window.innerHeight
    setPlacement(!fitsBelow && trigger.top > height + 8 ? 'above' : 'below')
    menuItems()[0]?.focus()
  }, [open])

  const onMenuKeyDown = (event: KeyboardEvent) => {
    const list = menuItems()
    const current = list.indexOf(document.activeElement as HTMLElement)
    const focusAt = (index: number) => list[(index + list.length) % list.length]?.focus()
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusAt(current + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        focusAt(current - 1)
        break
      case 'Home':
        event.preventDefault()
        focusAt(0)
        break
      case 'End':
        event.preventDefault()
        focusAt(list.length - 1)
        break
      case 'Escape':
        event.preventDefault()
        event.stopPropagation()
        close(true)
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <div ref={rootRef} className={styles.root}>
      <Button
        ref={triggerRef}
        {...buttonProps}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        {label}
      </Button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          tabIndex={-1}
          aria-label={label}
          className={[styles.menu, styles[placement], styles[align]].join(' ')}
          onKeyDown={onMenuKeyDown}
        >
          {items.map(({ id, label: itemLabel, hint, icon: Icon, onSelect }) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={styles.item}
              onClick={() => {
                close(true)
                onSelect()
              }}
            >
              {Icon && <Icon aria-hidden />}
              <span className={styles.itemText}>
                {itemLabel}
                {hint && <span className={styles.hint}>{hint}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
