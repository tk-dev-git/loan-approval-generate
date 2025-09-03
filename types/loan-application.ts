// 融資申込フォームの型定義

// 選択肢の型定義
export type UsageType = '運転資金' | '設備資金' | 'リファイナンス' | 'その他' | ''
export type RepaymentMethod = '元利均等' | '元金均等' | '期日一括' | 'その他' | ''
export type RateType = '固定' | '変動' | ''
export type CollateralType = '不動産' | '預金' | '有価証券' | '売掛負債' | '在庫' | 'その他' | ''

// メインのフォーム型定義
export interface LoanApplicationForm {
  // 企業情報
  company_name: string
  industry: string
  establishment_date: string
  capital: number | null
  representative: string
  employees: string
  location: string
  business_description: string
  major_customers: string
  major_suppliers: string
  
  // 融資申込
  loan_amount: number | null
  usage_type: UsageType
  specific_usage: string
  required_timing: string
  funding_plan_details: string
  
  // 返済条件
  loan_term: number | null
  grace_period: number | null
  repayment_method: RepaymentMethod
  interest_rate: number | null
  rate_type: RateType
  repayment_source: string
  desired_execution_date: string
  
  // 担保・保証
  collateral_type: CollateralType
  collateral_details: string
  collateral_value: number | null
  collateral_rank: string
  guarantor_info: string
  
  // 取引銀行情報
  main_bank: string
  our_bank_share: number | null
  other_banks_total: number | null
  other_banks_details: string
  repayment_history: string
  additional_info: string
  
  // 添付書類
  settlement: File[]
}

// フォームフィールド定義の型
export interface FieldDefinition {
  label: string
  variable: keyof LoanApplicationForm
  type: 'text-input' | 'number' | 'paragraph' | 'select' | 'file-list'
  maxLength: number
  required: boolean
  options?: string[]
}

// フォームセクション定義の型
export interface FormSection {
  title: string
  fields: FieldDefinition[]
}

// バリデーション結果の型
export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string[]>
}

// 選択肢定義
export const SELECT_OPTIONS = {
  usage_type: ['運転資金', '設備資金', 'リファイナンス', 'その他'] as const,
  repayment_method: ['元利均等', '元金均等', '期日一括', 'その他'] as const,
  rate_type: ['固定', '変動'] as const,
  collateral_type: ['不動産', '預金', '有価証券', '売掛負債', '在庫', 'その他'] as const,
} as const

