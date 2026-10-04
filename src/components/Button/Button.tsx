import { LoaderCircle, type LucideIcon } from 'lucide-react'
import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ComponentType, type ReactNode } from 'react'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'github' | 'page'
export type ButtonSize = 'md' | 'sm'

interface StyleProps {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Leading icon; any component that accepts `aria-hidden`. */
  icon?: LucideIcon | ComponentType<{ 'aria-hidden'?: boolean }>
  /** Hides the text visually; it stays available to screen readers. */
  iconOnly?: boolean
}

function classes({ variant = 'secondary', size = 'md', iconOnly }: StyleProps, extra?: string): string {
  return [styles.button, styles[variant], size === 'sm' && styles.sm, iconOnly && styles.iconOnly, extra]
    .filter(Boolean)
    .join(' ')
}

/** Icon-only controls get their label as a native tooltip too. */
function tooltip(title: string | undefined, iconOnly: boolean | undefined, children: ReactNode): string | undefined {
  return title ?? (iconOnly && typeof children === 'string' ? children : undefined)
}

function Content({ icon: Icon, iconOnly, loading, children }: StyleProps & { loading?: boolean; children: ReactNode }) {
  const Leading = loading ? LoaderCircle : Icon
  return (
    <>
      {Leading && <Leading aria-hidden className={loading ? styles.spin : undefined} />}
      {iconOnly ? <span className="visually-hidden">{children}</span> : children}
    </>
  )
}

export interface ButtonProps extends StyleProps, ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, icon, iconOnly, loading = false, className, children, type = 'button', disabled, title, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={classes({ variant, size, iconOnly }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      title={tooltip(title, iconOnly, children)}
      {...rest}
    >
      <Content icon={icon} iconOnly={iconOnly} loading={loading}>
        {children}
      </Content>
    </button>
  )
})

export interface LinkButtonProps extends StyleProps, AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
}

/** A link that looks like a button, for navigation such as external pages. */
export function LinkButton({ variant, size, icon, iconOnly, className, children, title, ...rest }: LinkButtonProps) {
  return (
    <a className={classes({ variant, size, iconOnly }, className)} title={tooltip(title, iconOnly, children)} {...rest}>
      <Content icon={icon} iconOnly={iconOnly}>
        {children}
      </Content>
    </a>
  )
}
