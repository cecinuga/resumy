import { describe, expect, it } from 'vitest'
import { guessLanguage } from './language'

describe('guessLanguage', () => {
  it('tells the languages Resumy reads apart by their common words', () => {
    expect(guessLanguage('Led the migration of a codebase to TypeScript and mentored five engineers')).toBe('en')
    expect(guessLanguage('Sviluppato un design system per la banca e gestito il team di sviluppo')).toBe('it')
    expect(guessLanguage('Entwicklung der Plattform und Betreuung von Kunden mit dem Team')).toBe('de')
    expect(guessLanguage('Desarrollo de la plataforma y gestión del equipo para los clientes')).toBe('es')
    expect(guessLanguage('Développement de la plateforme et gestion des équipes pour les clients')).toBe('fr')
  })

  it('falls back to English', () => {
    expect(guessLanguage('TypeScript, React, Node.js')).toBe('en')
  })
})
