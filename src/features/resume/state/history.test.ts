import { describe, expect, it } from 'vitest'
import { sampleResume } from '../../../test/sampleResume'
import { createItem, createTagsBlock } from '../model/factories'
import type { EntryBlock, Resume } from '../model/types'
import { createEditorState, editorReducer, type EditorState } from './history'
import { resumeReducer, type ResumeAction } from './reducer'

const edit = (state: EditorState, action: ResumeAction, at = 0): EditorState =>
  editorReducer(state, { type: 'edit', action, at })

const experience = (resume: Resume) => resume.sections[1]!
const job = (resume: Resume, index: number) => experience(resume).blocks[index] as EntryBlock

describe('resumeReducer moves', () => {
  it('moves a block to another section', () => {
    const resume = sampleResume()
    const moved = job(resume, 1)
    const education = resume.sections[2]!
    const next = resumeReducer(resume, { type: 'block/move', id: moved.id, toSectionId: education.id, toIndex: 0 })
    expect(experience(next).blocks.map((block) => block.id)).toEqual([job(resume, 0).id])
    expect(next.sections[2]!.blocks[0]?.id).toBe(moved.id)
  })

  it('reorders bullets and moves them between entries', () => {
    const resume = sampleResume()
    const [first, second] = [job(resume, 0), job(resume, 1)]
    const bullet = first.items[2]!
    const reordered = resumeReducer(resume, { type: 'item/move', id: bullet.id, toBlockId: first.id, toIndex: 0 })
    expect(job(reordered, 0).items[0]?.id).toBe(bullet.id)
    const moved = resumeReducer(resume, { type: 'item/move', id: bullet.id, toBlockId: second.id, toIndex: 1 })
    expect(job(moved, 0).items).toHaveLength(2)
    expect(job(moved, 1).items.map((item) => item.id)).toEqual([second.items[0]!.id, bullet.id, second.items[1]!.id])
  })

  it('does not drop a bullet into a tag group', () => {
    const resume = sampleResume()
    const tags = resume.sections[3]!.blocks[0]!
    const bullet = job(resume, 0).items[0]!
    expect(resumeReducer(resume, { type: 'item/move', id: bullet.id, toBlockId: tags.id, toIndex: 0 })).toBe(resume)
  })

  it('adds and removes sections at a given position', () => {
    const resume = sampleResume()
    const section = resume.sections[1]!
    const removed = resumeReducer(resume, { type: 'section/remove', id: section.id })
    const restored = resumeReducer(removed, { type: 'section/add', section, index: 1 })
    expect(restored.sections.map((entry) => entry.id)).toEqual(resume.sections.map((entry) => entry.id))
  })

  it('applies a template together with its font and color', () => {
    const next = resumeReducer(sampleResume(), { type: 'design/template', template: 'elegant' })
    expect(next.design).toMatchObject({ template: 'elegant', font: 'eb-garamond', accent: '#7A2E3A' })
  })

  it('only sets fields a block has', () => {
    const resume = sampleResume()
    const tags = createTagsBlock('Tools', ['Vim'])
    const withTags = resumeReducer(resume, { type: 'block/add', sectionId: resume.sections[0]!.id, block: tags })
    const next = resumeReducer(withTags, { type: 'block/set', id: tags.id, field: 'title', value: 'x' })
    expect(next.sections[0]!.blocks.at(-1)).not.toHaveProperty('title')
  })
})

describe('editorReducer history', () => {
  const start = () => createEditorState(sampleResume())

  it('groups quick typing in one field into a single undo step', () => {
    let state = start()
    state = edit(state, { type: 'basics/set', field: 'name', value: 'G' }, 0)
    state = edit(state, { type: 'basics/set', field: 'name', value: 'Gi' }, 300)
    state = edit(state, { type: 'basics/set', field: 'name', value: 'Gio' }, 600)
    expect(state.past).toHaveLength(1)
    state = editorReducer(state, { type: 'undo' })
    expect(state.resume?.basics.name).toBe('Giulia Rossi')
  })

  it('starts a new step after a pause or in another field', () => {
    let state = start()
    state = edit(state, { type: 'basics/set', field: 'name', value: 'A' }, 0)
    state = edit(state, { type: 'basics/set', field: 'name', value: 'AB' }, 5000)
    state = edit(state, { type: 'basics/set', field: 'email', value: 'a@b.co' }, 5100)
    expect(state.past).toHaveLength(3)
  })

  it('redoes what was undone and forgets it after a new edit', () => {
    let state = start()
    state = edit(state, { type: 'link/add', item: createItem('example.com') })
    state = editorReducer(state, { type: 'undo' })
    expect(state.resume?.basics.links).toHaveLength(2)
    state = editorReducer(state, { type: 'redo' })
    expect(state.resume?.basics.links).toHaveLength(3)
    state = editorReducer(state, { type: 'undo' })
    state = edit(state, { type: 'design/set', patch: { paper: 'letter' } })
    expect(state.future).toHaveLength(0)
  })

  it('ignores edits that change nothing and resets on load', () => {
    const state = start()
    const resume = state.resume!
    expect(edit(state, { type: 'section/rename', id: 'missing', title: 'x' })).toBe(state)
    expect(editorReducer(edit(state, { type: 'link/remove', id: resume.basics.links[0]!.id }), { type: 'load', resume: null })).toEqual(
      createEditorState(null),
    )
  })
})
