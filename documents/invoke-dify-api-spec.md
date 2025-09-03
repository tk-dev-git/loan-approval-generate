# Dify API 呼び出し仕様書 - Nuxt3 + Vuetify 実装

## 概要

本仕様書では、Python実装の Dify API 呼び出しパターンを分析し、Nuxt3 + Vuetify での実装方法を詳細に記述します。

### 対象API
- **Dify File Upload API**: ファイルアップロード機能
- **Dify Workflow API**: ワークフロー実行とSSEストリーミング

### 技術スタック
- **Nuxt3**: フルスタックVue.jsフレームワーク
- **Vuetify**: Vue UI コンポーネントライブラリ
- **TypeScript**: 型安全性の担保

## Dify API 仕様詳細

### 1. File Upload API

#### エンドポイント
```
POST {DIFY_API_BASE_URL}/files/upload
```

#### リクエスト仕様
- **Content-Type**: `multipart/form-data`
- **認証**: `Authorization: Bearer {DIFY_API_KEY}`

**フォームデータ**:
```typescript
{
  file: File,      // アップロードするファイルのバイナリ
  user: string     // ユーザー識別子（例："difyAdmin"）
}
```

#### レスポンス仕様
```typescript
interface DifyUploadResponse {
  id: string           // ファイルID（後続処理で使用）
  name: string         // ファイル名
  size: number         // ファイルサイズ（bytes）
  extension: string    // ファイル拡張子
  mime_type: string    // MIMEタイプ
  created_by: string   // 作成者ID
  created_at: string   // 作成日時（ISO文字列）
}
```

#### エラーレスポンス
| HTTPステータス | エラーコード | 説明 |
|---|---|---|
| 400 | no_file_uploaded | ファイルが提供されていません |
| 400 | too_many_files | 現在は1つのファイルのみ受け付けています |
| 400 | unsupported_preview | ファイルはプレビューをサポートしていません |
| 400 | unsupported_estimate | ファイルは推定をサポートしていません |
| 413 | file_too_large | ファイルが大きすぎます |
| 415 | unsupported_file_type | サポートされていない拡張子です |
| 503 | s3_connection_failed | S3サービスに接続できません |
| 503 | s3_permission_denied | S3にファイルをアップロードする権限がありません |
| 503 | s3_file_too_large | ファイルがS3のサイズ制限を超えています |

### 2. Workflow API

#### エンドポイント
```
POST {DIFY_WORKFLOW_API_ENDPOINT}
```

#### リクエスト仕様
- **Content-Type**: `application/json`
- **認証**: `Authorization: Bearer {DIFY_API_KEY}`

**リクエストボディ**:
```typescript
interface DifyWorkflowRequest {
  inputs: Record<string, any>    // ワークフローパラメータ
  response_mode: "streaming"     // ストリーミングモード固定
  user: string                   // ユーザー識別子
  conversation_id?: string       // 会話継続時のID（オプション）
}
```

#### レスポンス仕様 (Server-Sent Events)

**SSEイベント形式**:
```
data: {"event": "イベントタイプ", "data": {...}, ...}
```

**イベントタイプ**:

1. **text_chunk**: ストリーミングテキスト
```typescript
{
  event: "text_chunk",
  data: {
    text: string    // 部分的なテキスト
  }
}
```

2. **workflow_started**: ワークフロー開始
```typescript
{
  event: "workflow_started", 
  workflow_run_id: string    // 実行ID（会話IDとして使用可能）
}
```

3. **workflow_finished**: ワークフロー完了
```typescript
{
  event: "workflow_finished",
  data: {
    outputs: {
      result: string    // 最終出力結果
    }
  }
}
```

4. **error**: エラー発生
```typescript
{
  event: "error",
  message: string    // エラーメッセージ
}
```

#### SSE処理パターン
1. 行ごとに処理、`data:` プレフィックスを確認
2. 空データと `[DONE]` マーカーをスキップ
3. JSON解析してイベントタイプを判定
4. `text_chunk`: partial_message に蓄積、リアルタイム更新
5. `workflow_finished`: 最終出力確認、処理完了
6. `error`: エラーメッセージ表示、処理中断

### 3. ファイルアップロード後の処理

