<template>
  <v-card class="dify-workflow-progress">
    <v-card-text>
      <div class="progress-header d-flex justify-space-between align-center mb-4">
        <div>
          <h3 class="text-h6 mb-1">ワークフロー実行状況</h3>
          <p class="text-body-2 text-medium-emphasis mb-0">{{ currentStep }}</p>
        </div>
        <div class="status-indicator">
          <v-chip
            :color="getStatusColor(status)"
            :variant="status === 'processing' ? 'elevated' : 'outlined'"
            size="small"
          >
            <v-icon start :icon="getStatusIcon(status)" />
            {{ getStatusText(status) }}
          </v-chip>
        </div>
      </div>

      <!-- 進捗バー -->
      <div class="progress-section mb-4">
        <div class="d-flex justify-space-between align-center mb-2">
          <span class="text-body-2">全体進捗</span>
          <span class="text-body-2 font-weight-medium">{{ Math.round(progress) }}%</span>
        </div>
        <v-progress-linear
          :model-value="progress"
          :color="getProgressColor(status)"
          height="8"
          rounded
          :indeterminate="status === 'processing' && progress === 0"
        />
        <div v-if="totalSteps > 0" class="text-caption text-center mt-1">
          ステップ {{ currentStepIndex + 1 }} / {{ totalSteps }}
        </div>
      </div>

      <!-- 実行時間・トークン情報 -->
      <div v-if="elapsedTime || totalTokens" class="execution-info mb-4">
        <v-row class="text-body-2">
          <v-col v-if="elapsedTime" cols="6">
            <div class="d-flex align-center">
              <v-icon size="16" class="me-1">mdi-clock-outline</v-icon>
              実行時間: {{ formatDuration(elapsedTime) }}
            </div>
          </v-col>
          <v-col v-if="totalTokens" cols="6">
            <div class="d-flex align-center">
              <v-icon size="16" class="me-1">mdi-format-text</v-icon>
              トークン: {{ totalTokens.toLocaleString() }}
            </div>
          </v-col>
        </v-row>
      </div>

      <!-- エラーメッセージ -->
      <v-alert
        v-if="status === 'error' && error"
        type="error"
        variant="tonal"
        class="mb-4"
      >
        <div class="d-flex align-center">
          <v-icon class="me-2">mdi-alert-circle</v-icon>
          <div>
            <div class="font-weight-medium">エラーが発生しました</div>
            <div class="text-body-2">{{ error }}</div>
          </div>
        </div>
      </v-alert>

      <!-- ワークフロー結果（完了時） -->
      <div v-if="status === 'completed' && result" class="workflow-result">
        <v-expansion-panels variant="accordion">
          <v-expansion-panel>
            <v-expansion-panel-title>
              <div class="d-flex align-center">
                <v-icon class="me-2" color="success">mdi-check-circle</v-icon>
                実行結果を表示
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <pre class="result-content">{{ JSON.stringify(result, null, 2) }}</pre>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>

      <!-- アクションボタン -->
      <div v-if="showActions" class="actions mt-4">
        <v-btn
          v-if="status === 'error'"
          color="primary"
          variant="elevated"
          @click="$emit('retry')"
        >
          <v-icon start>mdi-refresh</v-icon>
          再実行
        </v-btn>
        <v-btn
          v-if="status === 'processing'"
          color="error"
          variant="outlined"
          @click="$emit('cancel')"
        >
          <v-icon start>mdi-stop</v-icon>
          キャンセル
        </v-btn>
        <v-btn
          v-if="status === 'completed'"
          color="success"
          variant="outlined"
          @click="$emit('reset')"
        >
          <v-icon start>mdi-refresh</v-icon>
          新しい実行
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { WorkflowExecutionState } from '~/types/dify'

interface Props {
  executionState: WorkflowExecutionState
  showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showActions: true
})

const emit = defineEmits<{
  retry: []
  cancel: []
  reset: []
}>()

// 計算プロパティで状態を取得
const status = computed(() => props.executionState.status)
const progress = computed(() => props.executionState.progress)
const currentStep = computed(() => props.executionState.currentStep)
const currentStepIndex = computed(() => props.executionState.currentStepIndex)
const totalSteps = computed(() => props.executionState.totalSteps)
const elapsedTime = computed(() => props.executionState.elapsedTime)
const totalTokens = computed(() => props.executionState.totalTokens)
const error = computed(() => props.executionState.error)
const result = computed(() => props.executionState.result)

// ステータスに応じた色とアイコンを取得
const getStatusColor = (status: string) => {
  switch (status) {
    case 'idle': return 'grey'
    case 'processing': return 'primary'
    case 'completed': return 'success'
    case 'error': return 'error'
    default: return 'grey'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'idle': return 'mdi-sleep'
    case 'processing': return 'mdi-loading'
    case 'completed': return 'mdi-check-circle'
    case 'error': return 'mdi-alert-circle'
    default: return 'mdi-help-circle'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'idle': return '待機中'
    case 'processing': return '実行中'
    case 'completed': return '完了'
    case 'error': return 'エラー'
    default: return '不明'
  }
}

const getProgressColor = (status: string) => {
  switch (status) {
    case 'processing': return 'primary'
    case 'completed': return 'success'
    case 'error': return 'error'
    default: return 'grey'
  }
}

// 実行時間をフォーマット
const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}秒`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}分${remainingSeconds}秒`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}時間${minutes}分`
  }
}
</script>

<style scoped>
.dify-workflow-progress {
  width: 100%;
  min-height: 200px;
}

.progress-header {
  min-height: 60px;
}

.status-indicator {
  flex-shrink: 0;
}

.progress-section {
  position: relative;
}

.execution-info {
  background-color: rgba(var(--v-theme-surface-variant), 0.1);
  border-radius: 8px;
  padding: 12px;
}

.workflow-result {
  max-height: 300px;
  overflow-y: auto;
}

.result-content {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.4;
  background-color: rgba(var(--v-theme-surface-variant), 0.1);
  padding: 16px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

/* アニメーション */
.v-progress-linear {
  transition: all 0.3s ease;
}

.status-indicator .v-chip {
  transition: all 0.3s ease;
}

/* 処理中のアニメーション */
.status-indicator .v-chip[data-status="processing"] {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}
</style>