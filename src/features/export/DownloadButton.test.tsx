import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../components/Toast/ToastProvider'
import { sampleResume } from '../../test/sampleResume'
import { ResumeProvider } from '../resume/state/ResumeProvider'
import { DownloadButton } from './DownloadButton'

const renderPdf = vi.hoisted(() => ({ renderResumePdf: vi.fn(async () => new Blob()) }))
vi.mock('./renderPdf', () => renderPdf)
vi.mock('../../lib/download', () => ({ saveBlob: vi.fn() }))

function renderWithDraft(name: string, font = sampleResume().design.font) {
  const resume = sampleResume({ font })
  resume.basics.name = name
  localStorage.setItem('resumy:draft', JSON.stringify({ savedAt: Date.now(), resume }))
  render(
    <ToastProvider>
      <ResumeProvider>
        <DownloadButton />
      </ResumeProvider>
    </ToastProvider>,
  )
}

describe('DownloadButton', () => {
  it('downloads straight away when every character prints', async () => {
    renderWithDraft('Олена Шевченко')
    await userEvent.click(screen.getByRole('button', { name: 'Download PDF' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(renderPdf.renderResumePdf).toHaveBeenCalledOnce()
  })

  it('warns before downloading characters the font cannot print', async () => {
    const user = userEvent.setup()
    renderWithDraft('王伟')
    await user.click(screen.getByRole('button', { name: 'Download PDF' }))

    const dialog = screen.getByRole('dialog', { name: 'Before you download' })
    expect(dialog).toHaveAccessibleDescription(/Source Sans can't print 王 伟: .*Remove them/)
    expect(renderPdf.renderResumePdf).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Download anyway' }))
    expect(renderPdf.renderResumePdf).toHaveBeenCalledOnce()
  })

  it('confirms the download', async () => {
    renderWithDraft('Giulia Rossi')
    await userEvent.click(screen.getByRole('button', { name: 'Download PDF' }))
    expect(await screen.findByText(/Downloaded Giulia-Rossi-Resume\.pdf/)).toBeInTheDocument()
  })

  it('points out a missing name, then lets the person download anyway without asking again', async () => {
    const user = userEvent.setup()
    renderWithDraft('')
    await user.click(screen.getByRole('button', { name: 'Download PDF' }))
    expect(screen.getByRole('dialog', { name: 'Before you download' })).toHaveAccessibleDescription('Your name is empty.')

    await user.click(screen.getByRole('button', { name: 'Download anyway' }))
    await user.click(screen.getByRole('button', { name: 'Download PDF' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(renderPdf.renderResumePdf).toHaveBeenCalledTimes(2)
  })

  it('suggests a font that prints them, when there is one', async () => {
    renderWithDraft('Γιώργος', 'nunito-sans')
    await userEvent.click(screen.getByRole('button', { name: 'Download PDF' }))
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription(/Source Sans can print them: choose it under Style\./)
  })
})
