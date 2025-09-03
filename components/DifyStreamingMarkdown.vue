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
    <div v-if="showActions && renderedContent" class="streaming-footer">
      <v-btn
        text
        small
        @click="copyToClipboard"
      >
        <v-icon left>mdi-content-copy</v-icon>
        コピー
      </v-btn>
      <v-btn
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
  gfm: true
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
    // Unicodeエスケープシーケンスをデコード
    const decodedContent = props.content.replace(/\\u([0-9a-fA-F]{4})/g, (match, code) => {
      return String.fromCharCode(parseInt(code, 16))
    })
    
    // Markdownをパース
    const rawHtml = marked(decodedContent) as string
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