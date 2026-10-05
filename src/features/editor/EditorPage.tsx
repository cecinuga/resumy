import { Check, CircleAlert, Eye, LayoutTemplate, ListOrdered, Palette, PenLine, Redo2, RotateCcw, Undo2, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useId, useState, type CSSProperties } from 'react'
import { navigate } from '../../app/router'
import { Button } from '../../components/Button/Button'
import { Dialog } from '../../components/Dialog/Dialog'
import { Drawer } from '../../components/Drawer/Drawer'
import { SegmentedControl } from '../../components/SegmentedControl/SegmentedControl'
import { useMediaQuery } from '../../lib/useMediaQuery'
import '../resume/design/fontFaces'
import { PAPER_SIZES } from '../resume/design/paper'
import { useResume, useResumeActions, useResumeState } from '../resume/state/context'
import styles from './EditorPage.module.css'
import { SectionsPanel } from './panels/SectionsPanel'
import { StylePanel } from './panels/StylePanel'
import { TemplatesPanel } from './panels/TemplatesPanel'
import { Sheet } from './sheet/Sheet'

type PanelId = 'templates' | 'style' | 'sections'

const PANELS: { id: PanelId; label: string; icon: LucideIcon }[] = [
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'style', label: 'Style', icon: Palette },
  { id: 'sections', label: 'Sections', icon: ListOrdered },
]

const WIDE_SCREEN = '(min-width: 1080px)'

export default function EditorPage() {
  const resume = useResume()
  const { canUndo, canRedo, saveFailed } = useResumeState()
  const { undo, redo, load } = useResumeActions()
  const isWide = useMediaQuery(WIDE_SCREEN)
  const [panel, setPanel] = useState<PanelId | null>(() =>
    window.matchMedia('(min-width: 1280px)').matches ? 'templates' : null,
  )
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [confirmingReset, setConfirmingReset] = useState(false)
  const panelId = useId()
  useUndoShortcuts(undo, redo)
  // On narrow screens the drawer closes so the new section is in view.
  const onSectionAdded = useCallback(() => {
    if (!isWide) setPanel(null)
  }, [isWide])

  // Each panel gets only what it shows, so typing on the sheet doesn't re-render it.
  const activePanel = PANELS.find(({ id }) => id === panel)
  const panelContent =
    panel === 'templates' ? (
      <TemplatesPanel current={resume.design.template} />
    ) : panel === 'style' ? (
      <StylePanel design={resume.design} />
    ) : panel === 'sections' ? (
      <SectionsPanel sections={resume.sections} onSectionAdded={onSectionAdded} />
    ) : null

  return (
    <div className={styles.editor}>
      <h1 className="visually-hidden">Resume editor</h1>
      <nav className={styles.rail} aria-label="Editor tools">
        {PANELS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={styles.railItem}
            aria-expanded={panel === id}
            aria-controls={panel === id ? panelId : undefined}
            onClick={() => setPanel((current) => (current === id ? null : id))}
          >
            <Icon aria-hidden />
            <span>{label}</span>
          </button>
        ))}
        <div className={styles.railSpacer} />
        <button type="button" className={styles.railItem} onClick={() => setConfirmingReset(true)}>
          <RotateCcw aria-hidden />
          <span>Start over</span>
        </button>
      </nav>

      {isWide && activePanel && (
        <aside id={panelId} className={styles.panel} aria-label={activePanel.label}>
          <h2 className={styles.panelTitle}>{activePanel.label}</h2>
          {panelContent}
        </aside>
      )}
      {!isWide && (
        <Drawer open={activePanel !== undefined} onClose={() => setPanel(null)} title={activePanel?.label ?? ''}>
          <div id={panelId}>{panelContent}</div>
        </Drawer>
      )}

      <div className={styles.canvas} style={{ '--paper-width': `${PAPER_SIZES[resume.design.paper].width}pt` } as CSSProperties}>
        <div className={styles.toolbar}>
          <div className={styles.history}>
            <Button variant="quiet" iconOnly icon={Undo2} onClick={undo} disabled={!canUndo}>
              Undo
            </Button>
            <Button variant="quiet" iconOnly icon={Redo2} onClick={redo} disabled={!canRedo}>
              Redo
            </Button>
          </div>
          <SegmentedControl
            legend="View"
            hideLegend
            value={mode}
            onChange={setMode}
            options={[
              { value: 'edit', label: 'Edit', icon: PenLine },
              { value: 'preview', label: 'Preview', icon: Eye },
            ]}
          />
          <p className={styles.status} data-failed={saveFailed || undefined} role="status">
            {saveFailed ? <CircleAlert aria-hidden /> : <Check aria-hidden />}
            <span>{saveFailed ? 'Not saved: browser storage is full or turned off' : 'Saved in this browser'}</span>
          </p>
        </div>
        <Sheet resume={resume} editing={mode === 'edit'} />
      </div>

      <Dialog
        open={confirmingReset}
        onClose={() => setConfirmingReset(false)}
        title="Start over?"
        description="This deletes the resume saved in this browser. Download a PDF first if you want to keep a copy."
        actions={
          <>
            <Button variant="quiet" onClick={() => setConfirmingReset(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setConfirmingReset(false)
                load(null)
                navigate('home')
              }}
            >
              Delete and start over
            </Button>
          </>
        }
      />
    </div>
  )
}

/** Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z (or Ctrl+Y) outside text fields, which keep their own undo. */
function useUndoShortcuts(undo: () => void, redo: () => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable || target?.closest('input, textarea, select')) return
      const key = event.key.toLowerCase()
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])
}
