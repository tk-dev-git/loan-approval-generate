// nuxt.config.ts
export default defineNuxtConfig({
  devtools: { enabled: true },
  css: [
    'vuetify/lib/styles/main.sass',
    '@mdi/font/css/materialdesignicons.css',
    '~/assets/styles/main.scss'
  ],
  build: {
    transpile: ['vuetify'],
  },
  modules: [
    '@nuxtjs/google-fonts',
    '@vueuse/nuxt'
    // '@nuxtjs/keycloak'
  ],
  googleFonts: {
    families: {
      'Be+Vietnam+Pro': [400, 500, 700, 900],
      'Noto+Sans': [400, 500, 700, 900]
    },
    display: 'swap'
  },
  keycloak: {
    url: process.env.KEYCLOAK_URL || 'http://localhost:8080',
    realm: process.env.KEYCLOAK_REALM || 'your-realm',
    clientId: process.env.KEYCLOAK_CLIENT_ID || 'your-client-id',
    redirectUri: process.env.KEYCLOAK_REDIRECT_URI || 'http://localhost:3000'
  },
  runtimeConfig: {
    // Private keys (only available on server-side)
    difyApiKey: process.env.DIFY_API_KEY,
    difyApiBaseUrl: process.env.DIFY_API_BASE_URL || 'https://api.dify.ai/v1',
    difyWorkflowApiEndpoint: process.env.DIFY_WORKFLOW_API_ENDPOINT || 'https://api.dify.ai/v1/workflows/run',
    // Public keys (exposed to client-side)
    public: {
      
    }
  }
})