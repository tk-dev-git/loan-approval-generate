// 融資申込フォーム管理のcomposable
import { ref, reactive, watch, computed } from 'vue'
import type { 
  LoanApplicationForm, 
  ValidationResult, 
  FieldDefinition 
} from '~/types/loan-application'
import { 
  DEFAULT_FORM_DATA, 
  FORM_SECTIONS 
} from '~/types/loan-application'

const STORAGE_KEY = 'loan-application-form'

export const useLoanForm = () => {
  // フォームデータ
  const formData = reactive<LoanApplicationForm>({ ...DEFAULT_FORM_DATA })
  
  // UI状態管理
  const isGenerating = ref(false)
  const reportOutput = ref('')
  
  // エラー管理
  const errors = reactive<Record<string, string[]>>({})
  
  // LocalStorage関連
  const loadFromStorage = () => {
    if (import.meta.client) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsedData = JSON.parse(saved)
          // ファイル以外のデータを復元
          Object.keys(parsedData).forEach(key => {
            if (key !== 'settlement') {
              (formData as any)[key] = parsedData[key]
            }
          })
        }
      } catch (error) {
        console.warn('Failed to load form data from localStorage:', error)
      }
    }
  }
  
  const saveToStorage = () => {
    if (import.meta.client) {
      try {
        // ファイル以外のデータを保存
        const dataToSave = { ...formData }
        delete (dataToSave as any).settlement // ファイルは保存しない
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
      } catch (error) {
        console.warn('Failed to save form data to localStorage:', error)
      }
    }
  }
  
  // 自動保存（30秒ごと）
  let saveTimer: NodeJS.Timeout | null = null
  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(saveToStorage, 30000) // 30秒後に保存
  }
  
  // バリデーション関数
  const validateField = (field: FieldDefinition, value: any): string[] => {
    const fieldErrors: string[] = []
    
    // 必須チェック
    if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      fieldErrors.push('必須項目です')
    }
    
    if (value && typeof value === 'string') {
      // 最大長チェック
      if (value.length > field.maxLength) {
        fieldErrors.push(`${field.maxLength}文字以内で入力してください`)
      }
    }
    
    // 数値フィールドのチェック
    if (field.type === 'number' && value !== null && value !== '') {
      if (isNaN(Number(value))) {
        fieldErrors.push('数値を入力してください')
      } else if (Number(value) < 0) {
        fieldErrors.push('0以上の数値を入力してください')
      }
    }
    
    // ファイル数チェック
    if (field.type === 'file-list' && Array.isArray(value)) {
      if (value.length > field.maxLength) {
        fieldErrors.push(`${field.maxLength}ファイル以内で選択してください`)
      }
    }
    
    return fieldErrors
  }
  
  const validateForm = (): ValidationResult => {
    const newErrors: Record<string, string[]> = {}
    let isValid = true
    
    FORM_SECTIONS.forEach(section => {
      section.fields.forEach(field => {
        const fieldErrors = validateField(field, formData[field.variable])
        if (fieldErrors.length > 0) {
          newErrors[field.variable] = fieldErrors
          isValid = false
        }
      })
    })
    
    // エラー状態を更新
    Object.keys(errors).forEach(key => {
      delete errors[key]
    })
    Object.keys(newErrors).forEach(key => {
      errors[key] = newErrors[key]
    })
    
    return { isValid, errors: newErrors }
  }
  
  // フィールド別バリデーション
  const validateSingleField = (fieldName: keyof LoanApplicationForm) => {
    const field = FORM_SECTIONS
      .flatMap(section => section.fields)
      .find(f => f.variable === fieldName)
    
    if (field) {
      const fieldErrors = validateField(field, formData[fieldName])
      if (fieldErrors.length > 0) {
        errors[fieldName] = fieldErrors
      } else {
        delete errors[fieldName]
      }
    }
  }
  
  // Dify Workflow API用データ作成（JSON形式）
  const createDifyWorkflowData = (fileIds: string[] = []) => {
    // Dify Workflow APIに送信するJSONデータを作成
    console.log('createDifyWorkflowData: Creating data with fileIds:', fileIds)
    
    return {
      formData: {
        // 基本フィールド（nullや空文字列を除外）
        ...Object.fromEntries(
          Object.entries(formData).filter(([key, value]) => 
            key !== 'settlement' && value !== null && value !== ''
          )
        )
      },
      fileIds  // アップロード済みファイルID配列
    }
  }
  
  // SSE API用データ作成（FormData形式）
  const createSSEFormData = (): FormData => {
    console.log('createSSEFormData: Creating FormData for SSE API')
    const formDataToSend = new FormData()
    
    // 基本フィールド
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'settlement') {
        // SSE API用: ファイルは個別に追加
        // 注意: ここではFile[]として処理する必要がある
        if (Array.isArray(value)) {
          // valueがstring[]（ファイルID）の場合のフォールバック
          console.warn('SSE API: Cannot send file IDs, need actual File objects')
          console.log('Settlement value type:', typeof value[0], value)
        }
      } else if (value !== null && value !== '') {
        formDataToSend.append(key, String(value))
      }
    })
    
    // 追加のメタデータ
    formDataToSend.append('outputMode', 'false')
    formDataToSend.append('reportFormat', 'Report Format')
    
    return formDataToSend
  }
  
  // セクションの完了状況チェック
  const getSectionCompletionStatus = computed(() => {
    return FORM_SECTIONS.map(section => {
      const filledFields = section.fields.filter(field => {
        const value = formData[field.variable]
        if (field.type === 'file-list') {
          return Array.isArray(value) && value.length > 0
        }
        return value !== null && value !== '' && value !== undefined
      }).length
      
      return {
        title: section.title,
        total: section.fields.length,
        filled: filledFields,
        percentage: Math.round((filledFields / section.fields.length) * 100),
        hasErrors: section.fields.some(field => errors[field.variable]?.length > 0),
      }
    })
  })
  
  // フォームリセット
  const resetForm = () => {
    Object.keys(formData).forEach(key => {
      if (key === 'settlement') {
        formData[key] = []
      } else {
        (formData as any)[key] = (DEFAULT_FORM_DATA as any)[key]
      }
    })
    
    // エラーもクリア
    Object.keys(errors).forEach(key => {
      delete errors[key]
    })
    
    // LocalStorageもクリア
    if (import.meta.client) {
      localStorage.removeItem(STORAGE_KEY)
    }
    
    reportOutput.value = ''
  }
  
  // フォームデータの変更を監視して自動保存
  watch(formData, () => {
    scheduleSave()
  }, { deep: true })
  
  return {
    // データ
    formData,
    errors,
    isGenerating,
    reportOutput,
    
    // 計算プロパティ
    sectionCompletionStatus: getSectionCompletionStatus,
    
    // 関数
    validateForm,
    validateSingleField,
    createDifyWorkflowData,  // Dify Workflow API用
    createSSEFormData,       // SSE API用（旧createFormData）
    loadFromStorage,
    saveToStorage,
    resetForm,
    
    // 定数
    FORM_SECTIONS,
  }
}