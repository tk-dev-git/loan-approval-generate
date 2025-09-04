# Dify Workflow API SSE Event Processing Fix Specification

## 概要

融資稟議書生成アプリケーションにおけるDify Workflow APIのSSE（Server-Sent Events）イベント処理の改修仕様書。
現在の実装では公式Dify仕様に準拠していない部分があり、標準的なSSE処理との互換性に問題がある。

## 問題分析

### 1. データ構造の非標準化

**現在の実装:**
```typescript
// サーバーからクライアントへの送信形式
{
  "difyEvent": {
    "event": "text_chunk",
    "data": {"text": "..."}
  },
  "timestamp": "2024-XX-XX"
}

// クライアントでの処理
data.difyEvent.event // 二重ネストでアクセス
```

**公式Dify仕様:**
```typescript
// 標準SSE形式（直接的）
data: {"event": "text_chunk", "task_id": "...", "data": {"text": "..."}}\n\n

// 標準アクセス
data.event // 直接アクセス
```

### 2. SSEイベント分離の不備

**問題点:**
- 現在は `\n` (シングル改行) でイベントを分離
- 公式仕様では `\n\n` (ダブル改行) でイベント分離
- ReadableStreamチャンク境界での行分割エラー

### 3. エラーハンドリングの非標準化

**現在:**
```typescript
// 独自エラー形式
{
  "event": "error",
  "data": {
    "code": "WORKFLOW_ERROR", 
    "message": "...",
    "details": "..."
  }
}
```

**公式仕様:**
```typescript
// 標準エラー形式
{
  "event": "error",
  "task_id": "...",
  "workflow_run_id": "...", 
  "data": {
    "status": 400,
    "code": "workflow_request_error",
    "message": "..."
  }
}
```

### 4. text_chunkイベント処理の冗長性

**問題:** 
- サーバー側で既に正しい構造のtext_chunkイベントを受信
- 不要なラッピング処理でデータ構造を複雑化
- クライアント側で二重解析が必要

## 公式仕様準拠の改修方針

### 1. 標準SSE形式への準拠

**目標:** Dify公式ドキュメントに完全準拠したSSE処理

**重要なイベントタイプ:**
- `workflow_started`: ワークフロー開始
- `node_started`: ノード実行開始  
- `text_chunk`: リアルタイムテキスト出力
- `node_finished`: ノード実行完了
- `workflow_finished`: ワークフロー完了
- `error`: エラー発生
- `ping`: 接続維持（10秒間隔）

### 2. 修正アプローチ

**A) サーバー側修正 (server/api/dify/workflow.post.ts)**
1. Difyからのイベントデータを直接転送（ラッピングなし）
2. 標準SSE形式でのイベント配信
3. 適切なイベント分離処理(`\n\n`)
4. 標準エラー形式の維持

**B) クライアント側修正 (composables/useDifyWorkflow.ts)**  
1. 標準イベント構造での処理(`data.event`直接アクセス)
2. チャンク分割ロジックの改善
3. エラーハンドリングの標準化
4. 接続切断処理の改善

## 詳細実装仕様

### A) サーバー側改修

**1. executeWorkflow関数の修正 (server/api/dify/workflow.post.ts:154-280)**

```typescript
// 修正前
await stream.push({
  event: difyEvent.event,
  data: JSON.stringify({
    difyEvent,
    timestamp: new Date().toISOString()
  })
})

// 修正後（標準SSE形式）
await stream.push({
  event: difyEvent.event,  
  data: JSON.stringify(difyEvent)  // 元のDifyイベントを直接転送
})
```

**2. チャンク分離処理の改善**

```typescript
// 修正前
const lines = chunk.split('\n')

// 修正後（バッファリング付き）
let eventBuffer = '';

const processStreamChunk = (chunk: string) => {
  eventBuffer += chunk;
  const events = eventBuffer.split('\n\n');
  eventBuffer = events.pop() || ''; // 未完了部分をバッファに保持
  
  for (const eventBlock of events) {
    const lines = eventBlock.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const eventData = line.slice(6).trim();
        // 処理続行
      }
    }
  }
}
```

**3. 標準エラー処理の実装**

```typescript
// Difyエラーイベントを標準形式で転送
if (difyEvent.event === 'error') {
  await stream.push({
    event: 'error',
    data: JSON.stringify(difyEvent)  // Difyの標準エラー形式を保持
  })
  break  // エラー時は処理終了
}
```

### B) クライアント側改修  

**1. useDifyWorkflow.ts の標準化 (composables/useDifyWorkflow.ts:30-388)**

