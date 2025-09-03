<!-- pages/index.vue -->
<template>
  <v-container fluid class="pa-0">
    <v-row no-gutters class="fill-height">
      <!-- 左側: 入力フォーム -->
      <v-col cols="12" md="5" lg="4" class="loan-form-side">
        <div class="loan-form-container">
          <!-- フォームヘッダー -->
          <div class="form-header">
            <h1 class="form-title">融資稟議書</h1>
            <p class="form-subtitle">申込情報入力フォーム</p>
          </div>

          <!-- プログレス表示 -->
          <div class="form-progress">
            <div class="progress-text">
              入力進捗: {{ Math.round(overallProgress) }}%
            </div>
            <v-progress-linear
              :model-value="overallProgress"
              color="primary"
              height="6"
              rounded
            />
          </div>


          <!-- フォームセクション -->
          <div class="form-sections">
            <v-expansion-panels
              v-model="expandedPanels"
              multiple
              variant="accordion"
            >
              <v-expansion-panel
                v-for="(section, sectionIndex) in FORM_SECTIONS"
                :key="section.title"
                :value="sectionIndex"
                class="form-expansion-panel"
                :class="{
                  'section-completed': sectionCompletionStatus[sectionIndex]?.percentage === 100,
                  'section-has-errors': sectionCompletionStatus[sectionIndex]?.hasErrors,
                }"
              >
                <v-expansion-panel-title>
                  <div class="section-title">
                    {{ section.title }}
                  </div>
                  <div class="section-status">
                    <span class="status-text">
                      {{ sectionCompletionStatus[sectionIndex]?.filled || 0 }}/{{ section.fields.length }}
                    </span>
                    <v-icon
                      v-if="sectionCompletionStatus[sectionIndex]?.percentage === 100"
                      color="success"
                      class="status-icon"
                    >
                      mdi-check-circle
                    </v-icon>
                    <v-icon
                      v-else-if="sectionCompletionStatus[sectionIndex]?.hasErrors"
                      color="error"
                      class="status-icon"
                    >
                      mdi-alert-circle
                    </v-icon>
                    <v-icon
                      v-else
                      color="grey"
                      class="status-icon"
                    >
                      mdi-circle-outline
                    </v-icon>
                  </div>
                </v-expansion-panel-title>

                <v-expansion-panel-text>
                  <div
                    v-for="field in section.fields"
                    :key="field.variable"
                    class="form-field"
                    :class="{ 'number-field': field.type === 'number' }"
                  >
                    <!-- テキストフィールド -->
                    <v-text-field
                      v-if="field.type === 'text-input'"
                      v-model="formData[field.variable]"
                      :label="field.label"
                      :maxlength="field.maxLength"
                      :error-messages="errors[field.variable]"
                      variant="outlined"
                      color="primary"
                      @blur="validateSingleField(field.variable)"
                      @input="clearFieldError(field.variable)"
                    />

                    <!-- 数値フィールド -->
                    <v-text-field
                      v-else-if="field.type === 'number'"
                      v-model.number="formData[field.variable]"
                      :label="field.label"
                      :error-messages="errors[field.variable]"
                      type="number"
                      variant="outlined"
                      color="primary"
                      @blur="validateSingleField(field.variable)"
                      @input="clearFieldError(field.variable)"
                    />

                    <!-- テキストエリア -->
                    <v-textarea
                      v-else-if="field.type === 'paragraph'"
                      v-model="formData[field.variable]"
                      :label="field.label"
                      :maxlength="field.maxLength"
                      :error-messages="errors[field.variable]"
                      variant="outlined"
                      color="primary"
                      rows="3"
                      auto-grow
                      counter
                      @blur="validateSingleField(field.variable)"
                      @input="clearFieldError(field.variable)"
                    />

                    <!-- セレクト -->
                    <v-select
                      v-else-if="field.type === 'select'"
                      v-model="formData[field.variable]"
                      :label="field.label"
                      :items="field.options"
                      :error-messages="errors[field.variable]"
                      variant="outlined"
                      color="primary"
                      @blur="validateSingleField(field.variable)"
                      @update:model-value="clearFieldError(field.variable)"
                    />

                    <!-- ファイル選択 -->
                    <div v-else-if="field.type === 'file-list'">
                      <DifyFileUpload
                        v-model="uploadedFileIds"
                        :title="field.label"
                        :multiple="true"
                        :accepted-types="['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv']"
                        :max-size-mb="50"
                        placeholder="決算書（3期分）を選択してください"
                        @upload-complete="onFileUploadComplete"
                        @upload-error="onFileUploadError"
                      />
                      
                      <!-- エラーメッセージ -->
                      <v-messages
                        v-if="errors[field.variable]?.length"
                        :messages="errors[field.variable]"
                        color="error"
                        class="form-error-message mt-2"
                      />
                    </div>
                  </div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </div>

          <!-- 生成ボタン -->
          <div class="generate-button-container">
            <div class="button-group">
              <v-btn
                class="generate-button"
                :loading="isGenerating"
                :disabled="isGenerating"
                @click="generateReport"
              >
                <v-icon left>mdi-file-document-outline</v-icon>
                稟議書生成
              </v-btn>
              <v-btn
                class="clear-button"
                :disabled="isGenerating"
                @click="clearForm"
              >
                <v-icon left>mdi-refresh</v-icon>
                クリア
              </v-btn>
            </div>
          </div>
        </div>
      </v-col>

      <!-- 右側: レポート出力 -->
      <v-col cols="12" md="7" lg="8" class="report-output-side">
        <div class="report-container">
          <h2 class="report-title">融資稟議書ドラフト出力</h2>

          <!-- ワークフロー進捗表示 -->
          <DifyWorkflowProgress
            v-if="workflowExecutionState.status !== 'idle'"
            :execution-state="workflowExecutionState"
            :show-actions="true"
            class="mb-4"
            @retry="retryWorkflow"
            @cancel="cancelWorkflow"
            @reset="resetWorkflow"
          />

          <!-- ストリーミングMarkdown表示コンポーネント -->
          <DifyStreamingMarkdown
            :content="streamingReportText"
            :is-streaming="isStreaming"
            :show-actions="true"
            :auto-scroll="true"
            class="report-markdown-viewer"
          />
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useEventSource } from '@vueuse/core'
import { useLoanForm } from '~/composables/useLoanForm'

