import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDismissToasts, useToast } from './toast'
import { ToastProvider } from './ToastProvider'

function Buttons() {
  const toast = useToast()
  const dismissAll = useDismissToasts()
  return (
    <>
      <button type="button" onClick={() => toast({ message: 'Update ready.', persistent: true })}>
        Update
      </button>
      <button type="button" onClick={() => toast({ message: 'Removed “Projects”.' })}>
        Remove
      </button>
      <button type="button" onClick={dismissAll}>
        Load
      </button>
    </>
  )
}

describe('ToastProvider', () => {
  it('keeps a message that waits for an answer', () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <Buttons />
      </ToastProvider>,
    )
    act(() => screen.getByRole('button', { name: 'Update' }).click())
    act(() => screen.getByRole('button', { name: 'Remove' }).click())
    act(() => screen.getByRole('button', { name: 'Load' }).click())
    act(() => vi.advanceTimersByTime(60_000))
    expect(screen.getByText('Update ready.')).toBeInTheDocument()
    expect(screen.queryByText('Removed “Projects”.')).not.toBeInTheDocument()

    act(() => screen.getByRole('button', { name: 'Remove' }).click())
    act(() => vi.advanceTimersByTime(7000))
    expect(screen.queryByText('Removed “Projects”.')).not.toBeInTheDocument()
    vi.useRealTimers()
  })
})
