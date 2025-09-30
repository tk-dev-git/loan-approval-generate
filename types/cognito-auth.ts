import type { Ref } from 'vue'

export interface CognitoTokens {
  accessToken: string
  idToken: string
  refreshToken: string
}

export interface CognitoUserProfile {
  sub?: string
  email?: string
  email_verified?: boolean
  name?: string
  [key: string]: unknown
}

export interface CognitoAuthClient {
  login: () => void
  logout: () => void
  refreshSession: () => void
  getAccessToken: () => string | null
  loggedIn: Ref<boolean>
  isInitializing: Ref<boolean>
  user: Ref<CognitoUserProfile | null>
  tokens: Ref<CognitoTokens | null>
  lastError: Ref<string | null>
}
