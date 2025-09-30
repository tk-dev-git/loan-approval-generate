<!-- layouts/default.vue -->
<template>
  <v-app>
    <v-app-bar color="primary" flat class="custom-border"
      style="border-top: none; border-left: none; border-right: none;">
      <v-container fluid class="px-10 py-0">
        <v-row align="center" no-gutters>
          <v-col cols="auto">
            <v-icon size="16" color="white">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z"
                  fill="currentColor" />
              </svg>
            </v-icon>
          </v-col>
          <v-col cols="auto" class="ml-4">
            <h2 class="text-h6 font-weight-bold text-white">融資稟議書 生成</h2>
          </v-col>
          <v-spacer />
          <v-col cols="auto" class="d-flex align-center" style="gap: 12px;">
            <v-progress-circular v-if="isInitializing" indeterminate color="primary" size="24" />
            <template v-else>
              <v-btn v-if="!isLoggedIn" variant="flat" class="auth-button auth-button--light" @click="handleLogin">
                ログイン
              </v-btn>
              <div v-else class="d-flex align-center" style="gap: 12px;">
                <div class="d-flex flex-column text-right pr-2">
                  <span class="text-body-2 font-weight-medium text-white">{{ displayName }}</span>
                  <span v-if="lastError" class="text-caption" style="color: #ffe0d6;">{{ lastError }}</span>
                </div>
                <v-avatar size="40">
                  <v-img :src="defaultAvatar" alt="user avatar" />
                </v-avatar>
                <v-btn variant="outlined" class="auth-button auth-button--outlined" @click="handleLogout">
                  ログアウト
                </v-btn>
              </div>
            </template>
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
const auth = useCognitoAuth()
const defaultAvatar =
  'https://randomuser.me/api/portraits/men/32.jpg'

const isInitializing = computed(() => auth.isInitializing.value)
const isLoggedIn = computed(() => auth.loggedIn.value)
const displayName = computed(() => auth.user.value?.name || auth.user.value?.email || 'ゲスト')
const lastError = computed(() => auth.lastError.value)

const handleLogin = () => auth.login()
const handleLogout = () => auth.logout()
</script>

<style scoped>
.auth-button {
  min-width: 96px;
}

.auth-button--light {
  background-color: rgba(255, 255, 255, 0.2) !important;
  color: #ffffff !important;
}

.auth-button--light:hover {
  background-color: rgba(255, 255, 255, 0.3) !important;
}

.auth-button--outlined {
  border-color: #ffffff !important;
  color: #ffffff !important;
}

.auth-button--outlined:hover {
  background-color: rgba(255, 255, 255, 0.15) !important;
}
</style>