アップロード成功後、以下の形式でワークフロー入力に含める：

```typescript
const disclosureItem = {
  transfer_method: "local_file",
  upload_file_id: uploadResult.id,
  type: "document"
}
```

## Nuxt3 実装仕様

### 1. 環境変数設定

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    // サーバー専用設定
    difyApiKey: process.env.DIFY_API_KEY,
    difyApiBaseUrl: process.env.DIFY_API_BASE_URL,
    difyWorkflowApiEndpoint: process.env.DIFY_WORKFLOW_API_ENDPOINT,
    
    public: {
      // クライアント・サーバー共通設定
      // 必要に応じて追加
    }
  }
})
```

### 2. Server API Routes

#### ファイルアップロード API

**`/server/api/dify/upload.post.ts`**:
```typescript
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  
  try {
    const form = await readMultipartFormData(event)
    if (!form) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No form data provided'
      })
    }

    const fileItem = form.find(item => item.name === 'file')
    const userItem = form.find(item => item.name === 'user')
    
    if (!fileItem?.data || !userItem?.data) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File and user are required'
      })
    }

    const formData = new FormData()
    formData.append('file', new Blob([fileItem.data]), fileItem.filename || 'file')
    formData.append('user', userItem.data.toString())

    const response = await $fetch<DifyUploadResponse>(
      `${config.difyApiBaseUrl}/files/upload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.difyApiKey}`
        },
        body: formData
      }
    )

    return response
  } catch (error: any) {
    throw createError({
      statusCode: error.status || 500,
      statusMessage: error.message || 'Upload failed'
    })
  }
})
```

#### ワークフロー実行 API

**`/server/api/dify/workflow.post.ts`**:
```typescript
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = await readBody<DifyWorkflowRequest>(event)

  try {
    const response = await $fetch<ReadableStream>(
      config.difyWorkflowApiEndpoint,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.difyApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        responseType: 'stream'
      }
    )

    // SSEストリームをクライアントに転送
    setResponseHeader(event, 'Content-Type', 'text/event-stream')
    setResponseHeader(event, 'Cache-Control', 'no-cache')
    setResponseHeader(event, 'Connection', 'keep-alive')

    return sendStream(event, response)
  } catch (error: any) {
    throw createError({
      statusCode: error.status || 500,
      statusMessage: error.message || 'Workflow execution failed'
    })
  }
})
```

### 3. Composables

#### ファイルアップロード Composable

**`composables/useDifyUpload.ts`**:
```typescript
interface UploadOptions {
  onProgress?: (progress: number) => void
  onError?: (error: any) => void
  onSuccess?: (result: DifyUploadResponse) => void
}

export const useDifyUpload = () => {
  const uploading = ref(false)
  const progress = ref(0)
  const error = ref<string | null>(null)

  const uploadFile = async (file: File, user: string, options?: UploadOptions) => {
    if (uploading.value) return null

    uploading.value = true
    progress.value = 0
    error.value = null

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('user', user)

      const result = await $fetch<DifyUploadResponse>('/api/dify/upload', {
        method: 'POST',
        body: formData,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            progress.value = percentage
            options?.onProgress?.(percentage)
          }
        }
      })

      options?.onSuccess?.(result)
      return result
    } catch (err: any) {
      error.value = err.message || 'Upload failed'
      options?.onError?.(err)
      return null
    } finally {
      uploading.value = false
    }
  }

  const uploadMultipleFiles = async (files: File[], user: string, options?: UploadOptions) => {
    const results: DifyUploadResponse[] = []
    const totalFiles = files.length

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const result = await uploadFile(file, user, {
        ...options,
        onProgress: (fileProgress) => {
          const overallProgress = Math.round(((i + fileProgress / 100) / totalFiles) * 100)
          progress.value = overallProgress
          options?.onProgress?.(overallProgress)
        }
      })
      
      if (result) {
        results.push(result)
      } else {
        break // エラー時は中断
      }
    }

    return results
  }

  return {
    uploading: readonly(uploading),
    progress: readonly(progress),
    error: readonly(error),
    uploadFile,
    uploadMultipleFiles
  }
}
```

#### ワークフロー実行 Composable

**`composables/useDifyWorkflow.ts`**:
```typescript
interface WorkflowOptions {
  onMessage?: (message: string) => void
  onComplete?: (result: string) => void
  onError?: (error: string) => void
}

