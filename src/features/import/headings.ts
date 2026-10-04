import type { SectionPresetId } from '../resume/model/sectionPresets'

/** A section type, or 'contact' for blocks of contact details that belong in the header. */
export type HeadingKind = SectionPresetId | 'contact'

/**
 * Section headings found in real resumes, by section type, in English,
 * Italian, Spanish, French and German. Matching ignores case, accents and
 * punctuation.
 */
const HEADING_ALIASES: Record<HeadingKind, readonly string[]> = {
  summary: [
    'summary', 'professional summary', 'career summary', 'executive summary', 'profile', 'professional profile',
    'personal profile', 'about', 'about me', 'objective', 'career objective', 'personal statement', 'overview',
    'profilo', 'profilo professionale', 'profilo personale', 'sommario', 'chi sono', 'presentazione', 'obiettivo',
    'obiettivi', 'obiettivo professionale', 'resumen', 'resumen profesional', 'perfil', 'perfil profesional',
    'sobre mi', 'acerca de mi', 'profil', 'profil professionnel', 'a propos', 'a propos de moi',
    'uber mich', 'kurzprofil', 'zusammenfassung',
  ],
  experience: [
    'experience', 'experiences', 'work experience', 'professional experience', 'relevant experience',
    'employment', 'employment history', 'work history', 'career history', 'career', 'professional background',
    'esperienza', 'esperienze', 'esperienza lavorativa', 'esperienze lavorative', 'esperienza professionale',
    'esperienze professionali', 'percorso professionale', 'experiencia', 'experiencia laboral',
    'experiencia profesional', 'experience professionnelle', 'experiences professionnelles', 'parcours professionnel',
    'berufserfahrung', 'erfahrung', 'beruflicher werdegang', 'werdegang',
  ],
  education: [
    'education', 'academic background', 'education and training', 'training and education', 'academic history',
    'qualifications', 'academic qualifications', 'studies', 'istruzione', 'formazione', 'istruzione e formazione',
    'formazione accademica', 'percorso di studi', 'titoli di studio', 'studi', 'educacion', 'formacion',
    'formacion academica', 'estudios', 'formation', 'etudes', 'parcours academique', 'ausbildung', 'bildung',
    'bildungsweg', 'studium',
  ],
  skills: [
    'skills', 'technical skills', 'key skills', 'core skills', 'core competencies', 'competencies', 'competences',
    'skills and abilities', 'skills and tools', 'skills and competencies', 'hard skills', 'soft skills', 'tools',
    'technologies', 'tech stack', 'technical expertise', 'expertise', 'areas of expertise', 'abilities',
    'competenze', 'competenze tecniche', 'competenze professionali', 'competenze digitali', 'competenze trasversali',
    'competenze informatiche', 'capacita e competenze', 'abilita', 'conoscenze', 'conoscenze informatiche',
    'habilidades', 'competencias', 'conocimientos', 'aptitudes', 'competences techniques', 'savoir faire',
    'kenntnisse', 'fahigkeiten', 'kompetenzen', 'it kenntnisse',
  ],
  projects: [
    'projects', 'personal projects', 'selected projects', 'side projects', 'key projects', 'academic projects',
    'portfolio', 'progetti', 'progetti personali', 'proyectos', 'projets', 'projekte',
  ],
  certifications: [
    'certifications', 'certification', 'certificates', 'licenses', 'licenses and certifications',
    'licenses certifications', 'courses', 'courses and certifications', 'training', 'certificazioni',
    'certificati', 'corsi', 'corsi di formazione', 'corsi e certificazioni', 'certificaciones', 'cursos',
    'zertifikate', 'zertifizierungen', 'weiterbildung',
  ],
  languages: [
    'languages', 'language skills', 'language', 'lingue', 'lingue straniere', 'conoscenze linguistiche',
    'competenze linguistiche', 'idiomas', 'langues', 'competences linguistiques', 'sprachen', 'sprachkenntnisse',
  ],
  volunteering: [
    'volunteering', 'volunteer experience', 'volunteer work', 'volunteer', 'community involvement', 'volontariato',
    'esperienze di volontariato', 'voluntariado', 'benevolat', 'ehrenamt', 'ehrenamtliches engagement',
  ],
  awards: [
    'awards', 'honors', 'honours', 'achievements', 'awards and honors', 'awards and achievements', 'honors and awards',
    'accomplishments', 'premi', 'riconoscimenti', 'premi e riconoscimenti', 'risultati', 'premios', 'logros',
    'distinctions', 'prix', 'auszeichnungen',
  ],
  publications: [
    'publications', 'papers', 'research', 'research and publications', 'talks', 'pubblicazioni', 'publicaciones',
    'publikationen', 'veroffentlichungen',
  ],
  interests: [
    'interests', 'hobbies', 'hobbies and interests', 'interests and hobbies', 'personal interests', 'interessi',
    'hobby', 'hobby e interessi', 'interessi personali', 'tempo libero', 'intereses', 'aficiones',
    'centres d interet', 'loisirs', 'interessen', 'hobbys',
  ],
  custom: [
    'references', 'referenze', 'referencias', 'additional information', 'informazioni aggiuntive',
    'ulteriori informazioni', 'other', 'altro', 'activities', 'extracurricular activities', 'leadership',
    'leadership and activities', 'attivita', 'memberships', 'affiliations', 'associazioni', 'patente',
    'driving license',
  ],
  contact: [
    'contact', 'contacts', 'contact information', 'contact details', 'personal information', 'personal details',
    'personal data', 'contatti', 'recapiti', 'informazioni personali', 'dati personali', 'contacto',
    'datos personales', 'coordonnees', 'informations personnelles', 'kontakt', 'personliche daten',
  ],
}

/** Lowercase, no accents, no punctuation, single spaces: "Work Experience:" -> "work experience". */
export function normalizeHeading(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

const HEADING_INDEX: ReadonlyMap<string, HeadingKind> = new Map(
  (Object.entries(HEADING_ALIASES) as [HeadingKind, readonly string[]][]).flatMap(([kind, aliases]) =>
    aliases.map((alias) => [normalizeHeading(alias), kind] as const),
  ),
)

/** The section type a heading names, or null when the text is not a known heading. */
export function matchHeading(text: string): HeadingKind | null {
  return HEADING_INDEX.get(normalizeHeading(text)) ?? null
}
