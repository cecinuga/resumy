import type { CSSProperties } from 'react'
import { RESUME_INK } from '../../resume/design/palette'
import { TEMPLATES, type TemplateSpec } from '../../resume/design/templates'
import { useResume, useResumeActions } from '../../resume/state/context'
import styles from './Panels.module.css'

export function TemplatesPanel() {
  const { design } = useResume()
  const { dispatch } = useResumeActions()

  return (
    <div className={styles.panel}>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Template</legend>
        <p className={styles.hint}>
          Every template is a single column of real text, the layout applicant tracking systems read best.
        </p>
        <div className={styles.templateGrid}>
          {TEMPLATES.map((template) => (
            <label key={template.id} className={styles.option}>
              <input
                type="radio"
                name="template"
                value={template.id}
                checked={design.template === template.id}
                onChange={() => dispatch({ type: 'design/template', template: template.id })}
              />
              <TemplateThumbnail template={template} />
              <span className={styles.optionName}>{template.name}</span>
              <span className={styles.optionHint}>{template.description}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  )
}

/** A miniature page sketching the template's layout. */
function TemplateThumbnail({ template }: { template: TemplateSpec }) {
  const accent = template.defaults.accent
  const style = {
    '--thumb-accent': template.heading.color === 'accent' ? accent : RESUME_INK.text,
    '--thumb-name': template.header.nameColor === 'accent' ? accent : RESUME_INK.text,
  } as CSSProperties
  return (
    <div className={styles.thumb} style={style} data-align={template.header.align} data-heading={template.heading.decoration} aria-hidden>
      <span className={styles.thumbName} />
      <span className={styles.thumbContact} />
      {[0, 1, 2].map((section) => (
        <div key={section} className={styles.thumbSection}>
          <span className={styles.thumbHeading} />
          <span className={styles.thumbText} />
          <span className={styles.thumbText} />
          <span className={styles.thumbText} />
        </div>
      ))}
    </div>
  )
}
