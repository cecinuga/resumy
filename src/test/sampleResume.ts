import {
  createEntry,
  createItem,
  createListBlock,
  createSection,
  createTagsBlock,
  createTextBlock,
} from '../features/resume/model/factories'
import type { Design, Resume } from '../features/resume/model/types'

export const sampleDesign: Design = {
  template: 'professional',
  font: 'source-sans',
  accent: '#3F5B45',
  textSize: 'medium',
  paper: 'a4',
}

/** A realistic two-job resume used across tests. */
export function sampleResume(design: Partial<Design> = {}): Resume {
  return {
    version: 1,
    basics: {
      name: 'Giulia Rossi',
      headline: 'Senior Frontend Engineer',
      email: 'giulia.rossi@example.com',
      phone: '+39 333 123 4567',
      location: 'Milan, Italy',
      links: [createItem('linkedin.com/in/giuliarossi'), createItem('github.com/giuliarossi')],
      photo: null,
    },
    sections: [
      createSection('Summary', [
        createTextBlock(
          'Frontend engineer with eight years of experience building accessible, fast web applications for fintech and e-commerce teams.',
        ),
      ]),
      createSection('Experience', [
        createEntry(
          { title: 'Senior Frontend Engineer', subtitle: 'Fintech Labs', date: 'Mar 2021 – Present', location: 'Milan, Italy' },
          [
            'Led the migration of a 200k-line codebase from JavaScript to strict TypeScript with zero downtime.',
            'Cut the checkout bundle size by 38% and improved conversion by 4% through code splitting.',
            'Mentored five engineers and introduced accessibility reviews to every release.',
          ],
        ),
        createEntry(
          { title: 'Frontend Developer', subtitle: 'ShopFast', date: 'Jan 2017 – Feb 2021', location: 'Turin, Italy' },
          [
            'Built the design system used by 12 product teams, with 60 documented components.',
            'Reduced page load time by 1.2 seconds on mobile by optimizing images and fonts.',
          ],
        ),
      ]),
      createSection('Education', [
        createEntry(
          { title: 'MSc in Computer Engineering', subtitle: 'Politecnico di Milano', date: '2014 – 2016', location: 'Milan, Italy' },
          [],
        ),
      ]),
      createSection('Skills', [
        createTagsBlock('Languages', ['TypeScript', 'JavaScript', 'CSS', 'HTML']),
        createTagsBlock('Tools', ['React', 'Vite', 'Node.js', 'Playwright']),
      ]),
      createSection('Certifications', [createListBlock(['AWS Certified Developer – Associate (2022)'])]),
      createSection('Languages', [createTagsBlock('', ['Italian (native)', 'English (C1)'])]),
    ],
    design: { ...sampleDesign, ...design },
  }
}
