export const useKeycloak = () => {
    const { $keycloakAuth } = useNuxtApp()
    return $keycloakAuth
}