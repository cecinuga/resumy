import type { LucideIcon } from 'lucide-react'
import { useId } from 'react'
import styles from './SegmentedControl.module.css'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
}

interface SegmentedControlProps<T extends string> {
  legend: string
  hideLegend?: boolean
  value: T
  options: readonly SegmentedOption<T>[]
  onChange: (value: T) => void
}

/** A compact single choice, built on native radio buttons. */
export function SegmentedControl<T extends string>({
  legend,
  hideLegend = false,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  const name = useId()
  return (
    <fieldset className={styles.fieldset}>
      <legend className={hideLegend ? 'visually-hidden' : styles.legend}>{legend}</legend>
      <div className={styles.track}>
        {options.map(({ value: optionValue, label, icon: Icon }) => (
          <label key={optionValue} className={styles.option}>
            <input
              type="radio"
              className={styles.input}
              name={name}
              value={optionValue}
              checked={optionValue === value}
              onChange={() => onChange(optionValue)}
            />
            <span className={styles.label}>
              {Icon && <Icon aria-hidden />}
              {label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