export const useDifyWorkflow = () => {
  const executing = ref(false)
  const result = ref('')
  const error = ref<string | null>(null)

  const executeWorkflow = async (inputs: Record<string, any>, user: string, options?: WorkflowOptions) => {
    if (executing.value) return

    executing.value = true
    result.value = ''
    error.value = null

    try {
      const response = await $fetch<ReadableStream>('/api/dify/workflow', {
        method: 'POST',
        body: {
          inputs,
          response_mode: 'streaming',
          user
        },
        responseType: 'stream'
      })

      const reader = response.pipeThrough(new TextDecoderStream()).getReader()
      let partialMessage = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const lines = value.split('\n')
        
        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          
          const dataContent = line.substring(5).trim()
          if (!dataContent || dataContent === '[DONE]') continue

          try {
            const chunkData: DifyStreamEvent = JSON.parse(dataContent)
            
            switch (chunkData.event) {
              case 'text_chunk':
                const textChunk = chunkData.data?.text || ''
                if (textChunk) {
                  partialMessage += textChunk
                  result.value = partialMessage
                  options?.onMessage?.(partialMessage)
                }
                break

              case 'workflow_finished':
                const finalOutput = chunkData.data?.outputs?.result || ''
                if (finalOutput && !partialMessage) {
                  result.value = finalOutput
                  options?.onComplete?.(finalOutput)
                } else if (partialMessage) {
                  options?.onComplete?.(partialMessage)
                }
                return

              case 'error':
                const errorMessage = chunkData.message || '不明なエラー'
                error.value = errorMessage
                options?.onError?.(errorMessage)
                return
            }
          } catch (parseError) {
            console.error('JSON解析エラー:', parseError, 'データ:', dataContent)
            continue
          }
        }
      }

      if (partialMessage) {
        options?.onComplete?.(partialMessage)
      } else {
        error.value = 'レスポンスが完了しましたが、結果を受信できませんでした。'
        options?.onError?.(error.value)
      }

    } catch (err: any) {
      error.value = err.message || 'ワークフロー実行エラー'
      options?.onError?.(error.value)
    } finally {
      executing.value = false
    }
  }

  return {
    executing: readonly(executing),
    result: readonly(result),
    error: readonly(error),
    executeWorkflow
  }
}
```

## Vuetify UI コンポーネント仕様

### 1. ファイルアップロードフォーム

```vue
<template>
  <v-form ref="form" v-model="valid" @submit.prevent="handleSubmit">
    <!-- ファイルアップロード -->
    <v-file-input
      v-model="files"
      :rules="fileRules"
      :loading="uploading"
      accept=".pdf,.docx,.xlsx,.csv,.txt"
      label="ファイルアップロード"
      multiple
      show-size
      counter
      chips
      prepend-icon="mdi-paperclip"
    >
      <template #selection="{ fileNames }">
        <v-chip
          v-for="fileName in fileNames.slice(0, 2)"
          :key="fileName"
          label
          small
          color="primary"
          class="mr-2"
        >
          {{ fileName }}
        </v-chip>
        <span 
          v-if="fileNames.length > 2"
          class="text-caption grey--text mx-2"
        >
          +{{ fileNames.length - 2 }} ファイル
        </span>
      </template>
    </v-file-input>

    <!-- アップロード進捗 -->
    <v-progress-linear
      v-if="uploading"
      :value="progress"
      color="primary"
      stream
      height="6"
      class="mb-4"
    >
      {{ Math.ceil(progress) }}%
    </v-progress-linear>

    <!-- その他のフォーム項目 -->
    <v-text-field
      v-model="industry"
      :rules="[rules.required]"
      label="業界名"
      placeholder="例：製造業、IT業界、小売業 等"
      required
    />

    <v-text-field
      v-model="business"
      :rules="[rules.required]"
      label="事業内容"
      placeholder="例：製造業の場合...車の部品製造、電子デバイスの製造 等"
      required
    />

    <!-- 送信ボタン -->
    <v-btn
      type="submit"
      :disabled="!valid || uploading || executing"
      :loading="executing"
      color="primary"
      size="large"
      block
    >
      レポート生成
    </v-btn>

    <!-- エラー表示 -->
    <v-alert
      v-if="error"
      type="error"
      class="mt-4"
      closable
      @click:close="error = null"
    >
      {{ error }}
    </v-alert>
  </v-form>
