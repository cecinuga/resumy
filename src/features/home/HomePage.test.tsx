import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../components/Toast/ToastProvider'
import { track } from '../../lib/analytics'
import { sampleResume } from '../../test/sampleResume'
import type { ImportResult } from '../import/importResume'
import { useResumeState } from '../resume/state/context'
import { ResumeProvider } from '../resume/state/ResumeProvider'
import { HomePage } from './HomePage'

vi.mock('../../lib/analytics', () => ({ track: vi.fn() }))

const upload = vi.hoisted(() => ({ finish: (_result: ImportResult) => {} }))
vi.mock('../import/importResume', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../import/importResume')>()),
  importResumeFromFile: () =>
    new Promise<ImportResult>((resolve) => {
      upload.finish = resolve
    }),
}))

/** The home page, a way to leave it, and the name of the resume being edited. */
function Harness() {
  const { resume } = useResumeState()
  const [onHome, setOnHome] = useState(true)
  return (
    <>
      {onHome && <HomePage />}
      <button type="button" onClick={() => setOnHome(false)}>
        Leave
      </button>
      <output aria-label="Editing">{resume?.basics.name ?? ''}</output>
    </>
  )
}

function renderHome() {
  const view = render(
    <ToastProvider>
      <ResumeProvider>
        <Harness />
      </ResumeProvider>
    </ToastProvider>,
  )
  const input = view.container.querySelector<HTMLInputElement>('input[type="file"]')!
  return { user: userEvent.setup(), input }
}

const imported = () => ({ ok: true, resume: sampleResume(), source: 'layout' }) as const
const pdf = () => new File(['%PDF-1.7'], 'resume.pdf', { type: 'application/pdf' })

describe('HomePage', () => {
  it('holds the other ways to start while a PDF is being read', async () => {
    const { user, input } = renderHome()
    await user.upload(input, pdf())
    expect(screen.getByRole('button', { name: 'New resume' })).toBeDisabled()

    await act(async () => upload.finish({ ok: false, reason: 'no_text' }))
    expect(screen.getByRole('button', { name: 'New resume' })).toBeEnabled()
  })

  it('drops an upload that finishes after the person left the page', async () => {
    const { user, input } = renderHome()
    await user.upload(input, pdf())
    await user.click(screen.getByRole('button', { name: 'Leave' }))

    await act(async () => upload.finish(imported()))
    expect(screen.getByRole('status', { name: 'Editing' })).toHaveTextContent('')
    expect(track).not.toHaveBeenCalled()
  })

  it('counts a new resume or an upload only once it replaces the draft', async () => {
    localStorage.setItem('resumy:draft', JSON.stringify({ savedAt: Date.now(), resume: sampleResume() }))
    const { user, input } = renderHome()

    await user.click(screen.getByRole('button', { name: 'New resume' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Keep current resume' }))
    await user.upload(input, pdf())
    await act(async () => upload.finish(imported()))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Keep current resume' }))
    expect(track).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'New resume' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Replace it' }))
    expect(track).toHaveBeenCalledExactlyOnceWith({ name: 'create_resume' })
  })
})
