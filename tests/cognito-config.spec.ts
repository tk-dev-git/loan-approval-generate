import { describe, it, expect } from 'vitest'
import { buildCognitoConfig } from '@/utils/cognitoConfig'

type PublicRuntimeConfig = {
  cognitoDomain?: string
  cognitoUserPoolId?: string
  cognitoAppClientId?: string
  cognitoRedirectUri?: string
  cognitoSignOutUri?: string
  cognitoScopes?: string
}

type MockRuntimeConfig = {
  public: PublicRuntimeConfig
}

describe('buildCognitoConfig', () => {
  const validConfig: MockRuntimeConfig = {
    public: {
      cognitoDomain: 'https://ap-northeast-1pifvzstid.auth.ap-northeast-1.amazoncognito.com',
      cognitoUserPoolId: 'ap-northeast-1_Example',
      cognitoAppClientId: '1234567890example',
      cognitoRedirectUri: 'http://localhost:3000/',
      cognitoSignOutUri: 'http://localhost:3000/',
      cognitoScopes: 'email openid profile'
    }
  }

  it('正しい設定を返す', () => {
    const result = buildCognitoConfig(validConfig)
    expect(result).toEqual({
      domain: validConfig.public.cognitoDomain,
      userPoolId: validConfig.public.cognitoUserPoolId,
      clientId: validConfig.public.cognitoAppClientId,
      redirectUri: validConfig.public.cognitoRedirectUri,
      signOutUri: validConfig.public.cognitoSignOutUri,
      scopes: ['email', 'openid', 'profile']
    })
  })

  it('必須値が欠けているとエラーを投げる', () => {
    const config: MockRuntimeConfig = {
      public: {
        ...validConfig.public,
        cognitoDomain: ''
      }
    }

    expect(() => buildCognitoConfig(config)).toThrowError(/NUXT_PUBLIC_COGNITO_DOMAIN/)
  })

  it('scopes が空の場合はエラーになる', () => {
    const config: MockRuntimeConfig = {
      public: {
        ...validConfig.public,
        cognitoScopes: '   '
      }
    }

    expect(() => buildCognitoConfig(config)).toThrowError(/NUXT_PUBLIC_COGNITO_SCOPES/)
  })
})
