import { describe, it, expect, vi } from 'vitest'
import type { H3Event } from 'h3'
import { buildAuthorizeUrl } from '@/server/utils/cognitoRedirect'

vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({
    public: {
      cognitoDomain: 'https://example.auth.region.amazoncognito.com',
      cognitoUserPoolId: 'pool',
      cognitoAppClientId: 'client',
      cognitoRedirectUri: 'http://localhost:3000',
      cognitoSignOutUri: 'http://localhost:3000/logout',
      cognitoScopes: 'email phone'
    }
  }),
  getHeader: vi.fn(),
  setCookie: vi.fn(),
  getCookie: vi.fn()
}))

const fakeEvent = {} as H3Event

describe('buildAuthorizeUrl', () => {
  it('builds authorize url with state and scopes', () => {
    const url = buildAuthorizeUrl(fakeEvent)
    expect(url.startsWith('https://example.auth.region.amazoncognito.com/oauth2/authorize?')).toBe(true)
    expect(url).toContain('client_id=client')
    expect(url).toContain('scope=email%20phone')
    expect(url).toContain('state=')
  })
})
