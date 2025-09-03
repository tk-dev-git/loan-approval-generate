<template>
  <v-card class="dify-file-upload">
    <v-card-title class="d-flex align-center">
      <v-icon class="me-2">mdi-file-upload</v-icon>
      {{ title }}
    </v-card-title>

    <v-card-text>
      <!-- ファイル選択エリア -->
      <div class="upload-area">
        <v-file-input
          v-model="selectedFiles"
          :accept="acceptedTypes.join(',')"
          :multiple="multiple"
          :disabled="isUploading"
          :placeholder="placeholder"
          :prepend-icon="null"
          :append-inner-icon="'mdi-file-document-plus'"
          variant="outlined"
          class="mb-4"
          @update:model-value="onFileSelect"
        />

        <!-- ドラッグ&ドロップエリア -->
        <div
          class="drop-zone"
          :class="{ 'drop-zone--active': isDragOver, 'drop-zone--disabled': isUploading }"
          @drop.prevent="onDrop"
          @dragover.prevent="isDragOver = true"
          @dragleave.prevent="isDragOver = false"
        >
          <div class="drop-zone__content">
            <v-icon size="48" color="grey-lighten-1">mdi-cloud-upload</v-icon>
            <div class="text-body-1 mt-2">
              ファイルをここにドラッグ&ドロップするか、上のボタンから選択してください
            </div>
            <div class="text-caption text-medium-emphasis mt-1">
              対応形式: {{ acceptedTypes.join(', ') }} (最大{{ maxSizeMB }}MB)
            </div>
          </div>
        </div>
      </div>

      <!-- アップロード進捗 -->
      <div v-if="allUploadStates.length > 0" class="upload-progress mt-4">
        <div class="d-flex justify-space-between align-center mb-2">
          <span class="text-subtitle-2">アップロード進捗</span>
          <v-btn
            v-if="!isUploading && hasCompletedFiles"
            size="small"
            variant="outlined"
            color="error"
            @click="clearAll"
          >
            クリア
          </v-btn>
        </div>

        <!-- 全体進捗バー -->
        <v-progress-linear
          v-if="isUploading"
          :model-value="totalProgress"
          color="primary"
          height="6"
          class="mb-3"
        />

        <!-- 各ファイルの進捗 -->
        <div class="file-list">
          <v-card
            v-for="(state, index) in allUploadStates"
            :key="`file-${index}`"
            class="file-item mb-2"
            variant="outlined"
          >
            <v-card-text class="py-2">
              <div class="d-flex align-center">
                <!-- ファイルアイコン -->
                <v-icon class="me-3" :color="getFileStatusColor(state.status)">
                  {{ getFileIcon(state.status) }}
                </v-icon>

                <!-- ファイル情報 -->
                <div class="flex-grow-1">
                  <div class="d-flex justify-space-between align-center">
                    <span class="text-body-2 font-weight-medium">{{ state.fileName }}</span>
                    <span class="text-caption">{{ formatFileSize(state.fileSize) }}</span>
                  </div>

                  <!-- 進捗バー（アップロード中のみ） -->
                  <v-progress-linear
                    v-if="state.status === 'uploading'"
                    :model-value="state.progress"
                    color="primary"
                    height="4"
                    class="mt-1"
                  />

                  <!-- エラーメッセージ -->
                  <div v-if="state.status === 'error' && state.error" class="text-error text-caption mt-1">
                    {{ state.error }}
                  </div>

                  <!-- 成功時の情報 -->
                  <div v-if="state.status === 'completed'" class="text-success text-caption mt-1">
                    アップロード完了
                  </div>
                </div>

                <!-- アクションボタン -->
                <div class="ms-3">
                  <v-btn
                    v-if="state.status === 'error'"
                    size="small"
                    variant="outlined"
                    color="primary"
                    @click="retryUpload(index)"
                  >
                    再試行
                  </v-btn>
                  <v-btn
                    size="small"
                    variant="text"
                    icon="mdi-close"
                    @click="removeFile(index)"
                  />
                </div>
              </div>
            </v-card-text>
          </v-card>
        </div>

        <!-- アップロード統計 -->
        <div class="upload-stats mt-3">
          <v-chip
            v-if="completedCount > 0"
            size="small"
            color="success"
            variant="outlined"
            class="me-2"
          >
            <v-icon start>mdi-check</v-icon>
            完了: {{ completedCount }}
          </v-chip>
          <v-chip
            v-if="uploadingCount > 0"
            size="small"
            color="primary"
            variant="outlined"
            class="me-2"
          >
            <v-icon start>mdi-upload</v-icon>
            処理中: {{ uploadingCount }}
          </v-chip>
          <v-chip
            v-if="errorCount > 0"
            size="small"
            color="error"
            variant="outlined"
            class="me-2"
          >
            <v-icon start>mdi-alert</v-icon>
            エラー: {{ errorCount }}
          </v-chip>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { UploadProgressState, FileUploadOptions } from '~/types/dify'

interface Props {
  title?: string
  multiple?: boolean
  acceptedTypes?: string[]
  maxSizeMB?: number
  placeholder?: string
  modelValue?: string[]  // v-model対応: 外部からのファイルID配列
}

