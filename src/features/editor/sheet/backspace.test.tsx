import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../../components/Toast/ToastProvider'
import { sampleResume } from '../../../test/sampleResume'
import { useResume } from '../../resume/state/context'
import { ResumeProvider } from '../../resume/state/ResumeProvider'
import { backspaceAction } from './backspace'
import { Sheet } from './Sheet'

// The rule keeps the last press in module state; each test starts long after the previous one.
let now = 0
beforeEach(() => {
  now += 60_000
  vi.spyOn(performance, 'now').mockImplementation(() => now)
})

/** A Backspace press `ms` after the previous one. */
const pressAfter = (ms: number, isEmpty: boolean, canLeave = true) => {
  now += ms
  return backspaceAction(isEmpty, canLeave)
}

describe('backspaceAction', () => {
  it('deletes text, then stops at the empty field while the key is held', () => {
    expect(pressAfter(0, false)).toBe('delete')
    expect(pressAfter(40, false)).toBe('delete')
    expect(pressAfter(40, true)).toBe('stop')
    expect(pressAfter(40, true)).toBe('stop')
  })

  it('leaves an empty field on a new press, and does not delete in the next field in the same burst', () => {
    expect(pressAfter(0, true)).toBe('leave')
    expect(pressAfter(40, false)).toBe('stop')
    expect(pressAfter(300, false)).toBe('stop')
    expect(pressAfter(600, false)).toBe('delete')
    expect(pressAfter(40, false)).toBe('delete')
  })

  it('never leaves a field that cannot be left', () => {
    expect(pressAfter(0, true, false)).toBe('stop')
    expect(pressAfter(600, true, false)).toBe('stop')
    expect(pressAfter(600, false, false)).toBe('delete')
  })
})

describe('Backspace in the editor', () => {
  function EditableSheet() {
    return <Sheet resume={useResume()} editing />
  }
  const openEditor = () => {
    localStorage.setItem('resumy:draft', JSON.stringify({ savedAt: Date.now(), resume: sampleResume() }))
    render(
      <ToastProvider>
        <ResumeProvider>
          <EditableSheet />
        </ResumeProvider>
      </ToastProvider>,
    )
  }
  const links = () => screen.getAllByRole('textbox', { name: 'Website or profile' })

  it('removes an emptied link, but does not go on deleting the previous one', async () => {
    const user = userEvent.setup()
    openEditor()
    await user.click(screen.getByRole('button', { name: 'Add link' }))
    const added = links()[2]!
    added.textContent = 'x'

    // Holding Backspace: the last letter goes, then the empty field stays.
    expect(fireEvent.keyDown(added, { key: 'Backspace' })).toBe(true)
    added.textContent = ''
    now += 40
    expect(fireEvent.keyDown(added, { key: 'Backspace' })).toBe(false)
    expect(links()).toHaveLength(3)

    // A new press removes it; the key held on does not reach the previous link.
    now += 800
    expect(fireEvent.keyDown(added, { key: 'Backspace' })).toBe(false)
    expect(links()).toHaveLength(2)
    const previous = links()[1]!
    now += 40
    expect(fireEvent.keyDown(previous, { key: 'Backspace' })).toBe(false)
    expect(previous).toHaveTextContent('github.com/giuliarossi')

    // After a pause, Backspace deletes in the previous link again.
    now += 800
    expect(fireEvent.keyDown(previous, { key: 'Backspace' })).toBe(true)
  })

  it('stops soft keyboards that only report the deletion', async () => {
    const user = userEvent.setup()
    openEditor()
    await user.click(screen.getByRole('button', { name: 'Add link' }))

    fireEvent.keyDown(links()[2]!, { key: 'Unidentified', keyCode: 229 })
    expect(fireEvent(links()[2]!, deletion())).toBe(false)
    expect(links()).toHaveLength(2)

    now += 40
    fireEvent.keyDown(links()[1]!, { key: 'Unidentified', keyCode: 229 })
    expect(fireEvent(links()[1]!, deletion())).toBe(false)
    now += 800
    fireEvent.keyDown(links()[1]!, { key: 'Unidentified', keyCode: 229 })
    expect(fireEvent(links()[1]!, deletion())).toBe(true)
  })
})

function deletion() {
  return new InputEvent('beforeinput', { inputType: 'deleteContentBackward', bubbles: true, cancelable: true })
}
