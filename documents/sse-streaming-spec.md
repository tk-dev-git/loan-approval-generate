# Dify Workflow SSE ストリーミング処理改修仕様書

## 1. 概要

本仕様書は、Dify Workflow APIからのSSE（Server-Sent Events）レスポンスを適切にパースし、text_chunkイベントを処理してリアルタイムでMarkdown形式のテキストをUIに表示する機能の実装について記述します。

## 2. 現状の課題

### 2.1 未実装の機能
- **text_chunkイベントの処理**: Difyからのストリーミングテキストイベントが未処理
- **リアルタイム表示**: ストリーミング中のテキスト更新がUIに反映されない
- **Markdown変換**: テキストのMarkdown形式への変換とレンダリングが未実装

### 2.2 影響範囲
- ユーザーがレポート生成の進捗をリアルタイムで確認できない
- 長時間の処理で画面に何も表示されず、UXが低下
- 生成されたテキストのフォーマットが適切に表示されない

## 3. 改修内容

### 3.1 型定義の拡張 (types/dify.ts)

```typescript
// 追加する型定義
/**
 * text_chunk イベント
 */
export interface DifyTextChunkEvent {
  event: 'text_chunk'
  task_id: string
  message_id: string
  data: {
    text: string  // チャンクテキスト
    position: number  // テキストの位置（オプション）
    delta?: string  // 差分テキスト（オプション）
  }
}

// DifyWorkflowStreamEventユニオン型に追加
export type DifyWorkflowStreamEvent = 
  | DifyWorkflowRunEvent
  | DifyNodeStartEvent
  | DifyNodeFinishEvent
  | DifyWorkflowFinishEvent
  | DifyTextChunkEvent  // 追加
  | DifyTTSMessageEvent
  | DifyTTSMessageEndEvent
  | DifyErrorEvent
  | DifyPingEvent

// ストリーミングテキスト状態の追加
export interface StreamingTextState {
  fullText: string  // 蓄積された全テキスト
  chunks: string[]  // 受信したチャンクの配列
  isStreaming: boolean  // ストリーミング中かどうか
  lastUpdateTime: number  // 最終更新時刻
}
```

### 3.2 サーバー側API改修 (server/api/dify/workflow.post.ts)

```typescript
// executeWorkflow関数内のSSEパース処理を改修

// text_chunkイベントの明示的な処理を追加
if (line.startsWith('data: ')) {
  const eventData = line.slice(6).trim()
  
  try {
    const difyEvent: DifyWorkflowStreamEvent = JSON.parse(eventData)
    
    // text_chunkイベントの特別処理
    if (difyEvent.event === 'text_chunk') {
      await stream.push({
        event: 'text_chunk',
        data: JSON.stringify({
          difyEvent,
          timestamp: new Date().toISOString(),
          // チャンクテキストを明示的に含める
          text: difyEvent.data.text
        })
      })
    } else {
      // その他のイベントは従来通り転送
      await stream.push({
        event: difyEvent.event,
        data: JSON.stringify({
          difyEvent,
          timestamp: new Date().toISOString()
        })
      })
    }
  } catch (parseError) {
    console.warn('Failed to parse Dify event:', eventData, parseError)
  }
}
```

### 3.3 Composable改修 (composables/useDifyWorkflow.ts)

