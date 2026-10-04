import { Camera, ImageUp, Plus, Trash2 } from 'lucide-react'
import { memo, useRef } from 'react'
import { Button } from '../../../components/Button/Button'
import { useToast } from '../../../components/Toast/toast'
import type { ResolvedDesign } from '../../resume/design/resolve'
import { createItem } from '../../resume/model/factories'
import type { Basics, BasicsTextField } from '../../resume/model/types'
import { useResumeActions } from '../../resume/state/context'
import { EditableText } from './EditableText'
import { fieldIds, focusField } from './focus'
import { processPhoto } from './photo'
import styles from './Sheet.module.css'

const CONTACT_FIELDS: { field: BasicsTextField; label: string; placeholder: string }[] = [
  { field: 'email', label: 'Email', placeholder: 'Email' },
  { field: 'phone', label: 'Phone', placeholder: 'Phone' },
  { field: 'location', label: 'Location', placeholder: 'City, country' },
]

/** Name, title, contact details and photo, edited in place. */
export const HeaderEditor = memo(function HeaderEditor({ basics, design }: { basics: Basics; design: ResolvedDesign }) {
  const { dispatch } = useResumeActions()
  const toast = useToast()
  const photoInput = useRef<HTMLInputElement>(null)
  const set = (field: BasicsTextField) => (value: string) => dispatch({ type: 'basics/set', field, value })

  const addLink = () => {
    const item = createItem()
    dispatch({ type: 'link/add', item })
    focusField(fieldIds.link(item.id))
  }

  const removeLink = (index: number) => {
    const link = basics.links[index]
    if (!link) return
    dispatch({ type: 'link/remove', id: link.id })
    const previous = basics.links[index - 1]
    focusField(previous ? fieldIds.link(previous.id) : fieldIds.basics('location'))
  }

  const applyPhoto = async (file: File) => {
    try {
      dispatch({ type: 'basics/photo', photo: await processPhoto(file) })
    } catch {
      toast({ message: "That image couldn't be used. Please choose a JPEG, PNG or WebP photo." })
    }
  }

  return (
    <header className={styles.header}>
      {basics.photo && (
        <div className={styles.photoSlot}>
          <img className={styles.photo} src={basics.photo} alt="Portrait" />
          <div className={styles.photoActions}>
            <button type="button" className={styles.iconTool} onClick={() => photoInput.current?.click()} aria-label="Change photo" title="Change photo">
              <ImageUp aria-hidden />
            </button>
            <button
              type="button"
              className={styles.iconTool}
              onClick={() => dispatch({ type: 'basics/photo', photo: null })}
              aria-label="Remove photo"
              title="Remove photo"
            >
              <Trash2 aria-hidden />
            </button>
          </div>
        </div>
      )}
      <div className={styles.identity}>
        <EditableText
          as="h2"
          className={styles.name}
          value={basics.name}
          onChange={set('name')}
          label="Full name"
          placeholder="Your name"
          fieldId={fieldIds.basics('name')}
        />
        <EditableText
          as="p"
          className={styles.headline}
          value={basics.headline}
          onChange={set('headline')}
          label="Professional title"
          placeholder="Professional title"
          fieldId={fieldIds.basics('headline')}
        />
        <div className={styles.contacts}>
          {CONTACT_FIELDS.map(({ field, label, placeholder }) => (
            <span key={field} className={styles.contact}>
              <EditableText
                value={basics[field]}
                onChange={set(field)}
                label={label}
                placeholder={placeholder}
                fieldId={fieldIds.basics(field)}
              />
            </span>
          ))}
          {basics.links.map((link, index) => (
            <span key={link.id} className={styles.contact}>
              <EditableText
                value={link.text}
                onChange={(text) => dispatch({ type: 'link/set', id: link.id, text })}
                label="Website or profile"
                placeholder="linkedin.com/in/you"
                fieldId={fieldIds.link(link.id)}
                onEnter={addLink}
                onDeleteEmpty={() => removeLink(index)}
              />
            </span>
          ))}
          <Button variant="page" size="sm" icon={Plus} onClick={addLink}>
            Add link
          </Button>
        </div>
      </div>
      {design.template.header.divider && <div className={styles.divider} />}
      {!basics.photo && (
        <div className={styles.headerTools}>
          <Button variant="page" size="sm" icon={Camera} onClick={() => photoInput.current?.click()}>
            Add photo
          </Button>
        </div>
      )}
      <input
        ref={photoInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void applyPhoto(file)
        }}
      />
    </header>
  )
})
