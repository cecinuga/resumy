import type { AnchorHTMLAttributes } from 'react'
import { navigate, pathFor, type Route } from '../../app/router'

interface AppLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: Route
}

/** An in-app link: navigates without reloading, but keeps real hrefs for new tabs. */
export function AppLink({ to, onClick, children, ...rest }: AppLinkProps) {
  return (
    <a
      href={pathFor(to)}
      onClick={(event) => {
        onClick?.(event)
        const opensElsewhere = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
        if (event.defaultPrevented || opensElsewhere) return
        event.preventDefault()
        navigate(to)
      }}
      {...rest}
    >
      {children}
    </a>
  )
}
