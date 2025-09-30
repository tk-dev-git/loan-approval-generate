import { ref } from 'vue'
import type { CognitoAuthClient, CognitoTokens, CognitoUserProfile } from '@/types/cognito-auth'

const createFallbackAuth = (): CognitoAuthClient => {
  const loggedIn = ref(false)
  const isInitializing = ref(true)
  const user = ref<CognitoUserProfile | null>(null)
  const tokens = ref<CognitoTokens | null>(null)
  const lastError = ref<string | null>(null)

  const warn = () => {
    if (process.client) {
      console.warn('[CognitoAuth] プラグインが初期化されていません。')
    }
  }

  return {
    login: warn,
    logout: warn,
    refreshSession: warn,
    getAccessToken: () => null,
    loggedIn,
    isInitializing,
    user,
    tokens,
    lastError
  }
}

let fallbackAuth: CognitoAuthClient | null = null

export const useCognitoAuth = (): CognitoAuthClient => {
  const nuxtApp = useNuxtApp()
  const client = nuxtApp.$cognitoAuth
  if (client) {
    return client
  }
  if (!fallbackAuth) {
    fallbackAuth = createFallbackAuth()
  }
  return fallbackAuth
}
