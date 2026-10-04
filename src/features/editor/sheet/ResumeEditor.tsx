import { ListPlus } from 'lucide-react'
import { MenuButton } from '../../../components/Menu/MenuButton'
import type { ResolvedDesign } from '../../resume/design/resolve'
import { createSectionFromPreset } from '../../resume/model/factories'
import { SECTION_PRESETS } from '../../resume/model/sectionPresets'
import type { Resume } from '../../resume/model/types'
import { useResumeActions } from '../../resume/state/context'
import { SheetDnd } from './dnd'
import { fieldIds, focusField } from './focus'
import { HeaderEditor } from './HeaderEditor'
import { SectionEditor } from './SectionEditor'
import styles from './Sheet.module.css'

/** The resume in edit mode: every field editable in place, content draggable. */
export function ResumeEditor({ resume, design }: { resume: Resume; design: ResolvedDesign }) {
  const { dispatch } = useResumeActions()
  const datesRight = design.template.entry.datePlacement === 'right'

  const sectionMenu = SECTION_PRESETS.map((preset) => ({
    id: preset.id,
    label: preset.title,
    onSelect: () => {
      const section = createSectionFromPreset(preset.id)
      dispatch({ type: 'section/add', section })
      focusField(fieldIds.section(section.id))
    },
  }))

  return (
    <SheetDnd resume={resume}>
      {(current) => (
        <>
          <HeaderEditor basics={current.basics} design={design} />
          {current.sections.map((section, index) =>
            section.hidden ? null : (
              <SectionEditor key={section.id} section={section} index={index} datesRight={datesRight} />
            ),
          )}
          <div className={styles.addRow}>
            <MenuButton variant="page" size="sm" icon={ListPlus} label="Add section" items={sectionMenu} />
          </div>
        </>
      )}
    </SheetDnd>
  )
}
