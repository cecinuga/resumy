import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Header } from '../components/Header/Header'

const INSTALL = 'Install Resumy as an app'

/** What Chromium browsers fire once the app can be installed. */
function fireInstallPrompt() {
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn(() => Promise.resolve()),
  })
  act(() => {
    window.dispatchEvent(event)
  })
  return event
}

describe('installing the app', () => {
  it('offers the install once the browser allows it', async () => {
    const user = userEvent.setup()
    render(<Header />)
    expect(screen.queryByRole('button', { name: INSTALL })).not.toBeInTheDocument()

    const event = fireInstallPrompt()
    expect(event.defaultPrevented).toBe(true)
    await user.click(screen.getByRole('button', { name: INSTALL }))
    expect(event.prompt).toHaveBeenCalledOnce()
    // The browser's prompt can only be shown once.
    expect(screen.queryByRole('button', { name: INSTALL })).not.toBeInTheDocument()
  })

  it('stops offering it once the app is installed', () => {
    render(<Header />)
    fireInstallPrompt()
    expect(screen.getByRole('button', { name: INSTALL })).toBeInTheDocument()

    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })
    expect(screen.queryByRole('button', { name: INSTALL })).not.toBeInTheDocument()
  })
})
