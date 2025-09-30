import { CognitoAuth } from 'amazon-cognito-auth-js'
import { buildCognitoConfig } from '@/utils/cognitoConfig'
import type { CognitoAuthClient, CognitoTokens, CognitoUserProfile } from '@/types/cognito-auth'

const ERROR_PREFIX = '[CognitoAuth]'

const parseJwtPayload = (token: string | undefined): CognitoUserProfile | null => {
  if (!token) return null
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + (4 - (normalized.length % 4)) % 4, '=')
    const decoded = atob(padded)
    return JSON.parse(decoded) as CognitoUserProfile
  } catch (error) {
    console.warn(`${ERROR_PREFIX} ID トークンのデコードに失敗しました`, error)
    return null
  }
}

const stripProtocol = (value: string) => value.replace(/^https?:\/\//i, '').replace(/\/$/, '')

export default defineNuxtPlugin((nuxtApp) => {
  const runtimeConfig = useRuntimeConfig()
  const config = buildCognitoConfig(runtimeConfig as any)

  const loggedIn = useState('cognito:loggedIn', () => false)
  const isInitializing = useState('cognito:isInitializing', () => true)
  const user = useState<CognitoUserProfile | null>('cognito:user', () => null)
  const tokens = useState<CognitoTokens | null>('cognito:tokens', () => null)
  const lastError = useState<string | null>('cognito:lastError', () => null)

  let refreshTimer: number | null = null

  const clearRefreshTimer = () => {
    if (refreshTimer !== null) {
      window.clearTimeout(refreshTimer)
      refreshTimer = null
    }
  }

  const refreshSession = () => {
    lastError.value = null
    try {
      cognitoAuth.getSession()
    } catch (error: any) {
      lastError.value = error?.message ?? String(error)
      console.error(`${ERROR_PREFIX} セッション更新に失敗しました`, error)
    }
  }

  const scheduleRefresh = (session: any) => {
    try {
      const expiresAt = session.getAccessToken().getExpiration() * 1000
      const timeout = Math.max(expiresAt - Date.now() - 60_000, 5_000)
      clearRefreshTimer()
      refreshTimer = window.setTimeout(() => {
        refreshSession()
      }, timeout)
    } catch (error) {
      console.warn(`${ERROR_PREFIX} 更新スケジュールに失敗しました`, error)
    }
  }

  const handleSuccess = (session: any) => {
    const accessToken = session.getAccessToken().getJwtToken()
    const idToken = session.getIdToken().getJwtToken()
    const refreshToken = session.getRefreshToken()?.getToken?.() ?? ''

    tokens.value = {
      accessToken,
      idToken,
      refreshToken
    }

    user.value = parseJwtPayload(idToken)
    loggedIn.value = true
    lastError.value = null
    isInitializing.value = false
    scheduleRefresh(session)
  }

  const handleFailure = (error: any) => {
    console.error(`${ERROR_PREFIX} 認証エラー`, error)
    lastError.value = error?.message ?? String(error)
    loggedIn.value = false
    user.value = null
    tokens.value = null
    clearRefreshTimer()
    isInitializing.value = false
  }

  const authData = {
    ClientId: config.clientId,
    AppWebDomain: stripProtocol(config.domain),
    TokenScopesArray: config.scopes,
    RedirectUriSignIn: config.redirectUri,
    RedirectUriSignOut: config.signOutUri,
    UserPoolId: config.userPoolId,
    AdvancedSecurityDataCollectionFlag: false,
    Storage: window.localStorage,
    LaunchUri: (uri: string) => {
      const url = new URL(uri, window.location.origin)
      url.searchParams.set('lang', 'ja')
      window.location.assign(url.toString())
    }
  }

  const cognitoAuth = new CognitoAuth(authData)
  cognitoAuth.useCodeGrantFlow()
  cognitoAuth.userhandler = {
    onSuccess: handleSuccess,
    onFailure: handleFailure
  }

  const hasAuthResponse = () => {
    const url = new URL(window.location.href)
    return url.searchParams.has('code') || url.searchParams.has('error')
  }

  const login = () => {
    lastError.value = null
    try {
      cognitoAuth.getSession()
    } catch (error: any) {
      handleFailure(error)
    }
  }

  const logout = () => {
    clearRefreshTimer()
    cognitoAuth.signOut()
  }

  if (hasAuthResponse()) {
    cognitoAuth.parseCognitoWebResponse(window.location.href)
    const cleanedUrl = window.location.origin + window.location.pathname
    window.history.replaceState({}, document.title, cleanedUrl)
  } else {
    const existingSession = cognitoAuth.getSignInUserSession?.()
    if (existingSession && existingSession.isValid && existingSession.isValid()) {
      handleSuccess(existingSession)
    } else {
      login()
    }
  }

  const client: CognitoAuthClient = {
    login,
    logout,
    refreshSession,
    getAccessToken: () => tokens.value?.accessToken ?? null,
    loggedIn,
    isInitializing,
    user,
    tokens,
    lastError
  }

  nuxtApp.provide('cognitoAuth', client)
})