// フォームセクション定義
export const FORM_SECTIONS: FormSection[] = [
  {
    title: '企業情報',
    fields: [
      { label: '企業名', variable: 'company_name', type: 'text-input', maxLength: 256, required: false },
      { label: '業種', variable: 'industry', type: 'text-input', maxLength: 256, required: false },
      { label: '設立年月', variable: 'establishment_date', type: 'text-input', maxLength: 256, required: false },
      { label: '資本金（百万円）', variable: 'capital', type: 'number', maxLength: 49, required: false },
      { label: '代表者', variable: 'representative', type: 'text-input', maxLength: 256, required: false },
      { label: '従業員数', variable: 'employees', type: 'text-input', maxLength: 256, required: false },
      { label: '所在地', variable: 'location', type: 'text-input', maxLength: 256, required: false },
      { label: '事業内容', variable: 'business_description', type: 'paragraph', maxLength: 1024, required: false },
      { label: '主要取引先', variable: 'major_customers', type: 'paragraph', maxLength: 1024, required: false },
      { label: '主要仕入先', variable: 'major_suppliers', type: 'paragraph', maxLength: 1024, required: false },
    ],
  },
  {
    title: '融資申込',
    fields: [
      { label: '申込金額（百万円）', variable: 'loan_amount', type: 'number', maxLength: 48, required: false },
      { label: '使途分類', variable: 'usage_type', type: 'select', maxLength: 48, required: false, options: SELECT_OPTIONS.usage_type },
      { label: '具体的使途', variable: 'specific_usage', type: 'paragraph', maxLength: 1024, required: false },
      { label: '必要時期', variable: 'required_timing', type: 'text-input', maxLength: 256, required: false },
      { label: '資金計画詳細', variable: 'funding_plan_details', type: 'paragraph', maxLength: 1024, required: false },
    ],
  },
  {
    title: '返済条件',
    fields: [
      { label: '借入期間（年）', variable: 'loan_term', type: 'number', maxLength: 48, required: false },
      { label: '据置期間（ヶ月）', variable: 'grace_period', type: 'number', maxLength: 48, required: false },
      { label: '返済方法', variable: 'repayment_method', type: 'select', maxLength: 48, required: false, options: SELECT_OPTIONS.repayment_method },
      { label: '金利条件（％）', variable: 'interest_rate', type: 'number', maxLength: 48, required: false },
      { label: '金利タイプ', variable: 'rate_type', type: 'select', maxLength: 48, required: false, options: SELECT_OPTIONS.rate_type },
      { label: '返済原資', variable: 'repayment_source', type: 'paragraph', maxLength: 1024, required: false },
      { label: '希望実行日', variable: 'desired_execution_date', type: 'text-input', maxLength: 256, required: false },
    ],
  },
  {
    title: '担保・保証',
    fields: [
      { label: '担保種類', variable: 'collateral_type', type: 'select', maxLength: 48, required: false, options: SELECT_OPTIONS.collateral_type },
      { label: '担保詳細', variable: 'collateral_details', type: 'paragraph', maxLength: 1024, required: false },
      { label: '評価額（百万円）', variable: 'collateral_value', type: 'number', maxLength: 48, required: false },
      { label: '設定順位', variable: 'collateral_rank', type: 'text-input', maxLength: 256, required: false },
      { label: '保証人', variable: 'guarantor_info', type: 'text-input', maxLength: 256, required: false },
    ],
  },
  {
    title: '取引銀行情報',
    fields: [
      { label: 'メインバンク', variable: 'main_bank', type: 'text-input', maxLength: 256, required: false },
      { label: '当行シェア（％）', variable: 'our_bank_share', type: 'number', maxLength: 48, required: false },
      { label: '他行借入残高合計（百万円）', variable: 'other_banks_total', type: 'number', maxLength: 48, required: false },
      { label: '主要取引行と残高', variable: 'other_banks_details', type: 'paragraph', maxLength: 1024, required: false },
      { label: '返済履歴', variable: 'repayment_history', type: 'paragraph', maxLength: 1024, required: false },
      { label: 'その他補足', variable: 'additional_info', type: 'paragraph', maxLength: 1024, required: false },
    ],
  },
  {
    title: '添付書類',
    fields: [
      { label: '決算書（3期分）', variable: 'settlement', type: 'file-list', maxLength: 5, required: false },
    ],
  },
]

// デフォルト値
export const DEFAULT_FORM_DATA: LoanApplicationForm = {
  // 企業情報
  company_name: '',
  industry: '',
  establishment_date: '',
  capital: null,
  representative: '',
  employees: '',
  location: '',
  business_description: '',
  major_customers: '',
  major_suppliers: '',
  
  // 融資申込
  loan_amount: null,
  usage_type: '',
  specific_usage: '',
  required_timing: '',
  funding_plan_details: '',
  
  // 返済条件
  loan_term: null,
  grace_period: null,
  repayment_method: '',
  interest_rate: null,
  rate_type: '',
  repayment_source: '',
  desired_execution_date: '',
  
  // 担保・保証
  collateral_type: '',
  collateral_details: '',
  collateral_value: null,
  collateral_rank: '',
  guarantor_info: '',
  
  // 取引銀行情報
  main_bank: '',
  our_bank_share: null,
  other_banks_total: null,
  other_banks_details: '',
  repayment_history: '',
  additional_info: '',
  
  // 添付書類
  settlement: [],
}