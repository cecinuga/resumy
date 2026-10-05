import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { RegisterSWOptions } from 'virtual:pwa-register/react'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/Toast/ToastProvider'
import { useServiceWorker } from './serviceWorker'

// The service worker only exists in production builds: these tests play its part.
const worker = vi.hoisted(() => ({
  options: {} as RegisterSWOptions,
  updateServiceWorker: (): Promise<void> => Promise.resolve(),
}))

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (options: RegisterSWOptions) => {
    worker.options = options
    return {
      needRefresh: [false, () => {}],
      offlineReady: [false, () => {}],
      updateServiceWorker: worker.updateServiceWorker,
    }
  },
}))

function Probe() {
  useServiceWorker()
  return null
}

const renderApp = () =>
  render(
    <ToastProvider>
      <Probe />
    </ToastProvider>,
  )

describe('service worker', () => {
  it('offers to reload when a new version is ready', async () => {
    worker.updateServiceWorker = vi.fn(() => Promise.resolve())
    const user = userEvent.setup()
    renderApp()

    act(() => worker.options.onNeedRefresh?.())
    expect(screen.getByText('A new version of Resumy is ready.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reload' }))
    expect(worker.updateServiceWorker).toHaveBeenCalledOnce()
  })

  it('says when the app works offline', () => {
    renderApp()
    act(() => worker.options.onOfflineReady?.())
    expect(screen.getByText('Resumy is ready to work offline.')).toBeInTheDocument()
  })

  it('checks for a new version every hour', () => {
    vi.useFakeTimers()
    try {
      renderApp()
      const registration = { update: vi.fn(() => Promise.reject(new Error('offline'))) }
      worker.options.onRegisteredSW?.('/sw.js', registration as unknown as ServiceWorkerRegistration)

      vi.advanceTimersByTime(59 * 60 * 1000)
      expect(registration.update).not.toHaveBeenCalled()
      vi.advanceTimersByTime(60 * 1000)
      expect(registration.update).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }
  })
})
