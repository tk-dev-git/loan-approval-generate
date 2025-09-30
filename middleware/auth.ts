// middleware/auth.ts
import { abortNavigation } from '#app'

export default defineNuxtRouteMiddleware(() => {
  if (process.server) {
    return
  }

  const auth = useCognitoAuth()

  if (auth.isInitializing.value) {
    return
  }

  if (!auth.loggedIn.value) {
    auth.login()
    return abortNavigation()
  }
})
