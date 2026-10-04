import { CircleAlert } from 'lucide-react'
import type { CSSProperties } from 'react'
import { SegmentedControl } from '../../../components/SegmentedControl/SegmentedControl'
import { AA_TEXT, hexContrast } from '../../../lib/contrast'
import { fontStack, RESUME_FONTS } from '../../resume/design/fonts'
import { ACCENT_PRESETS, RESUME_INK } from '../../resume/design/palette'
import { PAPER_SIZES, TEXT_SIZES } from '../../resume/design/paper'
import type { Design, PaperSize, TextSize } from '../../resume/model/types'
import { useResume, useResumeActions } from '../../resume/state/context'
import styles from './Panels.module.css'

const TEXT_SIZE_OPTIONS = (Object.keys(TEXT_SIZES) as TextSize[]).map((value) => ({ value, label: TEXT_SIZES[value].label }))
const PAPER_OPTIONS = (Object.keys(PAPER_SIZES) as PaperSize[]).map((value) => ({ value, label: PAPER_SIZES[value].label }))

export function StylePanel() {
  const { design } = useResume()
  const { dispatch } = useResumeActions()
  const set = (patch: Partial<Design>) => dispatch({ type: 'design/set', patch })
  const isPreset = ACCENT_PRESETS.some((preset) => preset.value.toLowerCase() === design.accent.toLowerCase())
  const isReadable = hexContrast(design.accent, RESUME_INK.paper) >= AA_TEXT

  return (
    <div className={styles.panel}>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Accent color</legend>
        <div className={styles.swatches}>
          {ACCENT_PRESETS.map((preset) => (
            <label key={preset.value} className={styles.swatch} title={preset.name} style={{ '--swatch': preset.value } as CSSProperties}>
              <input
                type="radio"
                name="accent"
                value={preset.value}
                checked={design.accent.toLowerCase() === preset.value.toLowerCase()}
                onChange={() => set({ accent: preset.value })}
                aria-label={preset.name}
              />
              <span />
            </label>
          ))}
          <label className={styles.custom}>
            <input
              type="color"
              value={design.accent}
              onChange={(event) => set({ accent: event.target.value.toUpperCase() })}
              aria-label="Custom accent color"
            />
            {isPreset ? 'Custom' : design.accent}
          </label>
        </div>
        {!isReadable && (
          <p className={styles.warning} role="status">
            <CircleAlert aria-hidden />
            This color is hard to read on white paper. A darker shade will print more clearly.
          </p>
        )}
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Font</legend>
        <div className={styles.fonts}>
          {RESUME_FONTS.map((font) => (
            <label key={font.id} className={styles.fontOption} style={{ '--font-preview': fontStack(font) } as CSSProperties}>
              <input
                type="radio"
                name="font"
                value={font.id}
                checked={design.font === font.id}
                onChange={() => set({ font: font.id })}
              />
              <span className={styles.fontName}>{font.label}</span>
              <span className={styles.fontCategory}>{font.category === 'serif' ? 'Serif' : 'Sans serif'}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <SegmentedControl
        legend="Text size"
        value={design.textSize}
        options={TEXT_SIZE_OPTIONS}
        onChange={(textSize) => set({ textSize })}
      />
      <SegmentedControl legend="Paper" value={design.paper} options={PAPER_OPTIONS} onChange={(paper) => set({ paper })} />
    </div>
  )
}