// Composableを使用
const {
  formData,
  errors,
  isGenerating,
  reportOutput,
  sectionCompletionStatus,
  validateForm,
  validateSingleField,
  createDifyWorkflowData,  // 新しい関数
  createSSEFormData,       // リネームされた関数
  loadFromStorage,
  saveToStorage,
  resetForm,
  FORM_SECTIONS,
} = useLoanForm()

// Dify Workflow用のComposableを使用
const {
  executionState: workflowExecutionState,
  executeWorkflow,
  resetState: resetWorkflowState,
  cancelExecution,
  isExecuting,
  isCompleted,
  hasError,
  result: workflowResult,
  streamingText,  // 追加
  setOnTextChunk  // 追加
} = useDifyWorkflow()

// ローカル状態
const expandedPanels = ref<number[]>([0, 1]) // デフォルトで最初の2つのパネルを展開
const uploadedFileIds = ref<string[]>([])

// ストリーミング関連の状態
const streamingReportText = ref('')
const isStreaming = ref(false)


// メッセージ
const defaultMessage = '稟議書が生成されるとここに表示されます。左側のフォームに必要な情報を入力し、「稟議書生成」ボタンをクリックしてください。'

// 背景画像
const backgroundImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCdBOe1qx2cc02yI7j79iZL7FEXPbLUc-gGjLOgOm86GJhBMkN_nYZFxmEMzttW3F149-GduxFZ4CrSCZDk666oVSxdaMsiIHBeZIAQKmSsiZ2rnOVNsZmXGRz4QdbeCLW6eBCHVexEOxcpaZ_C4eKq6s8nHZ6VSC1_LQzo0_wQi4wzmH6fNPVTRiO0UQkiXVgaVgGpqtJVzVbo3Kw44g3pa70xh1jXYDKrEqwoKhLIsmGMrR4jFcH-oNK9NVVn3-qrOxn9z08Hd5U'

