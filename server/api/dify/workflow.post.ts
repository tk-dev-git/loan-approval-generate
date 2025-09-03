// server/api/dify/workflow.post.ts
import { createEventStream } from 'h3'
import type { DifyWorkflowRequest, DifyWorkflowStreamEvent } from '~/types/dify'
import type { LoanApplicationForm } from '~/types/loan-application'

interface WorkflowRequestBody {
  formData: LoanApplicationForm
  fileIds: string[]
}

export default defineEventHandler(async (event) => {
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

    // リクエストボディを取得
    const body = await readBody<WorkflowRequestBody>(event)
    
    // 受信データのデバッグログ
    console.log('Workflow API: Received request body:', {
      hasFormData: !!body.formData,
      formDataFields: body.formData ? Object.keys(body.formData).length : 0,
      fileIds: body.fileIds,
      fileCount: body.fileIds?.length || 0,
      settlementInFormData: body.formData?.settlement
    })
    
    if (!body.formData) {
      console.error('Workflow API: Missing formData in request body')
      throw createError({
        statusCode: 400,
        statusMessage: 'フォームデータが不正です'
      })
    }
    
    // ファイルIDの検証
    if (!body.fileIds || body.fileIds.length === 0) {
      console.warn('Workflow API: No file IDs provided, proceeding without files')
    } else {
      console.log('Workflow API: Processing with files:', body.fileIds)
    }

    // SSEストリームを作成
    const stream = createEventStream(event)

    // Dify Workflow APIリクエストを構築（フラット構造）
    const workflowRequest: DifyWorkflowRequest = {
      inputs: {
        // 会社情報
        company_name: body.formData.company_name || '',
        industry: body.formData.industry || '',
        establishment_date: body.formData.establishment_date || '',
        capital: body.formData.capital || 0,
        representative: body.formData.representative || '',
        employees: body.formData.employees || '',
        location: body.formData.location || '',
        business_description: body.formData.business_description || '',
        
        // 融資詳細
        loan_amount: body.formData.loan_amount || 0,
        usage_type: body.formData.usage_type || '',
        specific_usage: body.formData.specific_usage || '',
        required_timing: body.formData.required_timing || '',
        funding_plan_details: body.formData.funding_plan_details || '',
        
        // 返済条件
        loan_term: body.formData.loan_term || 0,
        grace_period: body.formData.grace_period || 0,
        repayment_method: body.formData.repayment_method || '',
        interest_rate: body.formData.interest_rate || 0,
        rate_type: body.formData.rate_type || '',
        repayment_source: body.formData.repayment_source || '',
        desired_execution_date: body.formData.desired_execution_date || '',
        
        // 担保情報
        collateral_type: body.formData.collateral_type || '',
        collateral_details: body.formData.collateral_details || '',
        collateral_value: body.formData.collateral_value || 0,
        collateral_rank: body.formData.collateral_rank || '',
        guarantor_info: body.formData.guarantor_info || '',
        
        // 銀行情報
        main_bank: body.formData.main_bank || '',
        our_bank_share: body.formData.our_bank_share || 0,
        other_banks_total: body.formData.other_banks_total || 0,
        other_banks_details: body.formData.other_banks_details || '',
        repayment_history: body.formData.repayment_history || '',
        
        // その他の情報
        additional_info: body.formData.additional_info || ''
      },
      response_mode: 'streaming',
      user: 'loan-system-user',
      files: (body.fileIds || []).map(fileId => ({
        type: 'document' as const,
        transfer_method: 'local_file' as const,
        upload_file_id: fileId
      }))
    }
    
    // ワークフローリクエストのデバッグログ
    console.log('Workflow API: Prepared Dify request:', {
      inputKeys: Object.keys(workflowRequest.inputs),
      inputFieldCount: Object.keys(workflowRequest.inputs).length,
      fileCount: workflowRequest.files?.length || 0,
      filesData: workflowRequest.files,
      sampleInputs: {
        company_name: workflowRequest.inputs.company_name,
        loan_amount: workflowRequest.inputs.loan_amount,
        main_bank: workflowRequest.inputs.main_bank
      }
    })

    // 非同期でワークフローを実行
    console.log('Workflow API: Starting workflow execution...')
    executeWorkflow(workflowRequest, stream, difyApiKey, difyBaseUrl)
      .catch(error => {
        console.error('Workflow execution error:', error)
        stream.push({
          event: 'error',
          data: JSON.stringify({
            code: 'WORKFLOW_EXECUTION_ERROR',
            message: 'ワークフローの実行中にエラーが発生しました',
            details: error.message
          })
        }).finally(() => {
          stream.close()
        })
      })

    return stream.send()

  } catch (error: any) {
    console.error('Workflow API error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'ワークフロー実行エラー'
    })
  }
})

/**
 * Dify Workflow APIを実行してストリーミング結果をSSEで送信
 */
async function executeWorkflow(
  request: DifyWorkflowRequest,
  stream: any,
  apiKey: string,
  baseUrl: string
) {
  try {
    // 開始イベントを送信
    await stream.push({
      event: 'workflow_started',
      data: JSON.stringify({
        message: 'ワークフローを開始しました'
      })
    })

    // Dify Workflow APIを呼び出し（ストリーミング）
    // workflowIdを使わない一般的なworkflows/runエンドポイントを使用
    const response = await $fetch.raw<ReadableStream>('/workflows/run', {
      method: 'POST',
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: request,
      responseType: 'stream'
    })

    if (!response._data) {
      throw new Error('ストリームデータが取得できませんでした')
    }

    // ReadableStreamを処理
    const reader = response._data.getReader()
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
              // 完了イベントを送信
              await stream.push({
                event: 'workflow_completed',
                data: JSON.stringify({
                  message: 'ワークフローが完了しました',
                  timestamp: new Date().toISOString()
                })
              })
              break
            }

            try {
              // DifyのイベントデータをパースしてSSEで転送
              console.log('Workflow API: Parsing event data, length:', eventData.length)
              const difyEvent: DifyWorkflowStreamEvent = JSON.parse(eventData)
              
              // text_chunkイベントの特別処理
              if (difyEvent.event === 'text_chunk') {
                await stream.push({
                  event: 'text_chunk',
                  data: JSON.stringify({
                    difyEvent,
                    timestamp: new Date().toISOString(),
                    // チャンクテキストを明示的に含める
                    text: difyEvent.data?.text || ''
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

              // エラーイベントの場合は処理を終了
              if (difyEvent.event === 'error') {
                break
              }

            } catch (parseError) {
              console.warn('Failed to parse Dify event:', eventData, parseError)
              // パースエラーは無視して続行
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

  } catch (error: any) {
    console.error('Workflow execution failed:', error)
    
    // エラーイベントを送信
    await stream.push({
      event: 'error',
      data: JSON.stringify({
        code: 'WORKFLOW_ERROR',
        message: 'ワークフローの実行に失敗しました',
        details: error.message || error
      })
    })
  } finally {
    // ストリームを閉じる
    await stream.close()
  }
}