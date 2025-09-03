// Dify API関連の型定義

/**
 * Dify File Upload API のレスポンス
 */
export interface DifyFileUploadResponse {
  id: string
  name: string
  size: number
  extension: string
  mime_type: string
  created_by: string
  created_at: number
}

/**
 * Dify File Upload API のエラーレスポンス
 */
export interface DifyFileUploadError {
  code: string
  message: string
  status: number
}

/**
 * ファイルアップロードの結果
 */
export type FileUploadResult = {
  success: true
  data: DifyFileUploadResponse
} | {
  success: false
  error: DifyFileUploadError
}

/**
 * Dify Workflow API の実行リクエスト
 */
export interface DifyWorkflowRequest {
  inputs: Record<string, any>
  response_mode: 'streaming' | 'blocking'
  user: string
  files?: Array<{
    type: 'image' | 'document' | 'audio' | 'video'
    transfer_method: 'remote_url' | 'local_file'
    url?: string
    upload_file_id?: string
  }>
}

/**
 * Dify Workflow API のストリーミングレスポンス（イベントタイプ）
 */
export type DifyWorkflowStreamEvent = 
  | DifyWorkflowRunEvent
  | DifyNodeStartEvent
  | DifyNodeFinishEvent
  | DifyWorkflowFinishEvent
  | DifyTTSMessageEvent
  | DifyTTSMessageEndEvent
  | DifyErrorEvent
  | DifyPingEvent

/**
 * workflow_started イベント
 */
export interface DifyWorkflowRunEvent {
  event: 'workflow_started'
  task_id: string
  workflow_run_id: string
  data: {
    id: string
    workflow_id: string
    status: 'running' | 'succeeded' | 'failed' | 'stopped'
    outputs?: any
    error?: string
    elapsed_time: number
    total_tokens: number
    total_steps: number
    created_at: number
    finished_at?: number
  }
}

/**
 * node_started イベント
 */
export interface DifyNodeStartEvent {
  event: 'node_started'
  task_id: string
  workflow_run_id: string
  data: {
    id: string
    node_id: string
    node_type: string
    title: string
    index: number
    predecessor_node_id?: string
    inputs: any
    created_at: number
  }
}

/**
 * node_finished イベント
 */
export interface DifyNodeFinishEvent {
  event: 'node_finished'
  task_id: string
  workflow_run_id: string
  data: {
    id: string
    node_id: string
    node_type: string
    title: string
    index: number
    predecessor_node_id?: string
    inputs: any
    process_data?: any
    outputs: any
    status: 'running' | 'succeeded' | 'failed'
    error?: string
    elapsed_time: number
    execution_metadata: {
      total_tokens: number
      total_price: string
      currency: string
    }
    created_at: number
    finished_at: number
  }
}

/**
 * workflow_finished イベント
 */
export interface DifyWorkflowFinishEvent {
  event: 'workflow_finished'
  task_id: string
  workflow_run_id: string
  data: {
    id: string
    workflow_id: string
    status: 'succeeded' | 'failed' | 'stopped'
    outputs: any
    error?: string
    elapsed_time: number
    total_tokens: number
    total_steps: number
    created_at: number
    finished_at: number
  }
}

/**
 * tts_message イベント
 */
export interface DifyTTSMessageEvent {
  event: 'tts_message'
  task_id: string
  message_id: string
  audio: string
}

/**
 * tts_message_end イベント
 */
export interface DifyTTSMessageEndEvent {
  event: 'tts_message_end'
  task_id: string
  message_id: string
  audio: string
}

/**
 * error イベント
 */
export interface DifyErrorEvent {
  event: 'error'
  task_id: string
  workflow_run_id: string
  data: {
    status: number
    code: string
    message: string
  }
}

/**
 * ping イベント
 */
export interface DifyPingEvent {
  event: 'ping'
}

/**
 * ワークフロー実行状態
 */
export interface WorkflowExecutionState {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  currentStep: string
  taskId?: string
  workflowRunId?: string
  error?: string
  result?: any
  totalSteps: number
  currentStepIndex: number
  elapsedTime?: number
  totalTokens?: number
}

/**
 * アップロード進捗状態
 */
export interface UploadProgressState {
  status: 'idle' | 'uploading' | 'completed' | 'error'
  progress: number
  fileName?: string
  fileSize?: number
  uploadedSize?: number
  speed?: number
  error?: string
  fileId?: string
}

/**
 * ファイルアップロードのオプション
 */
export interface FileUploadOptions {
  onProgress?: (progress: UploadProgressState) => void
  allowedTypes?: string[]
  maxSize?: number
  timeout?: number
}

/**
 * ワークフロー実行のオプション
 */
export interface WorkflowExecutionOptions {
  onProgress?: (state: WorkflowExecutionState) => void
  onEvent?: (event: DifyWorkflowStreamEvent) => void
  timeout?: number
  user?: string
}

/**
 * Dify API設定
 */
export interface DifyApiConfig {
  baseUrl: string
  apiKey: string
  timeout?: number
  workflowId?: string
}

/**
 * エラーハンドリング用のユニオン型
 */
export type ApiResult<T> = {
  success: true
  data: T
} | {
  success: false
  error: {
    code: string
    message: string
    status?: number
  }
}

/**
 * SSEイベントデータ
 */
export interface SSEEventData {
  event: string
  data: string
  id?: string
  retry?: number
}