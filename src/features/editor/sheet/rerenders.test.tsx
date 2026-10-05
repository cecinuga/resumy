import { fireEvent, render, renderHook, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../../components/Toast/ToastProvider'
import { sampleResume } from '../../../test/sampleResume'
import { useResume } from '../../resume/state/context'
import { ResumeProvider } from '../../resume/state/ResumeProvider'
import { Sheet } from './Sheet'
import { useStableIds, type DragData } from './sortable'

// Counts the renders of each draggable element (block, bullet, tag) by id.
const renders = vi.hoisted(() => new Map<string, number>())
vi.mock('./sortable', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./sortable')>()
  return {
    ...actual,
    useSortableNode: (id: string, data: DragData) => {
      renders.set(id, (renders.get(id) ?? 0) + 1)
      return actual.useSortableNode(id, data)
    },
  }
})

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

/** Types into a field the way the browser does: the text changes, then an input event. */
const typeInto = (field: HTMLElement, text: string) => {
  field.textContent = text
  fireEvent.input(field)
}

const fieldId = (field: HTMLElement) => field.dataset.field?.replace(/^item:/, '')

describe('re-renders while typing', () => {
  beforeEach(() => renders.clear())

  it('re-renders only the bullet being edited and its entry', () => {
    openEditor()
    const bullets = screen.getAllByRole('textbox', { name: 'Bullet point' })
    expect(renders.size).toBeGreaterThan(bullets.length)
    const bullet = bullets[1]!
    renders.clear()

    typeInto(bullet, 'Led the migration to strict TypeScript')
    expect(bullet).toHaveTextContent('Led the migration to strict TypeScript')
    // The bullet and the entry that holds it; every other block, bullet and tag is left alone.
    expect(renders.size).toBe(2)
    expect(renders.has(fieldId(bullet)!)).toBe(true)
  })

  it('re-renders no block, bullet or tag when the header changes', () => {
    openEditor()
    renders.clear()
    typeInto(screen.getByRole('textbox', { name: 'Full name' }), 'Ada Lovelace')
    expect(renders.size).toBe(0)
  })
})

describe('useStableIds', () => {
  it('keeps the same array while the ids stay the same', () => {
    const { result, rerender } = renderHook(({ list }) => useStableIds(list), {
      initialProps: { list: [{ id: 'a' }, { id: 'b' }] },
    })
    const first = result.current
    expect(first).toEqual(['a', 'b'])

    rerender({ list: [{ id: 'a' }, { id: 'b' }] })
    expect(result.current).toBe(first)

    rerender({ list: [{ id: 'b' }, { id: 'a' }] })
    expect(result.current).toEqual(['b', 'a'])
    rerender({ list: [] })
    expect(result.current).toEqual([])
  })
})
