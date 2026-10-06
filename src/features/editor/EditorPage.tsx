import {
  Check,
  CircleAlert,
  Ellipsis,
  Eye,
  FileText,
  LayoutTemplate,
  ListOrdered,
  LoaderCircle,
  MonitorDown,
  Palette,
  PenLine,
  ScanSearch,
  Redo2,
  Trash2,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import { useInstallApp } from '../../app/install'
import { useCallback, useEffect, useId, useState, type CSSProperties } from 'react'
import { navigate } from '../../app/router'
import { Button } from '../../components/Button/Button'
import { Dialog } from '../../components/Dialog/Dialog'
import { Drawer } from '../../components/Drawer/Drawer'
import { MenuButton, type MenuItem } from '../../components/Menu/MenuButton'
import { useToast } from '../../components/Toast/toast'
import { SegmentedControl } from '../../components/SegmentedControl/SegmentedControl'
import { useMediaQuery } from '../../lib/useMediaQuery'
import '../resume/design/fontFaces'
import { PAPER_SIZES } from '../resume/design/paper'
import { DownloadButton } from '../export/DownloadButton'
import { useResume, useResumeActions, useResumeState } from '../resume/state/context'
import styles from './EditorPage.module.css'
import { clearImportReview, peekImportReview, ReviewContext } from './importReview'
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
const NOTHING_TO_REVIEW = new Map()

export default function EditorPage() {
  const resume = useResume()
  const { canUndo, canRedo, saving, saveFailed } = useResumeState()
  const { undo, redo, load } = useResumeActions()
  const isWide = useMediaQuery(WIDE_SCREEN)
  const [panel, setPanel] = useState<PanelId | null>(() =>
    window.matchMedia('(min-width: 1280px)').matches ? 'templates' : null,
  )
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [pageCount, setPageCount] = useState(1)
  const installApp = useInstallApp()
  const toast = useToast()
  // What to point out after an upload; read once, as the editor opens.
  const [review, setReview] = useState(peekImportReview)
  const panelId = useId()
  useUndoShortcuts(undo, redo)

  useEffect(() => {
    clearImportReview()
    if (review?.source === 'resumy') toast({ message: 'Your resume is back exactly as you made it in Resumy.' })
    // Only as the editor opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
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
        {isWide ? (
          <>
            <div className={styles.railSpacer} />
            <button type="button" className={styles.railItem} onClick={() => setConfirmingReset(true)}>
              <Trash2 aria-hidden />
              <span>Start over</span>
            </button>
          </>
        ) : (
          // Less common actions, kept away from the tools and from Undo.
          <MenuButton
            variant="quiet"
            iconOnly
            icon={Ellipsis}
            label="More actions"
            align="end"
            items={[
              ...(installApp ? [{ id: 'install', label: 'Install app', hint: 'Use Resumy like any other app, offline too', icon: MonitorDown, onSelect: installApp }] : []),
              { id: 'reset', label: 'Start over', hint: 'Delete this resume from the browser', icon: Trash2, onSelect: () => setConfirmingReset(true) },
            ] satisfies MenuItem[]}
          />
        )}
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
          <div className={styles.facts}>
            <p
              className={styles.fact}
              title={pageCount > 1 ? `The PDF will have ${pageCount} pages. Preview shows where each one starts.` : 'Everything fits on one page.'}
            >
              <FileText aria-hidden />
              {pageCount > 1 ? `${pageCount} pages` : '1 page'}
            </p>
            <SaveStatus saving={saving} failed={saveFailed} />
          </div>
          {/* Right where the person checks the result; the header keeps the primary one. */}
          {mode === 'preview' && <DownloadButton variant="secondary" />}
        </div>
        {review?.source === 'layout' && (
          <div className={styles.notice} role="status">
            <ScanSearch aria-hidden />
            <p>
              We filled this in from your PDF. Layouts made with other tools don't always come through cleanly, so give it a
              quick read before you download
              {review.flagged.size > 0
                ? `, starting with the ${review.flagged.size === 1 ? 'entry' : `${review.flagged.size} entries`} marked “Check this”.`
                : '.'}
            </p>
            <Button variant="quiet" size="sm" onClick={() => setReview(null)}>
              Done
            </Button>
          </div>
        )}
        <ReviewContext.Provider value={review?.flagged ?? NOTHING_TO_REVIEW}>
          <Sheet resume={resume} editing={mode === 'edit'} onPageCount={setPageCount} />
        </ReviewContext.Provider>
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

/**
 * Whether the latest edits are stored. Only a failure is announced to
 * screen readers: "Saving…" and "Saved" alternate with every pause in typing.
 */
function SaveStatus({ saving, failed }: { saving: boolean; failed: boolean }) {
  const [Icon, long, short] = failed
    ? [CircleAlert, 'Not saved: browser storage is full or turned off', 'Not saved']
    : saving
      ? [LoaderCircle, 'Saving…', 'Saving…']
      : [Check, 'Saved in this browser', 'Saved']
  return (
    <p className={styles.fact} data-failed={failed || undefined}>
      <Icon aria-hidden />
      <span className={styles.long}>{long}</span>
      <span className={styles.short}>{short}</span>
      {failed && (
        <span role="alert" className="visually-hidden">
          Your changes aren't being saved: browser storage is full or turned off.
        </span>
      )}
    </p>
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
