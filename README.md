# Resumy

A free, open-source resume builder that runs entirely in your browser. Upload the resume you already have or start from a blank page, edit it in place, and download a PDF that applicant tracking systems (ATS) can read.

- **Free, for good.** No accounts, no ads, no paywalled templates.
- **Private by design.** Your resume never leaves your browser: PDFs are read and written on your device, and the draft is saved only in this browser's storage.
- **ATS-friendly.** Every template is a single column of real, selectable text with standard headings, embedded Unicode fonts and no ligatures, so parsers read it in the right order.

## Features

- **Two ways to start:** upload an existing PDF (validated by its `%PDF-` signature, up to 10 MB) or create an empty resume.
- **PDF import:** text is extracted with pdf.js and mapped to name, contact details, summary, experience, education, skills, languages and any other section. Headings are recognised in English, Italian, Spanish, French and German.
- **Edit in place:** type directly on the page, rename sections, add bullet lists, and drag entries, bullets or skills between sections. One photo is optional.
- **Customize:** five templates (Professional, Classic, Modern, Compact, Elegant), accent colors, five self-hosted fonts, text size, A4 or US Letter, and section order and visibility.
- **Download a PDF** at any time from the right side of the header.
- **Undo and redo**, autosave, and light and dark themes.

## Getting started

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Starts the Vite dev server |
| `npm run build` | Type-checks and builds to `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm test` | Runs the unit and integration tests (Vitest) |
| `npm run lint` | Lints with oxlint |
| `npm run deploy` | Builds and deploys to Firebase Hosting |

## Analytics and deployment

The app is hosted on Firebase Hosting (project `resumy-4464b`, see `.firebaserc`). `firebase.json` sets up the single-page-app rewrite, long-lived caching for hashed assets and security headers, including a Content-Security-Policy that only allows the app itself plus Firebase Analytics.

Anonymous usage counts (page views, new resumes, uploads and downloads) go to Firebase Analytics; resume content is never sent. Advertising features are off, and visitors who send Global Privacy Control or Do Not Track are not tracked. To enable it, copy `.env.example` to `.env.local` and fill in the web app config from the Firebase console (*Project settings → Your apps*). Analytics stays off while the API key, app ID or measurement ID are missing.

```bash
npm install -g firebase-tools
firebase login
npm run deploy
```

## How it works

```
src/
├── app/            App shell, minimal History API router, theme
├── components/     Reusable UI: Button, Dialog, Drawer, Menu, Toast…
├── features/
│   ├── home/       Start page: upload or start from scratch
│   ├── editor/     Editor page, side panels and the editable sheet (drag and drop)
│   ├── import/     PDF validation, text extraction (pdf.js) and resume parsing
│   ├── export/     PDF rendering with react-pdf
│   └── resume/     The resume model, templates, state with undo history, storage
├── lib/            Small utilities (analytics, contrast, storage…)
└── styles/         Design tokens and global styles
```

- **One model, two renderers.** Templates are plain data (`features/resume/design/templates.ts`). The editable sheet and the PDF read the same resolved sizes and colors, so the preview matches the download.
- **State** lives in a reducer with an undo history. New ids are created outside the reducer, which keeps it pure. Drag and drop previews moves locally and commits a single action on drop.
- **Heavy code loads on demand:** pdf.js loads when you upload, react-pdf when you download, and the editor when you open it.
- **Round-trip tests** render resumes in every template to PDF, then parse them back. This checks both the exported text and the importer.

## Design

The visual design system ("Herbarium": calm, organic, like a botanist's notebook) lives in `src/styles/tokens.css`, the only place where interface colors are defined. Components use plain CSS Modules, Nunito Sans and lucide icons. `src/styles/tokens.test.ts` checks that every text and background pair in use meets WCAG AA, in both themes. Resume accent colors live in `features/resume/design/palette.ts` and are tested against white paper, because they are embedded in the PDF.

## License

[MIT](LICENSE). 

Made with love by [cecinuga](https://github.com/cecinuga).
