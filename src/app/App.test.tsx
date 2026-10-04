import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { sampleResume } from '../test/sampleResume'
import { App } from './App'

const savedDraft = () => JSON.parse(localStorage.getItem('resumy:draft') ?? 'null') as { resume: { basics: { name: string } } } | null

describe('App', () => {
  it('starts a new resume, saves it in the browser and offers to continue it', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'A calm place to write your resume' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Download PDF' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'New resume' }))
    const name = await screen.findByRole('textbox', { name: 'Full name' })
    expect(window.location.pathname).toBe('/editor')
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument()

    await user.click(name)
    await user.keyboard('Ada Lovelace')
    await waitFor(() => expect(savedDraft()?.resume.basics.name).toBe('Ada Lovelace'))

    await user.click(screen.getByRole('link', { name: 'Resumy, home' }))
    const draft = await screen.findByRole('region', { name: 'Resume in progress' })
    expect(within(draft).getByText('Ada Lovelace')).toBeInTheDocument()
  })

  it('asks before replacing a resume that has content', async () => {
    localStorage.setItem('resumy:draft', JSON.stringify({ savedAt: Date.now(), resume: sampleResume() }))
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'New resume' }))
    const dialog = screen.getByRole('dialog', { name: 'Replace your current resume?' })
    await user.click(within(dialog).getByRole('button', { name: 'Keep current resume' }))
    expect(window.location.pathname).toBe('/')

    await user.click(screen.getByRole('button', { name: 'New resume' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Replace it' }))
    expect(await screen.findByRole('textbox', { name: 'Full name' })).toHaveTextContent('')
  })

  it('switches between the editor and the print preview', async () => {
    localStorage.setItem('resumy:draft', JSON.stringify({ savedAt: Date.now(), resume: sampleResume() }))
    window.history.replaceState(null, '', '/editor')
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByRole('textbox', { name: 'Full name' })).toHaveTextContent('Giulia Rossi')
    await user.click(screen.getByRole('radio', { name: 'Preview' }))
    const sheet = screen.getByRole('article', { name: 'Resume' })
    expect(within(sheet).queryByRole('textbox')).not.toBeInTheDocument()
    expect(within(sheet).getByRole('heading', { name: 'Giulia Rossi' })).toBeInTheDocument()
    // Undo is disabled until something changes.
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    await act(async () => {})
  })
})
