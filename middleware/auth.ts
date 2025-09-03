// middleware/auth.ts
export default defineNuxtRouteMiddleware((to, from) => {
    const { loggedIn, login } = useKeycloak()

    if (!loggedIn.value && to.path !== '/login') {
        return login()
    }
})