```typescript
// 修正前のhandleWorkflowEvent
const handleWorkflowEvent = (data: any, options: WorkflowExecutionOptions) => {
  if (data.difyEvent) {
    const difyEvent = data.difyEvent as DifyWorkflowStreamEvent
    
// 修正後（標準イベント構造）
const handleWorkflowEvent = (event: DifyWorkflowStreamEvent, options: WorkflowExecutionOptions) => {
  eventLog.value.push(event)
  options.onEvent?.(event)
  
  switch (event.event) {
    case 'text_chunk':
      if (event.data?.text) {
        const chunkText = event.data.text
        
        // ストリーミングテキスト状態を更新
        streamingText.value = {
          fullText: streamingText.value.fullText + chunkText,
          chunks: [...streamingText.value.chunks, chunkText],
          isStreaming: true,
          lastUpdateTime: Date.now()
        }
        
        // コールバック呼び出し
        onTextChunk.value?.(streamingText.value.fullText)
        options.onTextChunk?.(streamingText.value.fullText, chunkText)
      }
      break
      
    case 'workflow_started':
      updateExecutionState({
        status: 'processing',
        currentStep: 'ワークフロー開始',
        progress: 5,
        taskId: event.task_id,
        workflowRunId: event.workflow_run_id
      })
      break
      
    // その他のイベント処理...
  }
}
```

**2. ストリーム処理の改善**

```typescript
// 修正前のevent data処理
const lines = chunk.split('\n')
for (const line of lines) {
  if (line.startsWith('data: ')) {
    const eventData = line.slice(6).trim()
    try {
      const data = JSON.parse(eventData)
      handleWorkflowEvent(data, options)

// 修正後（バッファリング対応）
let streamBuffer = ''

const processStreamData = (chunk: string) => {
  streamBuffer += chunk
  const events = streamBuffer.split('\n\n')
  streamBuffer = events.pop() || ''  // 未完了部分を保持
  
  for (const eventBlock of events) {
    const lines = eventBlock.split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const eventData = line.slice(6).trim()
        
        if (eventData === '[DONE]') {
          resolve(true)
          return
        }
        
        try {
          const event = JSON.parse(eventData) as DifyWorkflowStreamEvent
          handleWorkflowEvent(event, options)  // 直接イベントを渡す
        } catch (parseError) {
          console.warn('Failed to parse SSE event:', eventData, parseError)
        }
      }
    }
  }
}
```

## 型定義の更新 (types/dify.ts)

### 1. 標準イベント構造の明確化

```typescript
// 既存の型定義は適切だが、使用方法のコメントを追加

/**
 * text_chunk イベント（リアルタイムテキスト生成）
 * 公式仕様: data: {"event": "text_chunk", "task_id": "...", "data": {"text": "..."}}
 */
export interface DifyTextChunkEvent {
  event: 'text_chunk'
  task_id: string
  workflow_run_id?: string  // Workflowでは含まれる
  message_id?: string       // Chatでは含まれる
  data: {
    text: string
    from_variable_selector?: string[]  // テキストの出力元ノード情報
  }
}
```

### 2. 実行状態型の拡張

```typescript
// WorkflowExecutionStateにDify標準フィールドを追加
export interface WorkflowExecutionState {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  currentStep: string
  taskId?: string          // Dify task_id
  workflowRunId?: string   // Dify workflow_run_id
  messageId?: string       // Dify message_id (chat用)
  error?: string
  result?: any
  totalSteps: number
  currentStepIndex: number
  elapsedTime?: number
  totalTokens?: number
}
```

## 実装スケジュール

### Week 1: サーバー側改修
- [ ] server/api/dify/workflow.post.ts のexecuteWorkflow関数修正
- [ ] SSEイベント転送ロジックの標準化
- [ ] エラーハンドリングの改善

### Week 2: クライアント側改修
- [ ] composables/useDifyWorkflow.ts の標準化
- [ ] ストリーム処理ロジックの改善
- [ ] UI進捗表示の調整

### Week 3: 統合テスト・検証
- [ ] 各イベントタイプの動作確認
- [ ] パフォーマンステスト
- [ ] エラーケーステスト

## 成功指標

1. **機能性**: すべてのDifyイベントタイプが正常に処理される
2. **性能**: text_chunkの処理遅延が現状より改善される  
3. **信頼性**: エラー発生時の適切な復旧処理
4. **保守性**: 公式仕様準拠によるコードの理解しやすさ
5. **互換性**: 将来のDify APIアップデートへの対応力

## 最終確認項目

- [ ] 公式Dify SSE仕様への完全準拠
- [ ] 既存機能の動作確認（後方互換性）
- [ ] パフォーマンスの改善確認
- [ ] エラーハンドリングの改善確認
- [ ] ドキュメントの更新

---

**作成日**: 2025-09-04  
**対象バージョン**: Dify API v1  
**影響範囲**: server/api/dify/workflow.post.ts, composables/useDifyWorkflow.ts, types/dify.ts  
**推定工数**: 3週間（設計1週 + 実装2週）  
**優先度**: 高（機能の安定性・信頼性に直結）