// 計算プロパティ
const overallProgress = computed(() => {
  const totalFields = FORM_SECTIONS.reduce((sum, section) => sum + section.fields.length, 0)
  const filledFields = sectionCompletionStatus.value.reduce((sum, section) => sum + section.filled, 0)
  return (filledFields / totalFields) * 100
})

const reportCardStyle = computed(() => ({
  backgroundImage: `linear-gradient(0deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0) 100%), url('${backgroundImage}')`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
}))

// メソッド
const clearFieldError = (fieldName: keyof typeof formData) => {
  if (errors[fieldName]) {
    delete errors[fieldName]
  }
}

// Dify ファイルアップロード関連のイベントハンドラー
const onFileUploadComplete = (fileIds: string[]) => {
  uploadedFileIds.value = fileIds
  
  // formData.settlementにもファイルID情報を同期
  // 注意: 型定義上はFile[]だが、実際の運用ではファイルIDで管理
  formData.settlement = fileIds as any
  
  // 既存のエラーをクリア
  clearFieldError('settlement')
  
  // デバッグログ
  console.log('index.vue: File upload completed:', {
    fileIds,
    uploadedFileIdsValue: uploadedFileIds.value,
    formDataSettlement: formData.settlement,
    fileCount: fileIds.length
  })
}

const onFileUploadError = (error: string) => {
  console.error('index.vue: File upload error:', error)
  
  // ファイルアップロードエラー時の状態リセット
  uploadedFileIds.value = []
  formData.settlement = []
  
  // エラー表示のロジック（将来的にSnackbar等で通知可能）
  console.error('ファイルアップロードでエラーが発生しました:', error)
}

const clearForm = () => {
  // フォームリセット機能を呼び出し
  resetForm()
  // レポート出力もクリア
  reportOutput.value = ''
}

const formatReportOutput = (output: string): string => {
  return output
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/## (.*?)$/gm, '<h3 class="report-heading">$1</h3>')
}


