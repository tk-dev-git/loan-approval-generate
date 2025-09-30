// middleware/auth.ts
import { abortNavigation } from '#app'
import { getCookie } from 'h3'
import { useRequestEvent, useRuntimeConfig } from '#imports'

const STATE_COOKIE_NAME = 'cognito_oauth_state'

export default defineNuxtRouteMiddleware(async (_to, _from) => {
  const auth = process.client ? useCognitoAuth() : null

  if (process.server) {
    const requestEvent = useRequestEvent()
    if (!requestEvent) return

    const cookie = getCookie(requestEvent, STATE_COOKIE_NAME)
    if (!cookie) {
      const runtimeConfig = useRuntimeConfig()
      const { buildAuthorizeUrl } = await import('@/server/utils/cognitoRedirect')
      const authorizeUrl = buildAuthorizeUrl(runtimeConfig, requestEvent)
      return await navigateTo(authorizeUrl, { external: true })
    }
    return
  }

  if (!auth) {
    return
  }

  if (auth.isInitializing.value) {
    return
  }

  if (!auth.loggedIn.value) {
    auth.login()
    return abortNavigation()
  }
})
