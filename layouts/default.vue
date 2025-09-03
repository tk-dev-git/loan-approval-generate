<!-- layouts/default.vue -->
<template>
    <v-app>
        <v-app-bar color="background" flat class="custom-border"
            style="border-top: none; border-left: none; border-right: none;">
            <v-container fluid class="px-10 py-0">
                <v-row align="center" no-gutters>
                    <v-col cols="auto">
                        <v-icon size="16" color="on-background">
                            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd" clip-rule="evenodd"
                                    d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z" fill="currentColor">
                                </path>
                            </svg>
                        </v-icon>
                    </v-col>
                    <v-col cols="auto" class="ml-4">
                        <h2 class="text-h6 font-weight-bold">Strategic Planning</h2>
                    </v-col>
                    <v-spacer></v-spacer>
                    <v-col cols="auto">
                        <v-btn icon variant="flat" color="secondary" size="40" class="mr-4">
                            <v-icon>mdi-cog</v-icon>
                        </v-btn>
                        <v-avatar size="40">
                            <v-img :src="userProfile?.avatar || defaultAvatar"></v-img>
                        </v-avatar>
                    </v-col>
                </v-row>
            </v-container>
        </v-app-bar>

        <v-main>
            <slot />
        </v-main>
    </v-app>
</template>

<script setup lang="ts">
import { useKeycloak } from '#imports'

const { user } = useKeycloak()
const defaultAvatar = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAVB1zsqA3_x7vOz0wYZocT1ca4__8gj5gE25-aqj__K758IH_hOnXrBiSBGgi_kW8HUKmEkOScqtZLFUNQkwQo0MZS-9lJlbh_9IqwnS4yw8Cm9uuLSVc2yAJ12eDxD8rRpquAVdomahbH_9HZDQf5K0yVMLi2BfXuoMTUKf4HUlC3IdUDMcyNjn7skrCZx3VLdy_KkMlt62sJyOzUEhMx5l3P54PfNukU_1PsKTn-FjUesmzURWXOhmv6SgkZOybxh8RbdmvqJMs'

const userProfile = computed(() => user.value)
</script>