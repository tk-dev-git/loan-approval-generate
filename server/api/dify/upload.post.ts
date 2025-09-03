// server/api/dify/upload.post.ts
import type { DifyFileUploadResponse, DifyFileUploadError, FileUploadResult } from '~/types/dify'

export default defineEventHandler(async (event): Promise<FileUploadResult> => {
  try {
    // 環境変数の確認
    const config = useRuntimeConfig()
    const difyApiKey = config.difyApiKey
    const difyBaseUrl = config.difyApiBaseUrl
    
    if (!difyApiKey || !difyBaseUrl) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Dify API設定が不正です'
      })
    }

    // マルチパートフォームデータを読み取り
    const formData = await readMultipartFormData(event)
    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ファイルが添付されていません'
      })
    }

    // ファイルデータを探す
    const fileItem = formData.find(item => item.data && item.filename)
    if (!fileItem) {
      throw createError({
        statusCode: 400,
        statusMessage: '有効なファイルが見つかりません'
      })
    }

    // ファイルサイズ制限（50MB）
    const maxSize = 50 * 1024 * 1024
    if (fileItem.data && fileItem.data.length > maxSize) {
      throw createError({
        statusCode: 413,
        statusMessage: 'ファイルサイズが大きすぎます（最大50MB）'
      })
    }

    // 許可されたファイル形式の確認
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv']
    const fileExtension = fileItem.filename?.toLowerCase().slice(fileItem.filename.lastIndexOf('.'))
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      throw createError({
        statusCode: 400,
        statusMessage: `許可されていないファイル形式です。対応形式: ${allowedExtensions.join(', ')}`
      })
    }

    // Dify APIにアップロード用のFormDataを作成
    const uploadFormData = new FormData()
    
    // Blobでファイルデータを作成
    const blob = new Blob([fileItem.data!], { 
      type: getMimeType(fileExtension) 
    })
    
    uploadFormData.append('file', blob, fileItem.filename!)
    uploadFormData.append('user', 'loan-system-user')

    // Dify File Upload APIを呼び出し
    const response = await $fetch<DifyFileUploadResponse>('/files/upload', {
      method: 'POST',
      baseURL: difyBaseUrl,
      headers: {
        'Authorization': `Bearer ${difyApiKey}`,
        // Content-Typeは自動設定されるため省略
      },
      body: uploadFormData,
      timeout: 30000 // 30秒のタイムアウト
    })

    return {
      success: true,
      data: response
    }

  } catch (error: any) {
    console.error('Dify file upload error:', error)
    
    // Dify APIからのエラーレスポンス
    if (error.data) {
      return {
        success: false,
        error: {
          code: error.data.code || 'DIFY_API_ERROR',
          message: error.data.message || 'Dify APIエラーが発生しました',
          status: error.status || 500
        }
      }
    }

    // ネットワークエラーやその他のエラー
    if (error.statusCode) {
      return {
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: error.statusMessage || 'ファイルアップロードに失敗しました',
          status: error.statusCode
        }
      }
    }

    // 予期しないエラー
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'ファイルアップロード処理中に予期しないエラーが発生しました',
        status: 500
      }
    }
  }
})

/**
 * ファイル拡張子からMIMEタイプを取得
 */
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt': 'text/plain',
    '.csv': 'text/csv'
  }
  
  return mimeTypes[extension] || 'application/octet-stream'
}