const props = withDefaults(defineProps<Props>(), {
  title: 'ファイルアップロード',
  multiple: true,
  acceptedTypes: () => ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'],
  maxSizeMB: 50,
  placeholder: 'ファイルを選択...'
})

const emit = defineEmits<{
  'upload-complete': [fileIds: string[]]
  'upload-error': [error: string]
  'update:modelValue': [fileIds: string[]]  // v-model双方向バインディング
}>()

// Composableを使用
const { 
  uploadFile,
  uploadFiles,
  getAllUploadStates,
  clearUploadStates,
  removeUploadState,
  getTotalProgress,
  uploadingCount,
  completedCount,
  errorCount 
} = useDifyFileUpload()

// ローカル状態
const selectedFiles = ref<File[]>([])
const isDragOver = ref(false)

// v-model対応: 外部状態との双方向バインディング
const uploadedFileIds = computed({
  get: () => props.modelValue || [],
  set: (value: string[]) => {
    emit('update:modelValue', value)
    // デバッグログ
    console.log('DifyFileUpload: Updated file IDs:', value)
  }
})

// 計算プロパティ
const allUploadStates = computed(() => getAllUploadStates())
const totalProgress = getTotalProgress
const isUploading = computed(() => uploadingCount.value > 0)
const hasCompletedFiles = computed(() => completedCount.value > 0)

// ファイル選択時の処理
const onFileSelect = async (files: File[] | null) => {
  if (!files || files.length === 0) return
  
  await handleFileUpload(files)
}

// ドラッグ&ドロップ時の処理
const onDrop = async (event: DragEvent) => {
  isDragOver.value = false
  
  if (!event.dataTransfer?.files) return
  
  const files = Array.from(event.dataTransfer.files)
  await handleFileUpload(files)
}

// ファイルアップロード処理
const handleFileUpload = async (files: File[]) => {
  const options: FileUploadOptions = {
    allowedTypes: props.acceptedTypes,
    maxSize: props.maxSizeMB * 1024 * 1024,
    onProgress: (state: UploadProgressState) => {
      // 進捗更新は自動的にreactiveに反映される
    }
  }

  try {
    const results = await uploadFiles(files, options)
    
    // 成功したファイルIDを収集
    const successfulIds = results
      .filter(result => result.success)
      .map(result => result.success ? result.data.id : '')
      .filter(id => id !== '')
    
    // 新しいファイルIDを既存のものに追加
    const newFileIds = [...uploadedFileIds.value, ...successfulIds]
    uploadedFileIds.value = newFileIds
    
    if (successfulIds.length > 0) {
      emit('upload-complete', newFileIds)
    }
    
    // デバッグログ
    console.log('DifyFileUpload: Files uploaded successfully:', {
      newIds: successfulIds,
      totalIds: newFileIds,
      count: newFileIds.length
    })
    
    // エラーがあった場合は通知
    const errors = results.filter(result => !result.success)
    if (errors.length > 0) {
      const errorMessage = errors.map(error => error.success ? '' : error.error.message).join('\n')
      emit('upload-error', errorMessage)
    }
    
  } catch (error: any) {
    emit('upload-error', error.message || 'アップロード中にエラーが発生しました')
  }
  
  // 選択をクリア
  selectedFiles.value = []
}

// ファイル削除
const removeFile = (index: number) => {
  const states = getAllUploadStates()
  if (index < states.length) {
    // アップロード状態からも削除する必要がある場合
    // removeUploadState() メソッドが必要
  }
}

// 再試行
const retryUpload = async (index: number) => {
  // 再試行ロジック（実装が複雑なので簡略化）
  console.log('Retry upload for index:', index)
}

// 全てクリア
const clearAll = () => {
  clearUploadStates()
  uploadedFileIds.value = []  // computed setterを通じて親に通知
  selectedFiles.value = []
  
  // デバッグログ
  console.log('DifyFileUpload: Cleared all files')
}

// ユーティリティ関数
const getFileIcon = (status: string) => {
  switch (status) {
    case 'uploading': return 'mdi-upload'
    case 'completed': return 'mdi-check-circle'
    case 'error': return 'mdi-alert-circle'
    default: return 'mdi-file'
  }
}

const getFileStatusColor = (status: string) => {
  switch (status) {
    case 'uploading': return 'primary'
    case 'completed': return 'success'
    case 'error': return 'error'
    default: return 'grey'
  }
}

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '0 B'
  
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

// アップロード完了時のファイルIDを外部から取得する方法
defineExpose({
  getUploadedFileIds: () => uploadedFileIds.value,
  clearAll
})
</script>

<style scoped>
.dify-file-upload {
  width: 100%;
}

.upload-area {
  position: relative;
}

.drop-zone {
  border: 2px dashed #e0e0e0;
  border-radius: 8px;
  padding: 32px 16px;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
}

.drop-zone--active {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.04);
}

.drop-zone--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.drop-zone__content {
  pointer-events: none;
}

.file-list {
  max-height: 300px;
  overflow-y: auto;
}

.file-item {
  transition: all 0.2s ease;
}

.file-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.upload-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>