```typescript
export const useDifyWorkflow = () => {
  // ストリーミングテキスト状態を追加
  const streamingText = ref<StreamingTextState>({
    fullText: '',
    chunks: [],
    isStreaming: false,
    lastUpdateTime: Date.now()
  })

  // text_chunkコールバック用の関数を追加
  const onTextChunk = ref<((text: string) => void) | null>(null)

  const handleWorkflowEvent = (data: any, options: WorkflowExecutionOptions) => {
    if (data.difyEvent) {
      const difyEvent = data.difyEvent as DifyWorkflowStreamEvent
      
      switch (difyEvent.event) {
        case 'text_chunk':
          // text_chunkイベントの処理
          if ('data' in difyEvent && difyEvent.data) {
            const chunkText = difyEvent.data.text || ''
            
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
            
            // 進捗状態を更新
            updateExecutionState({
              currentStep: 'レポート生成中...',
              progress: Math.min(95, executionState.value.progress + 1)
            })
          }
          break
          
        case 'workflow_finished':
          // ワークフロー完了時にストリーミングを終了
          streamingText.value.isStreaming = false
          
          // 最終テキストがある場合は結果に設定
          if (streamingText.value.fullText) {
            result.value = {
              ...result.value,
              streamingOutput: streamingText.value.fullText
            }
          }
          // 既存の処理...
          break
          
        // 他のケース...
      }
    }
  }

  // ストリーミングテキストのリセット
  const resetState = () => {
    // 既存のリセット処理...
    streamingText.value = {
      fullText: '',
      chunks: [],
      isStreaming: false,
      lastUpdateTime: Date.now()
    }
  }

  // executeWorkflowのオプションにonTextChunkを追加
  interface WorkflowExecutionOptions {
    onProgress?: (state: WorkflowExecutionState) => void
    onEvent?: (event: DifyWorkflowStreamEvent) => void
    onTextChunk?: (fullText: string, chunk: string) => void  // 追加
    timeout?: number
  }

  return {
    // 既存のエクスポート...
    streamingText: readonly(streamingText),
    setOnTextChunk: (callback: (text: string) => void) => {
      onTextChunk.value = callback
    }
  }
}
```

### 3.4 Markdownレンダリングコンポーネント (components/DifyStreamingMarkdown.vue)

