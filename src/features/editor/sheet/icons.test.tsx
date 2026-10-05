import { render } from '@testing-library/react'
import { GripVertical as LucideGrip, LucideProvider } from 'lucide-react'
import type { ComponentType } from 'react'
import { describe, expect, it } from 'vitest'
import { GripVertical } from './icons'

const renderIcon = (Icon: ComponentType<{ 'aria-hidden'?: boolean }>) =>
  render(
    <LucideProvider size={18} strokeWidth={1.5} absoluteStrokeWidth>
      <Icon aria-hidden />
    </LucideProvider>,
  ).container.querySelector('svg')!

const attributes = (svg: SVGElement) => Object.fromEntries([...svg.attributes].map(({ name, value }) => [name, value]))

describe('GripVertical', () => {
  it('has the attributes and classes of the lucide icon', () => {
    expect(attributes(renderIcon(GripVertical))).toEqual(attributes(renderIcon(LucideGrip)))
  })

  it('draws the six dots with one path instead of six circles', () => {
    const svg = renderIcon(GripVertical)
    expect(svg.children).toHaveLength(1)
    expect(svg.querySelector('path')?.getAttribute('d')?.match(/M/g)).toHaveLength(6)
    expect(renderIcon(LucideGrip).querySelectorAll('circle')).toHaveLength(6)
  })
})
