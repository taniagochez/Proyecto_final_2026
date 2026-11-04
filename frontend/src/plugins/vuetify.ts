import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'

// Paleta pastel: rosado, verde y blanco
export default createVuetify({
  icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
  defaults: {
    VBtn: { rounded: 'xl', variant: 'flat' }, VCard: { rounded: 'xl', elevation: 2 },
    VChip: { variant: 'flat' }, VAlert: { variant: 'flat' } // fondo pastel + letra negra
  },
  theme: {
    defaultTheme: 'floreria',
    themes: {
      floreria: {
        dark: false,
        variables: { 'high-emphasis-opacity': 1, 'medium-emphasis-opacity': 0.85 },
        colors: {
          primary: '#F4A6C0', secondary: '#A8D8B9', background: '#FFFFFF', surface: '#FFFFFF',
          'surface-variant': '#FDF0F4', error: '#E88A9A', warning: '#F8DDA4', info: '#BFD9F2',
          'on-primary': '#000000', 'on-secondary': '#000000', 'on-warning': '#000000', 'on-error': '#000000',
          'on-info': '#000000', 'on-success': '#000000', 'on-surface': '#000000', 'on-background': '#000000',
          'on-surface-variant': '#000000'
        }
      }
    }
  }
})
