<template>
  <v-container class="logout-container" fluid>
    <v-row justify="center" align="center" class="fill-height text-center">
      <v-col cols="12" md="8" lg="6">
        <v-card elevation="4" class="pa-8">
          <v-icon color="primary" size="48" class="mb-4">
            mdi-logout
          </v-icon>
          <h1 class="text-h5 font-weight-bold mb-2">サインアウトが完了しました</h1>
          <p class="text-body-1 mb-6">
            ホーム画面へ戻りたい場合は、以下のボタンをクリックしてください。
          </p>
          <v-btn color="primary" variant="flat" size="large" to="/">
            ホームへ戻る
          </v-btn>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
// 追加のロジックが必要になった場合に備えて空のスクリプトを定義
</script>

<style scoped>
.logout-container {
  min-height: 70vh;
}
</style>
