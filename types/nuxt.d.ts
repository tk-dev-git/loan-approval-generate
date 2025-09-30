import type { CognitoAuthClient } from './cognito-auth'

declare module '#app' {
  interface NuxtApp {
    $cognitoAuth?: CognitoAuthClient
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $cognitoAuth?: CognitoAuthClient
  }
}
