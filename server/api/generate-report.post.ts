// server/api/generate-report.post.ts
import { createEventStream } from 'h3'
import type { LoanApplicationForm } from '~/types/loan-application'

// フォームデータの型定義
interface ParsedFormData extends Partial<LoanApplicationForm> {
  // 追加のメタデータ
  outputMode?: string
  reportFormat?: string
  selectedButtons1?: string
  selectedButtons2?: string
  slider1?: string
  slider2?: string
  slider3?: string
}

export default defineEventHandler(async (event) => {
    const body = await readMultipartFormData(event)

    // フォームデータの処理
    const formData: ParsedFormData = {}
    const files: Array<{ filename?: string; data: Buffer; size: number }> = []

    body?.forEach((item) => {
        if (item.name === 'settlement') {
            // 決算書ファイル
            files.push({
                filename: item.filename,
                data: item.data || Buffer.alloc(0),
                size: item.data?.length || 0
            })
        } else if (item.name && item.data) {
            // その他のフォームフィールド
            const value = item.data.toString()
            
            // 数値フィールドの処理
            if (['capital', 'loan_amount', 'loan_term', 'grace_period', 'interest_rate', 
                 'collateral_value', 'our_bank_share', 'other_banks_total'].includes(item.name)) {
                (formData as any)[item.name] = value ? Number(value) : null
            } else {
                (formData as any)[item.name] = value
            }
        }
    })

    // SSEストリームの作成
    const stream = createEventStream(event)

    // レポート生成のシミュレーション
    const generateReportContent = async () => {
        const contents = [
            '融資申込情報を解析中...\n',
            '企業データを処理中...\n',
            '財務状況を評価中...\n',
            'リスク分析を実行中...\n',
            '稟議書を生成中...\n'
        ]

        for (let i = 0; i < contents.length; i++) {
            await stream.push({
                data: JSON.stringify({ content: contents[i] })
            })
            await new Promise(resolve => setTimeout(resolve, 800))
        }

        // 詳細な融資稟議書レポートを生成
        const finalReport = generateLoanApplicationReport(formData, files)

        await stream.push({
            data: JSON.stringify({
                content: finalReport,
                done: true
            })
        })

        await stream.close()
    }

    // 非同期でレポート生成を開始
    generateReportContent().catch(console.error)

    return stream.send()
})

// 融資稟議書レポート生成関数
function generateLoanApplicationReport(formData: ParsedFormData, files: Array<any>): string {
    const formatCurrency = (value: number | null | undefined) => {
        return value ? `${value.toLocaleString()}百万円` : '未記入'
    }

    const formatPercentage = (value: number | null | undefined) => {
        return value ? `${value}%` : '未記入'
    }

    const formatText = (value: string | undefined, fallback = '未記入') => {
        return value && value.trim() ? value : fallback
    }

    return `
## 融資稟議書

### 📋 申込概要
**申込企業**: ${formatText(formData.company_name)}  
**申込金額**: ${formatCurrency(formData.loan_amount)}  
**使途分類**: ${formatText(formData.usage_type)}  
**申込日**: ${new Date().toLocaleDateString('ja-JP')}

---

### 🏢 企業情報

**基本情報**
- **企業名**: ${formatText(formData.company_name)}
- **業種**: ${formatText(formData.industry)}
- **設立年月**: ${formatText(formData.establishment_date)}
- **資本金**: ${formatCurrency(formData.capital)}
- **代表者**: ${formatText(formData.representative)}

**事業概要**
- **従業員数**: ${formatText(formData.employees)}
- **所在地**: ${formatText(formData.location)}
- **事業内容**: ${formatText(formData.business_description)}

**取引関係**
- **主要取引先**: ${formatText(formData.major_customers)}
- **主要仕入先**: ${formatText(formData.major_suppliers)}

---

### 💰 融資申込詳細

**申込内容**
- **申込金額**: ${formatCurrency(formData.loan_amount)}
- **使途分類**: ${formatText(formData.usage_type)}
- **具体的使途**: ${formatText(formData.specific_usage)}
- **必要時期**: ${formatText(formData.required_timing)}

**資金計画**
${formatText(formData.funding_plan_details)}

---

### 💳 返済条件

**返済設定**
- **借入期間**: ${formData.loan_term ? `${formData.loan_term}年` : '未記入'}
- **据置期間**: ${formData.grace_period ? `${formData.grace_period}ヶ月` : '未記入'}
- **返済方法**: ${formatText(formData.repayment_method)}
- **希望実行日**: ${formatText(formData.desired_execution_date)}

**金利条件**
- **金利条件**: ${formatPercentage(formData.interest_rate)}
- **金利タイプ**: ${formatText(formData.rate_type)}

**返済原資**
${formatText(formData.repayment_source)}

---

### 🏠 担保・保証

**担保情報**
- **担保種類**: ${formatText(formData.collateral_type)}
- **評価額**: ${formatCurrency(formData.collateral_value)}
- **設定順位**: ${formatText(formData.collateral_rank)}

**担保詳細**
${formatText(formData.collateral_details)}

**保証情報**
- **保証人**: ${formatText(formData.guarantor_info)}

---

### 🏛️ 取引銀行情報

**銀行取引状況**
- **メインバンク**: ${formatText(formData.main_bank)}
- **当行シェア**: ${formatPercentage(formData.our_bank_share)}
- **他行借入残高合計**: ${formatCurrency(formData.other_banks_total)}

**取引履歴**
- **主要取引行と残高**: ${formatText(formData.other_banks_details)}
- **返済履歴**: ${formatText(formData.repayment_history)}

---

### 📎 添付書類

**提出書類**
${files.length > 0 ? 
  files.map((file, index) => `${index + 1}. ${file.filename || 'ファイル'} (${Math.round((file.size || 0) / 1024)}KB)`).join('\n') :
  '添付書類なし'
}

---

### 📝 補足事項

${formatText(formData.additional_info)}

---

### ✅ 審査担当者記入欄

**初期評価**: □ 承認 □ 条件付承認 □ 否認 □ 要検討

**評価コメント**:
_________________________________
_________________________________
_________________________________

**担当者署名**: _________________ 日付: ___________

---

### 📊 システム生成情報

**レポート形式**: ${formatText(formData.reportFormat)}  
**出力モード**: ${formData.outputMode === 'true' ? '詳細モード' : '標準モード'}  
**生成日時**: ${new Date().toLocaleString('ja-JP')}  
**処理ファイル数**: ${files.length}件

---

*本稟議書はシステムにより自動生成されました。内容を十分にご確認ください。*
`
}