// composables/useDifyWorkflow.ts
import type { 
  WorkflowExecutionState, 
  WorkflowExecutionOptions, 
  DifyWorkflowStreamEvent 
} from '~/types/dify'
import type { LoanApplicationForm } from '~/types/loan-application'

export const useDifyWorkflow = () => {
  // ワークフロー実行状態
  const executionState = ref<WorkflowExecutionState>({
    status: 'idle',
    progress: 0,
    currentStep: '待機中',
    totalSteps: 0,
    currentStepIndex: 0
  })

  // イベントログ
  const eventLog = ref<DifyWorkflowStreamEvent[]>([])
  
  // 実行結果
  const result = ref<any>(null)
  
  // エラー情報
  const error = ref<string | null>(null)

  /**
   * ワークフローを実行
   */
  const executeWorkflow = async (
    formData: LoanApplicationForm,
    fileIds: string[] = [],
    options: WorkflowExecutionOptions = {}
  ): Promise<boolean> => {
    try {
      // 状態をリセット
      resetState()
      
      // 実行中状態に設定
      executionState.value = {
        status: 'processing',
        progress: 0,
        currentStep: 'ワークフローを開始中...',
        totalSteps: 1,
        currentStepIndex: 0
      }

      // 簡易的なSSE実装（POSTサポート）
      const response = await fetch('/api/dify/workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({
          formData,
          fileIds
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return new Promise((resolve, reject) => {
        // タイムアウト処理
        const timeoutId = setTimeout(() => {
          updateExecutionState({
            status: 'error',
            currentStep: 'タイムアウトしました',
            progress: 0
          })
          error.value = 'ワークフローの実行がタイムアウトしました'
          reject(new Error('Workflow execution timeout'))
        }, options.timeout || 300000) // デフォルト5分

        // ReadableStreamを処理
        const processStream = async () => {
          if (!response.body) {
            throw new Error('Response body is null')
          }

          const reader = response.body.getReader()
          const decoder = new TextDecoder()

          try {
            while (true) {
              const { done, value } = await reader.read()
              
              if (done) {
                break
              }

              // チャンクを文字列に変換
              const chunk = decoder.decode(value, { stream: true })
              const lines = chunk.split('\n')

              for (const line of lines) {
                if (line.trim() === '') continue
                
                // SSEフォーマットをパース
                if (line.startsWith('data: ')) {
                  const eventData = line.slice(6).trim()
                  
                  if (eventData === '[DONE]') {
                    clearTimeout(timeoutId)
                    resolve(true)
                    return
                  }

                  try {
                    const data = JSON.parse(eventData)
                    handleWorkflowEvent(data, options)
                  } catch (parseError) {
                    console.warn('Failed to parse SSE data:', eventData, parseError)
                  }
                } else if (line.startsWith('event: ')) {
                  // イベントタイプの処理
                  const eventType = line.slice(7).trim()
                  console.log('SSE event type:', eventType)
                }
              }
            }
          } finally {
            reader.releaseLock()
          }
        }

        processStream().catch((err) => {
          clearTimeout(timeoutId)
          error.value = err.message || 'ストリーム処理エラー'
          updateExecutionState({
            status: 'error',
            currentStep: 'ストリーム処理エラー',
            progress: 0,
            error: error.value
          })
          reject(err)
        })
      })

    } catch (err: any) {
      console.error('Workflow execution error:', err)
      const errorMessage = err.message || 'ワークフローの実行に失敗しました'
      
      error.value = errorMessage
      updateExecutionState({
        status: 'error',
        currentStep: '実行エラー',
        progress: 0,
        error: errorMessage
      })
      
      return false
    }
  }

  /**
   * ワークフローイベントを処理
   */
  const handleWorkflowEvent = (data: any, options: WorkflowExecutionOptions) => {
    // イベントログに追加
    if (data.difyEvent) {
      eventLog.value.push(data.difyEvent)
      options.onEvent?.(data.difyEvent)
      
      const difyEvent = data.difyEvent as DifyWorkflowStreamEvent
      
      // イベントタイプに応じて状態を更新
      switch (difyEvent.event) {
        case 'workflow_started':
          updateExecutionState({
            status: 'processing',
            currentStep: 'ワークフロー開始',
            progress: 5
          })
          break
          
        case 'node_started':
          if ('data' in difyEvent && difyEvent.data) {
            updateExecutionState({
              currentStep: `${difyEvent.data.title}を実行中...`,
              currentStepIndex: difyEvent.data.index,
              totalSteps: Math.max(executionState.value.totalSteps, difyEvent.data.index + 1),
              progress: Math.min(90, 10 + (difyEvent.data.index * 80 / 10))
            })
          }
          break
          
        case 'node_finished':
          if ('data' in difyEvent && difyEvent.data) {
            updateExecutionState({
              currentStep: `${difyEvent.data.title}完了`,
              progress: Math.min(95, 20 + (difyEvent.data.index * 75 / 10))
            })
          }
          break
          
        case 'workflow_finished':
          if ('data' in difyEvent && difyEvent.data) {
            if (difyEvent.data.status === 'succeeded') {
              result.value = difyEvent.data.outputs
              updateExecutionState({
                status: 'completed',
                progress: 100,
                currentStep: 'ワークフロー完了',
                result: difyEvent.data.outputs,
                elapsedTime: difyEvent.data.elapsed_time,
                totalTokens: difyEvent.data.total_tokens
              })
            } else {
              error.value = difyEvent.data.error || 'ワークフローが失敗しました'
              updateExecutionState({
                status: 'error',
                currentStep: 'ワークフロー失敗',
                progress: 0,
                error: error.value
              })
            }
          }
          break
          
        case 'error':
          if ('data' in difyEvent && difyEvent.data) {
            const errorMessage = difyEvent.data.message || 'ワークフローエラーが発生しました'
            error.value = errorMessage
            updateExecutionState({
              status: 'error',
              currentStep: 'エラーが発生しました',
              progress: 0,
              error: errorMessage
            })
          }
          break
      }
      
      // 進捗コールバックを呼び出し
      options.onProgress?.(executionState.value)
    }
  }

  /**
   * 実行状態を更新
   */
  const updateExecutionState = (updates: Partial<WorkflowExecutionState>) => {
    executionState.value = { ...executionState.value, ...updates }
  }

  /**
   * 状態をリセット
   */
  const resetState = () => {
    executionState.value = {
      status: 'idle',
      progress: 0,
      currentStep: '待機中',
      totalSteps: 0,
      currentStepIndex: 0
    }
    eventLog.value = []
    result.value = null
    error.value = null
  }

  /**
   * 実行をキャンセル（可能な場合）
   */
  const cancelExecution = () => {
    if (executionState.value.status === 'processing') {
      updateExecutionState({
        status: 'error',
        currentStep: 'キャンセルされました',
        progress: 0,
        error: 'ユーザーによってキャンセルされました'
      })
      error.value = 'ユーザーによってキャンセルされました'
    }
  }

  /**
   * 進捗パーセンテージを計算
   */
  const progressPercentage = computed(() => {
    return Math.max(0, Math.min(100, executionState.value.progress))
  })

  /**
   * 実行中かどうか
   */
  const isExecuting = computed(() => {
    return executionState.value.status === 'processing'
  })

  /**
   * 完了かどうか
   */
  const isCompleted = computed(() => {
    return executionState.value.status === 'completed'
  })

  /**
   * エラー状態かどうか
   */
  const hasError = computed(() => {
    return executionState.value.status === 'error'
  })

  return {
    executionState: readonly(executionState),
    eventLog: readonly(eventLog),
    result: readonly(result),
    error: readonly(error),
    executeWorkflow,
    resetState,
    cancelExecution,
    progressPercentage,
    isExecuting,
    isCompleted,
    hasError
  }
}