// レポート生成
const generateReport = async () => {
  // バリデーション
  const validation = validateForm()
  if (!validation.isValid) {
    // エラーがあるセクションを展開
    const errorSections = sectionCompletionStatus.value
      .map((section, index) => section.hasErrors ? index : -1)
      .filter(index => index !== -1)
    
    expandedPanels.value = [...new Set([...expandedPanels.value, ...errorSections])]
    return
  }

  // ファイルIDの存在確認とデバッグログ
  console.log('generateReport: Starting report generation with:', {
    formDataFields: Object.keys(formData).filter(([key, value]) => value !== null && value !== ''),
    uploadedFileIds: uploadedFileIds.value,
    fileCount: uploadedFileIds.value.length,
    formDataSettlement: formData.settlement
  })
  
  if (uploadedFileIds.value.length === 0) {
    console.warn('generateReport: No uploaded files found, proceeding without files')
  }

  isGenerating.value = true
  streamingReportText.value = ''  // ストリーミングテキストをクリア

  try {
    // Dify Workflowを実行（最新のファイルIDで）
    console.log('generateReport: Executing Dify Workflow with fileIds:', uploadedFileIds.value)
    const success = await executeWorkflow(
      formData,
      uploadedFileIds.value,
      {
        onProgress: (state) => {
          console.log('Workflow progress:', state)
        },
        onEvent: (event) => {
          console.log('Workflow event:', event)
        },
        onTextChunk: (fullText, chunk) => {
          // text_chunkイベントのコールバック
          streamingReportText.value = fullText
          isStreaming.value = true
          console.log('generateReport: Received text chunk, total length:', fullText.length)
        }
      }
    )

    if (success) {
      isStreaming.value = false
      
      // 最終結果をストリーミングテキストに設定（必要に応じて）
      if (!streamingReportText.value && workflowResult.value) {
        const finalResult = workflowResult.value.streamingOutput || 
                           workflowResult.value.loan_report || 
                           workflowResult.value.report || 
                           workflowResult.value.output || ''
        streamingReportText.value = finalResult
      }
      
      // 既存のreportOutputも更新（後方互換性のため）
      reportOutput.value = streamingReportText.value
    }

  } catch (err: any) {
    console.error('Dify workflow error:', err)
    isStreaming.value = false
    
    // フォールバック: 従来のSSE方式を使用
    console.log('generateReport: Dify Workflow failed, falling back to SSE API')
    try {
      const formDataToSend = createSSEFormData()
      console.log('generateReport: Created SSE FormData, starting EventSource')
      
      const { data, error, close } = useEventSource('/api/generate-report', {
        method: 'POST',
        body: formDataToSend,
      })

      watch(data, (newData) => {
        if (newData) {
          try {
            const parsed = JSON.parse(newData)
            if (parsed.content) {
              reportOutput.value += parsed.content
              streamingReportText.value = reportOutput.value
            }
            if (parsed.done) {
              close()
              isGenerating.value = false
            }
          } catch (e) {
            console.error('SSE parse error:', e)
          }
        }
      })

      watch(error, (err) => {
        if (err) {
          console.error('SSE error:', err)
          isGenerating.value = false
          close()
        }
      })

    } catch (fallbackErr) {
      console.error('Fallback generate report error:', fallbackErr)
      isGenerating.value = false
    }
  } finally {
    isGenerating.value = false
  }
}

// ワークフローイベントハンドラー
const retryWorkflow = () => {
  generateReport()
}

const cancelWorkflow = () => {
  cancelExecution()
  isGenerating.value = false
}

const resetWorkflow = () => {
  resetWorkflowState()
  reportOutput.value = ''
  streamingReportText.value = ''
  isStreaming.value = false
}

// ストリーミング状態を監視
watch(() => streamingText.value.isStreaming, (streaming) => {
  isStreaming.value = streaming
})

// ライフサイクル
onMounted(() => {
  loadFromStorage()
  
  // ストリーミングテキストのコールバックを設定
  setOnTextChunk((text: string) => {
    streamingReportText.value = text
  })
})
</script>

<style scoped>
@import '~/assets/styles/form.scss';

.loan-form-side {
  background-color: #f8f9fa;
  min-height: 100vh;
}

.report-output-side {
  background-color: white;
  min-height: 100vh;
  padding: 24px;
}

.report-container {
  max-width: 1000px;
  margin: 0 auto;
}

.report-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 24px;
}

.button-group {
  display: flex;
  gap: 12px;
  align-items: center;
  
  .v-btn {
    flex: 1;
    height: 56px !important;
  }
}

.clear-button {
  background: linear-gradient(135deg, #f5f5f5, #e0e0e0) !important;
  color: #666 !important;
  font-size: 1.1rem !important;
  font-weight: 700 !important;
  letter-spacing: 0.5px !important;
  border-radius: 28px !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1) !important;
  transition: all 0.3s ease !important;
  
  &:hover {
    background: linear-gradient(135deg, #e8e8e8, #d5d5d5) !important;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15) !important;
    transform: translateY(-2px) !important;
  }
  
  &:disabled {
    background: #ccc !important;
    box-shadow: none !important;
    transform: none !important;
    opacity: 0.5;
  }
}


.report-markdown-viewer {
  height: calc(100vh - 250px);
  min-height: 500px;
}

/* レスポンシブ */
@media (max-width: 960px) {
  .loan-form-side,
  .report-output-side {
    min-height: auto;
  }
  
  .report-output-side {
    padding: 16px;
  }
  
}
</style>