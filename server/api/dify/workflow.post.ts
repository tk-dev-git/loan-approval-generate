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
    if (!body.formData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'フォームデータが不正です'
      })
    }

    // SSEストリームを作成
    const stream = createEventStream(event)

    // Dify Workflow APIリクエストを構築
    const workflowRequest: DifyWorkflowRequest = {
      inputs: {
        // 融資申込情報を構造化して送信
        loan_application: {
          company_info: {
            company_name: body.formData.company_name || '',
            industry: body.formData.industry || '',
            establishment_date: body.formData.establishment_date || '',
            capital: body.formData.capital || 0,
            representative: body.formData.representative || '',
            employees: body.formData.employees || '',
            location: body.formData.location || '',
            business_description: body.formData.business_description || ''
          },
          loan_details: {
            loan_amount: body.formData.loan_amount || 0,
            usage_type: body.formData.usage_type || '',
            specific_usage: body.formData.specific_usage || '',
            required_timing: body.formData.required_timing || '',
            funding_plan_details: body.formData.funding_plan_details || ''
          },
          repayment_conditions: {
            loan_term: body.formData.loan_term || 0,
            grace_period: body.formData.grace_period || 0,
            repayment_method: body.formData.repayment_method || '',
            interest_rate: body.formData.interest_rate || 0,
            rate_type: body.formData.rate_type || '',
            repayment_source: body.formData.repayment_source || '',
            desired_execution_date: body.formData.desired_execution_date || ''
          },
          collateral_info: {
            collateral_type: body.formData.collateral_type || '',
            collateral_details: body.formData.collateral_details || '',
            collateral_value: body.formData.collateral_value || 0,
            collateral_rank: body.formData.collateral_rank || '',
            guarantor_info: body.formData.guarantor_info || ''
          },
          bank_info: {
            main_bank: body.formData.main_bank || '',
            our_bank_share: body.formData.our_bank_share || 0,
            other_banks_total: body.formData.other_banks_total || 0,
            other_banks_details: body.formData.other_banks_details || '',
            repayment_history: body.formData.repayment_history || ''
          },
          additional_info: body.formData.additional_info || ''
        }
      },
      response_mode: 'streaming',
      user: 'loan-system-user',
      files: body.fileIds.map(fileId => ({
        type: 'document' as const,
        transfer_method: 'local_file' as const,
        upload_file_id: fileId
      }))
    }

    // 非同期でワークフローを実行
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
              const difyEvent: DifyWorkflowStreamEvent = JSON.parse(eventData)
              
              // イベントタイプに応じて適切な形式でフロントエンドに送信
              await stream.push({
                event: difyEvent.event,
                data: JSON.stringify({
                  difyEvent,
                  timestamp: new Date().toISOString()
                })
              })

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