```vue
<template>
  <div class="streaming-markdown-container">
    <!-- ヘッダー -->
    <div class="streaming-header">
      <v-icon 
        v-if="isStreaming" 
        class="streaming-indicator"
        color="primary"
      >
        mdi-circle-slice-8
      </v-icon>
      <span class="streaming-status">
        {{ statusText }}
      </span>
    </div>

    <!-- コンテンツエリア -->
    <div 
      ref="contentRef"
      class="streaming-content"
      :class="{ 'is-streaming': isStreaming }"
    >
      <!-- Markdownレンダリング -->
      <div 
        v-if="renderedContent"
        class="markdown-body"
        v-html="renderedContent"
      />
      
      <!-- プレースホルダー -->
      <div 
        v-else 
        class="placeholder"
      >
        <v-icon size="48" color="grey">mdi-file-document-outline</v-icon>
        <p>レポートが生成されるとここに表示されます</p>
      </div>

      <!-- ストリーミングインジケーター -->
      <div 
        v-if="isStreaming && !hideIndicator" 
        class="streaming-cursor"
      >
        <span class="cursor-blink">▌</span>
      </div>
    </div>

    <!-- フッターアクション -->
    <div v-if="showActions" class="streaming-footer">
      <v-btn
        v-if="renderedContent"
        text
        small
        @click="copyToClipboard"
      >
        <v-icon left>mdi-content-copy</v-icon>
        コピー
      </v-btn>
      <v-btn
        v-if="renderedContent"
        text
        small
        @click="downloadAsMarkdown"
      >
        <v-icon left>mdi-download</v-icon>
        ダウンロード
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { marked } from 'marked'
import DOMPurify from 'dompurify'

interface Props {
  content: string
  isStreaming?: boolean
  showActions?: boolean
  hideIndicator?: boolean
  autoScroll?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  content: '',
  isStreaming: false,
  showActions: true,
  hideIndicator: false,
  autoScroll: true
})

const contentRef = ref<HTMLElement>()

// Markdown設定
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: true,
  mangle: false,
  sanitize: false
})

// 状態テキスト
const statusText = computed(() => {
  if (props.isStreaming) return 'レポート生成中...'
  if (props.content) return 'レポート生成完了'
  return '待機中'
})

// Markdownレンダリング
const renderedContent = computed(() => {
  if (!props.content) return ''
  
  try {
    // Markdownをパース
    const rawHtml = marked(props.content)
    // XSS対策でサニタイズ
    return DOMPurify.sanitize(rawHtml, {
      ADD_ATTR: ['target', 'rel'],
      ADD_TAGS: ['mark', 'kbd']
    })
  } catch (error) {
    console.error('Markdown parsing error:', error)
    return `<pre>${props.content}</pre>`
  }
})

// 自動スクロール
watch(() => props.content, () => {
  if (props.autoScroll && props.isStreaming && contentRef.value) {
    nextTick(() => {
      contentRef.value?.scrollTo({
        top: contentRef.value.scrollHeight,
        behavior: 'smooth'
      })
    })
  }
})

// クリップボードにコピー
const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(props.content)
    // 成功通知（Vuetifyのsnackbarなど）
  } catch (error) {
    console.error('Copy failed:', error)
  }
}

// Markdownファイルとしてダウンロード
const downloadAsMarkdown = () => {
  const blob = new Blob([props.content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `report_${new Date().toISOString().slice(0, 10)}.md`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped lang="scss">
.streaming-markdown-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.streaming-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}

.streaming-indicator {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.streaming-status {
  font-weight: 500;
  color: #666;
}

.streaming-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  position: relative;
  
  &.is-streaming {
    // ストリーミング中の微妙なアニメーション
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, 
        transparent 0%, 
        #FF6B35 50%, 
        transparent 100%
      );
      animation: shimmer 2s infinite;
    }
  }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.markdown-body {
  font-size: 16px;
  line-height: 1.6;
  color: #333;
  
  :deep(h1), :deep(h2), :deep(h3) {
    margin-top: 24px;
    margin-bottom: 16px;
    font-weight: 600;
    line-height: 1.25;
  }
  
  :deep(h1) { 
    font-size: 2em; 
    border-bottom: 1px solid #eaecef;
    padding-bottom: 0.3em;
  }
  
  :deep(h2) { 
    font-size: 1.5em;
    border-bottom: 1px solid #eaecef;
    padding-bottom: 0.3em;
  }
  
  :deep(h3) { font-size: 1.25em; }
  
  :deep(p) {
    margin-bottom: 16px;
  }
  
  :deep(ul), :deep(ol) {
    padding-left: 2em;
    margin-bottom: 16px;
  }
  
  :deep(li) {
    margin-bottom: 4px;
  }
  
  :deep(code) {
    padding: 0.2em 0.4em;
    margin: 0;
    font-size: 85%;
    background-color: rgba(27, 31, 35, 0.05);
    border-radius: 3px;
  }
  
  :deep(pre) {
    padding: 16px;
    overflow: auto;
    font-size: 85%;
    line-height: 1.45;
    background-color: #f6f8fa;
    border-radius: 6px;
  }
  
  :deep(blockquote) {
    padding: 0 1em;
    color: #6a737d;
    border-left: 0.25em solid #dfe2e5;
    margin-bottom: 16px;
  }
  
  :deep(table) {
    display: block;
    width: 100%;
    overflow: auto;
    margin-bottom: 16px;
    
    th, td {
      padding: 6px 13px;
      border: 1px solid #dfe2e5;
    }
    
    th {
      font-weight: 600;
      background-color: #f6f8fa;
    }
    
    tr {
      background-color: #fff;
      border-top: 1px solid #c6cbd1;
      
      &:nth-child(2n) {
        background-color: #f6f8fa;
      }
    }
  }
  
  :deep(strong) {
    font-weight: 600;
    color: #FF6B35;
  }
  
  :deep(em) {
    font-style: italic;
  }
  
  :deep(hr) {
    height: 0.25em;
    padding: 0;
    margin: 24px 0;
    background-color: #e1e4e8;
    border: 0;
  }
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #999;
  
  p {
    margin-top: 16px;
    font-size: 14px;
  }
}

.streaming-cursor {
  display: inline-block;
  margin-left: 2px;
  
  .cursor-blink {
    animation: blink 1s infinite;
    color: #FF6B35;
    font-weight: bold;
  }
}

@keyframes blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

.streaming-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
}

// レスポンシブ対応
@media (max-width: 768px) {
  .streaming-content {
    padding: 16px;
  }
  
  .markdown-body {
    font-size: 14px;
  }
}
</style>
```

### 3.5 ページ統合 (pages/index.vue)

