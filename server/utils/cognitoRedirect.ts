import { getHeader, getCookie, setCookie, H3Event } from 'h3'
import { buildCognitoConfig } from '@/utils/cognitoConfig'
import crypto from 'node:crypto'

const STATE_COOKIE_NAME = 'cognito_oauth_state'
const STATE_TTL_SECONDS = 300

function createStateNonce() {
  return crypto.randomBytes(32).toString('base64url')
}

export function buildAuthorizeUrl(runtimeConfig: any, event: H3Event) {
  const config = buildCognitoConfig(runtimeConfig as any)

  const forwardedProto = getHeader(event, 'x-forwarded-proto')
  const forwardedHost = getHeader(event, 'x-forwarded-host')
  const origin = forwardedProto && forwardedHost ? `${forwardedProto}://${forwardedHost}` : undefined
  const redirectUri = config.redirectUri || origin
  if (!redirectUri) {
    throw new Error('Redirect URI is not configured')
  }

  const state = createStateNonce()
  setCookie(event, STATE_COOKIE_NAME, state, {
    maxAge: STATE_TTL_SECONDS,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  })
  const authorizeUrl = new URL('/oauth2/authorize', config.domain)
  authorizeUrl.searchParams.set('response_type', 'code')
  authorizeUrl.searchParams.set('client_id', config.clientId)
  authorizeUrl.searchParams.set('redirect_uri', redirectUri)
  authorizeUrl.searchParams.set('scope', config.scopes.join(' '))
  authorizeUrl.searchParams.set('state', state)
  authorizeUrl.searchParams.set('lang', 'ja')

  return authorizeUrl.toString()
}

export function hasValidStateCookie(event: H3Event) {
  return Boolean(getCookie(event, STATE_COOKIE_NAME))
}
