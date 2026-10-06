import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { retryOnce } from '../lib/retry'
import { ErrorBoundary } from './ErrorBoundary'

function Broken(): never {
  throw new Error('chunk failed')
}

describe('ErrorBoundary', () => {
  it('shows a way to recover instead of a blank page', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Your resume is saved in this browser')
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
  })
})

describe('retryOnce', () => {
  it('tries a failed load once more', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce('module')
    await expect(retryOnce(load, 0)).resolves.toBe('module')
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('gives up after the second failure', async () => {
    const load = vi.fn().mockRejectedValue(new Error('offline'))
    await expect(retryOnce(load, 0)).rejects.toThrow('offline')
  })
})
