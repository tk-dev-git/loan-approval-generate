// composables/useDifyFileUpload.ts
import type { FileUploadResult, UploadProgressState, FileUploadOptions } from '~/types/dify'

export const useDifyFileUpload = () => {
  // アップロード状態の管理
  const uploadStates = ref<Map<string, UploadProgressState>>(new Map())
  
  /**
   * 単一ファイルをアップロード
   */
  const uploadFile = async (
    file: File,
    options: FileUploadOptions = {}
  ): Promise<FileUploadResult> => {
    const fileId = `${file.name}-${Date.now()}`
    
    // 初期状態を設定
    const initialState: UploadProgressState = {
      status: 'uploading',
      progress: 0,
      fileName: file.name,
      fileSize: file.size,
      uploadedSize: 0
    }
    
    uploadStates.value.set(fileId, initialState)
    
    try {
      // ファイル検証
      const validationResult = validateFile(file, options)
      if (!validationResult.isValid) {
        const errorState: UploadProgressState = {
          status: 'error',
          progress: 0,
          fileName: file.name,
          error: validationResult.error
        }
        uploadStates.value.set(fileId, errorState)
        options.onProgress?.(errorState)
        
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validationResult.error,
            status: 400
          }
        }
      }

      // FormDataを作成
      const formData = new FormData()
      formData.append('file', file)

      // 進捗更新関数
      const updateProgress = (uploaded: number) => {
        const progress = Math.round((uploaded / file.size) * 100)
        const state: UploadProgressState = {
          status: 'uploading',
          progress,
          fileName: file.name,
          fileSize: file.size,
          uploadedSize: uploaded
        }
        uploadStates.value.set(fileId, state)
        options.onProgress?.(state)
      }

      // アップロード実行
      const result = await $fetch<FileUploadResult>('/api/dify/upload', {
        method: 'POST',
        body: formData,
        timeout: options.timeout || 30000,
        onUploadProgress: (progress) => {
          if (progress.total) {
            updateProgress(progress.loaded || 0)
          }
        }
      })

      if (result.success) {
        // 成功状態を設定
        const successState: UploadProgressState = {
          status: 'completed',
          progress: 100,
          fileName: file.name,
          fileSize: file.size,
          uploadedSize: file.size,
          fileId: result.data.id
        }
        uploadStates.value.set(fileId, successState)
        options.onProgress?.(successState)
        
        return result
      } else {
        // エラー状態を設定
        const errorState: UploadProgressState = {
          status: 'error',
          progress: 0,
          fileName: file.name,
          error: result.error.message
        }
        uploadStates.value.set(fileId, errorState)
        options.onProgress?.(errorState)
        
        return result
      }

    } catch (error: any) {
      console.error('File upload error:', error)
      
      // エラー状態を設定
      const errorState: UploadProgressState = {
        status: 'error',
        progress: 0,
        fileName: file.name,
        error: error.data?.message || error.message || 'アップロードに失敗しました'
      }
      uploadStates.value.set(fileId, errorState)
      options.onProgress?.(errorState)

      return {
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: error.data?.message || error.message || 'アップロードに失敗しました',
          status: error.status || 500
        }
      }
    }
  }

  /**
   * 複数ファイルを並列でアップロード
   */
  const uploadFiles = async (
    files: File[],
    options: FileUploadOptions = {}
  ): Promise<FileUploadResult[]> => {
    const uploadPromises = files.map(file => uploadFile(file, options))
    return Promise.all(uploadPromises)
  }

  /**
   * 特定のファイルのアップロード状態を取得
   */
  const getUploadState = (fileId: string): UploadProgressState | undefined => {
    return uploadStates.value.get(fileId)
  }

  /**
   * すべてのアップロード状態を取得
   */
  const getAllUploadStates = (): UploadProgressState[] => {
    return Array.from(uploadStates.value.values())
  }

  /**
   * アップロード状態をクリア
   */
  const clearUploadStates = () => {
    uploadStates.value.clear()
  }

  /**
   * 特定のファイルの状態を削除
   */
  const removeUploadState = (fileId: string) => {
    uploadStates.value.delete(fileId)
  }

  /**
   * 全体の進捗状況を計算
   */
  const getTotalProgress = computed(() => {
    const states = getAllUploadStates()
    if (states.length === 0) return 0
    
    const totalProgress = states.reduce((sum, state) => sum + state.progress, 0)
    return Math.round(totalProgress / states.length)
  })

  /**
   * アップロード中のファイル数
   */
  const uploadingCount = computed(() => {
    return getAllUploadStates().filter(state => state.status === 'uploading').length
  })

  /**
   * 完了したファイル数
   */
  const completedCount = computed(() => {
    return getAllUploadStates().filter(state => state.status === 'completed').length
  })

  /**
   * エラーが発生したファイル数
   */
  const errorCount = computed(() => {
    return getAllUploadStates().filter(state => state.status === 'error').length
  })

  return {
    uploadStates: readonly(uploadStates),
    uploadFile,
    uploadFiles,
    getUploadState,
    getAllUploadStates,
    clearUploadStates,
    removeUploadState,
    getTotalProgress,
    uploadingCount,
    completedCount,
    errorCount
  }
}

/**
 * ファイル検証
 */
function validateFile(file: File, options: FileUploadOptions): { isValid: boolean; error?: string } {
  // ファイルサイズ制限
  const maxSize = options.maxSize || 50 * 1024 * 1024 // デフォルト50MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `ファイルサイズが大きすぎます（最大${Math.round(maxSize / 1024 / 1024)}MB）`
    }
  }

  // ファイル形式制限
  if (options.allowedTypes && options.allowedTypes.length > 0) {
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
    const isAllowed = options.allowedTypes.some(type => 
      type.toLowerCase() === fileExtension
    )
    
    if (!isAllowed) {
      return {
        isValid: false,
        error: `許可されていないファイル形式です。対応形式: ${options.allowedTypes.join(', ')}`
      }
    }
  }

  return { isValid: true }
}