```vue
<!-- 右側: レポート出力セクションを修正 -->
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

<script setup lang="ts">
// ストリーミング関連の状態を追加
const streamingReportText = ref('')
const isStreaming = ref(false)

// useDifyWorkflowからストリーミングテキスト状態を取得
const {
  executionState: workflowExecutionState,
  executeWorkflow,
  streamingText,  // 追加
  setOnTextChunk,  // 追加
  // 他の既存のプロパティ...
} = useDifyWorkflow()

// ストリーミングテキストのコールバックを設定
onMounted(() => {
  setOnTextChunk((text: string) => {
    streamingReportText.value = text
  })
})

// ストリーミング状態を監視
watch(() => streamingText.value.isStreaming, (streaming) => {
  isStreaming.value = streaming
})

// レポート生成メソッドを修正
const generateReport = async () => {
  // 既存のバリデーション処理...
  
  isGenerating.value = true
  streamingReportText.value = ''  // ストリーミングテキストをクリア
  
  try {
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
        }
      }
    )
    
    // 完了後の処理...
    if (success) {
      isStreaming.value = false
      // 最終結果をストリーミングテキストに設定（必要に応じて）
      if (!streamingReportText.value && workflowResult.value) {
        streamingReportText.value = workflowResult.value.loan_report || 
                                   workflowResult.value.report || 
                                   workflowResult.value.output || ''
      }
    }
    
  } catch (err: any) {
    console.error('Workflow error:', err)
    isStreaming.value = false
  } finally {
    isGenerating.value = false
  }
}
</script>

<style scoped>
.report-markdown-viewer {
  height: calc(100vh - 250px);
  min-height: 500px;
}
</style>
```

### 3.6 パッケージ追加 (package.json)

```json
{
  "dependencies": {
    "marked": "^12.0.0",
    "dompurify": "^3.0.9"
  },
  "devDependencies": {
    "@types/marked": "^6.0.0",
    "@types/dompurify": "^3.0.5"
  }
}
```

インストールコマンド:
```bash
npm install marked dompurify
npm install -D @types/marked @types/dompurify
```

## 4. 実装チェックリスト

### Phase 1: 基盤整備
- [ ] types/dify.tsにtext_chunkイベント型を追加
- [ ] StreamingTextState型を定義
- [ ] パッケージのインストール (marked, dompurify)

### Phase 2: サーバー側実装
- [ ] server/api/dify/workflow.post.tsでtext_chunkイベント処理を追加
- [ ] SSEストリームでのtext_chunk転送を実装
- [ ] エラーハンドリングの強化

### Phase 3: クライアント側実装
- [ ] composables/useDifyWorkflow.tsにストリーミング処理を追加
- [ ] onTextChunkコールバック機能を実装
- [ ] streamingText状態管理を追加

### Phase 4: UIコンポーネント実装
- [ ] DifyStreamingMarkdown.vueコンポーネントを作成
- [ ] Markdownレンダリング機能を実装
- [ ] 自動スクロール機能を実装
- [ ] コピー・ダウンロード機能を追加

### Phase 5: 統合とテスト
- [ ] pages/index.vueにコンポーネントを統合
- [ ] ストリーミング状態の連携を実装
- [ ] エンドツーエンドのテスト実施
- [ ] パフォーマンス最適化

## 5. テストシナリオ

### 5.1 基本動作テスト
1. レポート生成を開始
2. text_chunkイベントがリアルタイムで表示されることを確認
3. Markdown形式が正しくレンダリングされることを確認
4. 自動スクロールが機能することを確認

### 5.2 エラーハンドリングテスト
1. ネットワークエラー時の挙動確認
2. 不正なMarkdown形式の処理確認
3. タイムアウト時の処理確認

### 5.3 パフォーマンステスト
1. 大量のtext_chunkイベント処理
2. 長文Markdownのレンダリング性能
3. メモリリークの確認

## 6. 注意事項

### 6.1 セキュリティ
- XSS対策としてDOMPurifyでHTMLをサニタイズ
- ユーザー入力を直接HTMLとして表示しない

### 6.2 パフォーマンス
- text_chunkの頻度が高い場合はデバウンス処理を検討
- 長文の場合は仮想スクロールの導入を検討

### 6.3 互換性
- 既存のワークフロー処理との後方互換性を維持
- text_chunkイベントがない場合でも正常動作すること

## 7. 今後の拡張案

- リアルタイムプレビューのon/off切り替え
- Markdownエディタ機能の追加
- PDFエクスポート機能
- 複数フォーマット（HTML、Word）への対応
- ストリーミング中の一時停止・再開機能