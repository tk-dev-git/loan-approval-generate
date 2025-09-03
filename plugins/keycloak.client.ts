import Keycloak from 'keycloak-js'

export default defineNuxtPlugin(async () => {
    const keycloak = new Keycloak({
        url: useRuntimeConfig().public.keycloakUrl || 'http://localhost:8080',
        realm: useRuntimeConfig().public.keycloakRealm || 'your-realm',
        clientId: useRuntimeConfig().public.keycloakClientId || 'your-client-id'
    })

    try {
        const authenticated = await keycloak.init({
            onLoad: 'check-sso',
            silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html'
        })

        return {
            provide: {
                keycloak,
                keycloakAuth: {
                    loggedIn: ref(authenticated),
                    user: ref(keycloak.tokenParsed),
                    login: () => keycloak.login(),
                    logout: () => keycloak.logout()
                }
            }
        }
    } catch (error) {
        console.error('Keycloak initialization failed:', error)
    }
})