</template>

<script setup lang="ts">
// フォームバリデーション
const valid = ref(false)
const form = ref()

const files = ref<File[]>([])
const industry = ref('')
const business = ref('')

// バリデーションルール
const rules = {
  required: (value: any) => !!value || '必須項目です',
}

const fileRules = [
  (files: File[] | null) => {
    if (!files || files.length === 0) return true // オプショナル
    return files.every(file => file.size < 10 * 1024 * 1024) || 'ファイルサイズは10MB以下にしてください'
  }
]

// Composables
const { uploading, progress, error: uploadError, uploadMultipleFiles } = useDifyUpload()
const { executing, result, error: workflowError, executeWorkflow } = useDifyWorkflow()

const error = computed(() => uploadError.value || workflowError.value)

// フォーム送信処理
const handleSubmit = async () => {
  if (!valid.value) return

  let uploadedFiles: DifyUploadResponse[] = []

  // ファイルアップロード処理
  if (files.value && files.value.length > 0) {
    uploadedFiles = await uploadMultipleFiles(files.value, 'difyAdmin')
    if (!uploadedFiles.length && uploadError.value) return
  }

  // ワークフロー実行
  const disclosures = uploadedFiles.map(file => ({
    transfer_method: "local_file",
    upload_file_id: file.id,
    type: "document"
  }))

  await executeWorkflow({
    industry: industry.value,
    business: business.value,
    disclosures
  }, 'difyAdmin')
}
</script>
```

### 2. ストリーミング結果表示

```vue
<template>
  <v-card class="mt-6">
    <v-card-title class="d-flex align-center">
      <v-icon class="mr-2">mdi-file-document</v-icon>
      生成結果
    </v-card-title>

    <v-card-text>
      <!-- ローディング表示 -->
      <div v-if="executing" class="text-center py-8">
        <v-progress-circular
          indeterminate
          color="primary"
          size="48"
          class="mb-4"
        />
        <p class="text-h6 mb-2">レポートを生成中...</p>
        <p class="text-body-2 text-grey">しばらくお待ちください</p>
      </div>

      <!-- 結果表示 -->
      <div v-else-if="result" class="result-content">
        <v-divider class="mb-4" />
        <!-- Markdownレンダリング（v-markdown等を使用） -->
        <div v-html="renderedMarkdown" class="markdown-content" />
      </div>

      <!-- 初期状態 -->
      <div v-else class="text-center py-8 text-grey">
        <v-icon size="48" class="mb-4">mdi-file-outline</v-icon>
        <p>フォームを入力してレポートを生成してください</p>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
const { executing, result } = useDifyWorkflow()

// Markdownレンダリング（例：marked.jsを使用）
const renderedMarkdown = computed(() => {
  if (!result.value) return ''
  // ここでMarkdownをHTMLに変換
  return marked(result.value)
})
</script>

<style scoped>
.result-content {
  max-height: 70vh;
  overflow-y: auto;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3) {
  margin-top: 1.5rem;
  margin-bottom: 1rem;
}

.markdown-content :deep(p) {
  margin-bottom: 1rem;
  line-height: 1.7;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin-bottom: 1rem;
  padding-left: 2rem;
}
</style>
```

## TypeScript 型定義

**`types/dify.ts`**:
```typescript
// Dify API レスポンス型
export interface DifyUploadResponse {
  id: string
  name: string
  size: number
  extension: string
  mime_type: string
  created_by: string
  created_at: string
}

// Dify API リクエスト型
export interface DifyWorkflowRequest {
  inputs: Record<string, any>
  response_mode: 'streaming'
  user: string
  conversation_id?: string
}

// SSE イベント型
export interface DifyStreamEvent {
  event: 'text_chunk' | 'workflow_started' | 'workflow_finished' | 'error'
  data?: {
    text?: string
    outputs?: {
      result: string
    }
  }
  message?: string
  workflow_run_id?: string
}

