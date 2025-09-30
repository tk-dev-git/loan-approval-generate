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
  ],
  googleFonts: {
    families: {
      'Be+Vietnam+Pro': [400, 500, 700, 900],
      'Noto+Sans': [400, 500, 700, 900]
    },
    display: 'swap'
  },
  runtimeConfig: {
    // Private keys (only available on server-side)
    difyApiKey: process.env.DIFY_API_KEY,
    difyApiBaseUrl: process.env.DIFY_API_BASE_URL || 'https://api.dify.ai/v1',
    difyWorkflowApiEndpoint: process.env.DIFY_WORKFLOW_API_ENDPOINT || 'https://api.dify.ai/v1/workflows/run',
    // Public keys (exposed to client-side)
    public: {
      cognitoDomain: process.env.NUXT_PUBLIC_COGNITO_DOMAIN || '',
      cognitoUserPoolId: process.env.NUXT_PUBLIC_COGNITO_USER_POOL_ID || '',
      cognitoAppClientId: process.env.NUXT_PUBLIC_COGNITO_APP_CLIENT_ID || '',
      cognitoRedirectUri: process.env.NUXT_PUBLIC_COGNITO_REDIRECT_URI || '',
      cognitoSignOutUri: process.env.NUXT_PUBLIC_COGNITO_SIGNOUT_URI || '',
      cognitoScopes: process.env.NUXT_PUBLIC_COGNITO_SCOPES || ''
    }
  }
})
