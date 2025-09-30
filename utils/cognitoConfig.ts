export interface CognitoNormalizedConfig {
  domain: string
  userPoolId: string
  clientId: string
  redirectUri: string
  signOutUri: string
  scopes: string[]
}

interface PublicRuntimeConfig {
  cognitoDomain?: string
  cognitoUserPoolId?: string
  cognitoAppClientId?: string
  cognitoRedirectUri?: string
  cognitoSignOutUri?: string
  cognitoScopes?: string
}

interface NuxtRuntimeConfig {
  public: PublicRuntimeConfig
}

const REQUIRED_FIELDS: Array<[keyof PublicRuntimeConfig, string]> = [
  ['cognitoDomain', 'NUXT_PUBLIC_COGNITO_DOMAIN'],
  ['cognitoUserPoolId', 'NUXT_PUBLIC_COGNITO_USER_POOL_ID'],
  ['cognitoAppClientId', 'NUXT_PUBLIC_COGNITO_APP_CLIENT_ID'],
  ['cognitoRedirectUri', 'NUXT_PUBLIC_COGNITO_REDIRECT_URI'],
  ['cognitoSignOutUri', 'NUXT_PUBLIC_COGNITO_SIGNOUT_URI'],
  ['cognitoScopes', 'NUXT_PUBLIC_COGNITO_SCOPES']
]

const ERROR_PREFIX = '[CognitoConfig]'

function ensureString(value: string | undefined, envName: string): string {
  if (!value || value.trim() === '') {
    throw new Error(`${ERROR_PREFIX} 設定値 ${envName} が未定義か空です。`) // 日本語
  }
  return value.trim()
}

export function buildCognitoConfig(runtimeConfig: NuxtRuntimeConfig): CognitoNormalizedConfig {
  const publicConfig = runtimeConfig?.public ?? {}
  const resolved: Record<string, string> = {}

  for (const [key, envName] of REQUIRED_FIELDS) {
    resolved[key] = ensureString(publicConfig[key], envName)
  }

  const scopes = resolved.cognitoScopes.split(/\s+/).filter(Boolean)
  if (scopes.length === 0) {
    throw new Error(`${ERROR_PREFIX} 設定値 NUXT_PUBLIC_COGNITO_SCOPES が空です。`)
  }

  return {
    domain: resolved.cognitoDomain,
    userPoolId: resolved.cognitoUserPoolId,
    clientId: resolved.cognitoAppClientId,
    redirectUri: resolved.cognitoRedirectUri,
    signOutUri: resolved.cognitoSignOutUri,
    scopes
  }
}
