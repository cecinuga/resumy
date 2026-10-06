import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useToast } from '../../../components/Toast/toast'
import { ToastProvider } from '../../../components/Toast/ToastProvider'
import { sampleResume } from '../../../test/sampleResume'
import { useResumeActions, useResumeState } from './context'
import { ResumeProvider } from './ResumeProvider'

const KEY = 'resumy:draft'
const stored = () => JSON.parse(localStorage.getItem(KEY) ?? 'null') as { resume: { basics: { name: string } } } | null

/** What another tab does: writes the draft, which fires a storage event here. */
function saveInOtherTab(name: string, savedAt = Date.now()) {
  const resume = sampleResume()
  resume.basics.name = name
  localStorage.setItem(KEY, JSON.stringify({ savedAt, resume }))
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: KEY })))
}

function Harness() {
  const { resume } = useResumeState()
  const { dispatch, load } = useResumeActions()
  const toast = useToast()
  return (
    <>
      <output aria-label="Name">{resume?.basics.name ?? 'none'}</output>
      <button type="button" onClick={() => dispatch({ type: 'basics/set', field: 'name', value: 'Typed here' })}>
        Type
      </button>
      <button type="button" onClick={() => toast({ message: 'Removed “Projects”.', action: { label: 'Undo', onClick: () => {} } })}>
        Remove
      </button>
      <button type="button" onClick={() => load(null)}>
        Start over
      </button>
    </>
  )
}

function renderProvider() {
  localStorage.setItem(KEY, JSON.stringify({ savedAt: 1, resume: sampleResume() }))
  render(
    <ToastProvider>
      <ResumeProvider>
        <Harness />
      </ResumeProvider>
    </ToastProvider>,
  )
  return userEvent.setup()
}

const name = () => screen.getByRole('status', { name: 'Name' })

describe('ResumeProvider across tabs', () => {
  it('takes over what another tab saved, so typing here does not overwrite it', async () => {
    const user = renderProvider()
    saveInOtherTab('Edited in tab B')
    expect(name()).toHaveTextContent('Edited in tab B')

    await user.click(screen.getByRole('button', { name: 'Type' }))
    await act(() => new Promise((resolve) => setTimeout(resolve, 500)))
    expect(stored()?.resume.basics.name).toBe('Typed here')
  })

  it('keeps edits this tab has not saved yet', async () => {
    const user = renderProvider()
    await user.click(screen.getByRole('button', { name: 'Type' }))
    saveInOtherTab('Edited in tab B')
    expect(name()).toHaveTextContent('Typed here')
  })

  it('follows another tab that started over', () => {
    renderProvider()
    localStorage.removeItem(KEY)
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: KEY })))
    expect(name()).toHaveTextContent('none')
  })

  it('ignores its own save coming back, and drafts it cannot read', () => {
    renderProvider()
    saveInOtherTab('Giulia Rossi', 1)
    localStorage.setItem(KEY, '{broken')
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: KEY })))
    expect(name()).toHaveTextContent('Giulia Rossi')
  })
})

describe('ResumeProvider load', () => {
  it('dismisses toasts whose Undo belongs to the previous resume', async () => {
    const user = renderProvider()
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start over' }))
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
  })
})
