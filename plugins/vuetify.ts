// plugins/vuetify.ts
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

export default defineNuxtPlugin((nuxtApp) => {
    const vuetify = createVuetify({
        components,
        directives,
        theme: {
            defaultTheme: 'customTheme',
            themes: {
                customTheme: {
                    dark: false,
                    colors: {
                        background: '#fcf9f8',
                        surface: '#fcf9f8',
                        primary: '#ff6b35',
                        secondary: '#f4eae6',
                        accent: '#a15d45',
                        error: '#ff6b35',
                        info: '#2196F3',
                        success: '#4CAF50',
                        warning: '#FB8C00',
                        'on-background': '#1d110c',
                        'on-surface': '#1d110c',
                        'border-light': '#f4eae6',
                        'border': '#ead5cd'
                    }
                }
            }
        }
    })

    nuxtApp.vueApp.use(vuetify)
})