# 入力フォーム データ送信問題 分析・改修仕様書

**作成日**: 2025-09-03  
**対象**: loan-approval-generate アプリケーション  
**問題**: 入力フォームで入力された属性やファイルがDify アップロード及びWorkflow APIに適切に渡されていない

## 🔍 **問題分析**

### 1. ファイルアップロード状態管理の分離

**問題箇所**: `components/DifyFileUpload.vue` ⇄ `pages/index.vue`

**現状の問題**:
```typescript
// DifyFileUpload.vue:212行目
const uploadedFileIds = ref<string[]>([])  // 内部状態

// index.vue:257行目 
const uploadedFileIds = ref<string[]>([])  // 別の独立した状態
```

**問題の詳細**:
- DifyFileUploadコンポーネント内部で管理されるファイルID配列
- 親コンポーネント（index.vue）で管理される別のファイルID配列
- `upload-complete`イベントで通知されるが、状態の同期が不完全

### 2. API間のデータフォーマット不一致

**Dify Workflow API** (`/api/dify/workflow`):
```typescript
// 期待するデータ形式
{
  formData: LoanApplicationForm,  // JSON構造
  fileIds: string[]               // ファイルID配列
}
```

**SSE API** (`/api/generate-report`):
```typescript
// 期待するデータ形式
FormData {
  settlement: File[],     // ファイルオブジェクト
  company_name: string,   // フラットな文字列データ
  ...
}
```

### 3. データ変換関数の不足

**現状**: `useLoanForm.ts`の`createFormData()`関数
- SSE API専用のFormData作成のみ
- Dify Workflow API用のJSON形式データ作成関数が不足

**コード分析**:
```typescript
// useLoanForm.ts:143-165 createFormData()
// ❌ 問題: settlement フィールドでFile[]を送信
if (key === 'settlement') {
  if (Array.isArray(value)) {
    value.forEach((file) => {
      formDataToSend.append('settlement', file)  // File オブジェクト
    })
  }
}
```

### 4. generateReport()関数のデータ受け渡し不備

**現状フロー**:
```typescript
// index.vue:336-338
const success = await executeWorkflow(
  formData,                // ✅ LoanApplicationForm
  uploadedFileIds.value,   // ❌ 空配列または古い値の可能性
  { ... }
)
```

**問題**:
- `uploadedFileIds.value`が最新のファイルIDを反映していない
- ファイルアップロード完了とWorkflow実行のタイミング不一致

## 🛠️ **改修仕様**

### Phase 1: ファイル状態管理の統合

**1-1. DifyFileUpload.vue の修正**

**Props追加**:
```typescript
interface Props {
  // 既存props...
  modelValue?: string[]  // 外部からのファイルID配列
}

const emit = defineEmits<{
  'upload-complete': [fileIds: string[]]
  'upload-error': [error: string]
  'update:modelValue': [fileIds: string[]]  // 双方向バインディング
}>()
```

**内部状態の修正**:
```typescript
// props.modelValueを監視して内部状態を同期
const uploadedFileIds = computed({
  get: () => props.modelValue || [],
  set: (value) => emit('update:modelValue', value)
})
```

**1-2. index.vue の修正**

**ファイルID管理の改善**:
```vue
<DifyFileUpload
  v-model="uploadedFileIds"  <!-- v-modelで双方向バインディング -->
  :title="field.label"
  @upload-complete="onFileUploadComplete"
  @upload-error="onFileUploadError"
/>
```

**onFileUploadComplete の改善**:
```typescript
const onFileUploadComplete = (fileIds: string[]) => {
  uploadedFileIds.value = fileIds
  
  // formData.settlementにもファイルID情報を反映
  // （File[]ではなくファイルIDの参照として管理）
  formData.settlement = fileIds as any  // 型調整が必要
  
  clearFieldError('settlement')
  
  // デバッグログ
  console.log('File upload completed:', { fileIds, formDataSettlement: formData.settlement })
}
```

### Phase 2: データ作成関数の分離

**2-1. useLoanForm.ts に新関数追加**

**Dify Workflow用データ作成**:
```typescript
// Dify Workflow API用のデータ作成（JSON形式）
const createDifyWorkflowData = (fileIds: string[] = []) => {
  return {
    formData,      // reactive data そのまま
    fileIds        // 引数で受け取ったファイルID配列
  }
}
```

**2-2. 既存関数の役割明確化**

```typescript
// SSE API専用に名前変更
const createSSEFormData = (): FormData => {
  // 既存のcreateFormData()の内容をそのまま
  // 名前を変更してSSE専用であることを明確化
}
```

### Phase 3: generateReport()の修正

**3-1. データ送信前の検証**

```typescript
const generateReport = async () => {
  // 既存のバリデーション...
  
  // ファイルID存在確認
  if (uploadedFileIds.value.length === 0) {
    console.warn('No uploaded files found')
  }
  
  // デバッグログ
  console.log('Starting workflow with:', {
    formData: formData,
    fileIds: uploadedFileIds.value,
    fileCount: uploadedFileIds.value.length
  })
  
  // Dify Workflowを実行
  const success = await executeWorkflow(
    formData,
    uploadedFileIds.value,  // 最新の値を確実に渡す
    { onTextChunk, onProgress, onEvent }
  )
  
  if (!success) {
    // フォールバック時のデータ変換
    console.log('Falling back to SSE API')
    const sseFormData = createSSEFormData()
    // 既存のSSE処理...
  }
}
```

### Phase 4: エラーハンドリングの強化

**4-1. 段階別ログ出力**

```typescript
// 各段階でのデータ状態確認
const logDataState = (phase: string) => {
  console.log(`[${phase}] Data state:`, {
    formDataFields: Object.keys(formData).length,
    fileIds: uploadedFileIds.value,
    fileCount: uploadedFileIds.value.length,
    settlementField: formData.settlement
  })
}
```

**4-2. Workflow API失敗時の詳細エラー**

```typescript
// server/api/dify/workflow.post.ts の改善
console.log('Workflow request payload:', {
  inputStructure: Object.keys(request.inputs),
  fileCount: request.files?.length || 0,
  fileIds: body.fileIds
})
```

## 📋 **実装チェックリスト**

- [ ] DifyFileUpload.vueにv-model対応追加
- [ ] index.vueのファイルアップロード処理修正
- [ ] useLoanForm.tsにcreateDifyWorkflowData()追加
- [ ] createFormData()をcreateSSEFormData()にリネーム
- [ ] generateReport()の検証・ログ追加
- [ ] Workflow APIのデバッグログ追加
- [ ] 動作テスト: ファイルアップロード→レポート生成
- [ ] エラーケーステスト: ファイルなし、API失敗時の挙動確認

## 🎯 **期待される改善効果**

1. **ファイル送信の確実性**: アップロードしたファイルがWorkflow APIに確実に送信
2. **データ整合性**: フォーム入力とAPI送信データの完全な同期  
3. **デバッグ可能性**: 問題発生時の原因特定が容易
4. **保守性**: API別のデータ形式が明確に分離され、将来の変更が安全