// ファイル処理用型
export interface DifyDisclosureItem {
  transfer_method: 'local_file'
  upload_file_id: string
  type: 'document'
}

// フォーム入力型
export interface ReportFormData {
  industry: string
  business: string
  operations?: string
  files?: File[]
  disclosures: DifyDisclosureItem[]
}

// エラー型
export interface DifyError {
  code: string
  message: string
  status: number
}
```

## 実装例とワークフロー

### 完全なページ実装例

**`pages/report-generator.vue`**:
```vue
<template>
  <v-container class="py-8">
    <v-row>
      <!-- 左側：フォーム -->
      <v-col cols="12" lg="4">
        <v-card>
          <v-card-title class="bg-primary">
            <v-icon class="mr-2">mdi-cog</v-icon>
            レポート設定
          </v-card-title>

          <v-card-text class="pa-6">
            <!-- ファイルアップロードフォーム（上記コンポーネントを使用） -->
            <DifyUploadForm @submit="handleFormSubmit" />
          </v-card-text>
        </v-card>
      </v-col>

      <!-- 右側：結果表示 -->
      <v-col cols="12" lg="8">
        <!-- ストリーミング結果表示（上記コンポーネントを使用） -->
        <DifyResultDisplay />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
// SEO設定
definePageMeta({
  title: 'レポート生成システム',
  description: 'Dify APIを使用したレポート生成システム'
})

const handleFormSubmit = (formData: ReportFormData) => {
  console.log('フォーム送信:', formData)
}
</script>
```

### ワークフロー実行手順

1. **ファイル選択**
   - `v-file-input` でファイル選択
   - バリデーション実行（ファイルサイズ、形式確認）

2. **フォーム入力**
   - 必要な入力項目の入力・検証
   - フォーム全体のバリデーション

3. **ファイルアップロード**
   - `useDifyUpload` でファイルを順次アップロード
   - `v-progress-linear` で進捗表示
   - アップロード結果から `DifyDisclosureItem` を生成

4. **ワークフロー実行**
   - `useDifyWorkflow` でワークフローを実行
   - SSEストリーミングでリアルタイム結果表示
   - エラーハンドリング

5. **結果表示**
   - Markdownレンダリング
   - エラー状態の適切な表示

### パフォーマンス最適化

```typescript
// ファイルアップロードの並列処理
const uploadFilesParallel = async (files: File[], maxConcurrency: number = 3) => {
  const results: DifyUploadResponse[] = []
  const chunks = []
  
  for (let i = 0; i < files.length; i += maxConcurrency) {
    chunks.push(files.slice(i, i + maxConcurrency))
  }

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(file => uploadFile(file, 'difyAdmin'))
    )
    results.push(...chunkResults.filter(Boolean))
  }

  return results
}
```

## セキュリティ考慮事項

### 1. API キーの管理
- サーバーサイドの環境変数で管理
- クライアントサイドには露出しない
- Runtime Config を使用してセキュアに管理

### 2. ファイルアップロードのセキュリティ
```typescript
// ファイル検証例
const validateFile = (file: File): boolean => {
  const allowedTypes = ['application/pdf', 'application/msword', 'text/plain']
  const maxSize = 10 * 1024 * 1024 // 10MB

  return allowedTypes.includes(file.type) && file.size <= maxSize
}
```

### 3. リクエスト制限
```typescript
// Rate limiting (Nuxt middleware)
export default defineEventHandler(async (event) => {
  const ip = getClientIP(event)
  // IP別のリクエスト制限実装
})
```

## まとめ

本仕様書では、Python実装のDify API呼び出しパターンをNuxt3 + Vuetifyで完全に再現するための詳細な実装方法を提供しました。

### 主要な実装ポイント
- **Server API Routes** でDify APIへの安全な代理アクセス
- **Composables** でロジックの再利用性確保
- **Vuetify コンポーネント** でモダンなUI実装
- **TypeScript** で型安全性の担保
- **SSE ストリーミング** でリアルタイムレスポンス

この実装により、PythonコードのすべてのDify API機能をNuxt3環境で利用可能になります。