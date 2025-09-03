# UI デザイン改修 SOW (Statement of Work)

## 1. プロジェクト概要

### 1.1 目的
融資稟議書生成アプリケーションのUIを改修し、YAMLファイルで定義された全34フィールドを入力可能にする包括的なフォームシステムを実装する。

### 1.2 スコープ
- 既存のNuxt3 + Vuetify3アーキテクチャを維持
- SSE（Server Sent Event）機能の保持
- ファイルアップロード機能の維持と拡張
- 新規フィールドの追加と整理

## 2. 技術要件

### 2.1 必須維持機能
- **SSE受信機能**: リアルタイムレポート生成のストリーミング
- **ファイルアップロード**: ドラッグ&ドロップ対応の複数ファイル選択
- **レスポンシブデザイン**: モバイル・タブレット対応

### 2.2 技術スタック
- **フレームワーク**: Nuxt 3.17.4
- **UIライブラリ**: Vuetify 3.8.7
- **言語**: TypeScript
- **スタイル**: SCSS
- **状態管理**: Vue Composition API

## 3. フィールド定義

### 3.1 企業情報セクション
| フィールド名 | 変数名 | タイプ | 最大長 | 必須 |
|------------|--------|--------|--------|------|
| 企業名 | company_name | text-input | 256 | false |
| 業種 | industry | text-input | 256 | false |
| 設立年月 | establishment_date | text-input | 256 | false |
| 資本金（百万円） | capital | number | 49 | false |
| 代表者 | representative | text-input | 256 | false |
| 従業員数 | employees | text-input | 256 | false |
| 所在地 | location | text-input | 256 | false |
| 事業内容 | business_description | paragraph | 1024 | false |
| 主要取引先 | major_customers | paragraph | 1024 | false |
| 主要仕入先 | major_suppliers | paragraph | 1024 | false |

### 3.2 融資申込セクション
| フィールド名 | 変数名 | タイプ | 最大長 | 必須 |
|------------|--------|--------|--------|------|
| 申込金額（百万円） | loan_amount | number | 48 | false |
| 使途分類 | usage_type | select | 48 | false |
| 具体的使途 | specific_usage | paragraph | 1024 | false |
| 必要時期 | required_timing | text-input | 256 | false |
| 資金計画詳細 | funding_plan_details | paragraph | 1024 | false |

### 3.3 返済条件セクション
| フィールド名 | 変数名 | タイプ | 最大長 | 必須 |
|------------|--------|--------|--------|------|
| 借入期間（年） | loan_term | number | 48 | false |
| 据置期間（ヶ月） | grace_period | number | 48 | false |
| 返済方法 | repayment_method | select | 48 | false |
| 金利条件（％） | interest_rate | number | 48 | false |
| 金利タイプ | rate_type | select | 48 | false |
| 返済原資 | repayment_source | paragraph | 1024 | false |
| 希望実行日 | desired_execution_date | text-input | 256 | false |

### 3.4 担保・保証セクション
| フィールド名 | 変数名 | タイプ | 最大長 | 必須 |
|------------|--------|--------|--------|------|
| 担保種類 | collateral_type | select | 48 | false |
| 担保詳細 | collateral_details | paragraph | 1024 | false |
| 評価額（百万円） | collateral_value | number | 48 | false |
| 設定順位 | collateral_rank | text-input | 256 | false |
| 保証人 | guarantor_info | text-input | 256 | false |

### 3.5 取引銀行情報セクション
| フィールド名 | 変数名 | タイプ | 最大長 | 必須 |
|------------|--------|--------|--------|------|
| メインバンク | main_bank | text-input | 256 | false |
| 当行シェア（％） | our_bank_share | number | 48 | false |
| 他行借入残高合計（百万円） | other_banks_total | number | 48 | false |
| 主要取引行と残高 | other_banks_details | paragraph | 1024 | false |
| 返済履歴 | repayment_history | paragraph | 1024 | false |
| その他補足 | additional_info | paragraph | 1024 | false |

### 3.6 添付書類セクション
| フィールド名 | 変数名 | タイプ | 最大長 | 必須 |
|------------|--------|--------|--------|------|
| 決算書（3期分） | settlement | file-list | 5 | false |

## 4. UI/UXデザイン仕様

### 4.1 レイアウト構造
```
┌──────────────────────────────────────────────────────────┐
│                     ヘッダー（アプリタイトル）                │
├────────────────────────┬─────────────────────────────────┤
│   左パネル (40%)        │    右パネル (60%)               │
│                        │                                 │
│  [入力フォーム]         │    [レポート出力エリア]          │
│                        │                                 │
│  ▼ 企業情報            │    生成されたレポートが          │
│  ▼ 融資申込            │    リアルタイムで表示される       │
│  ▼ 返済条件            │                                 │
│  ▼ 担保・保証          │    SSEによるストリーミング        │
│  ▼ 取引銀行情報        │    表示対応                      │
│  ▼ 添付書類            │                                 │
│                        │                                 │
│  [生成ボタン]          │                                 │
└────────────────────────┴─────────────────────────────────┘
```

### 4.2 コンポーネント設計

#### 4.2.1 フォームセクション
- **v-expansion-panels**: セクション単位の折りたたみ可能なパネル
- **v-text-field**: テキスト入力（企業名、代表者等）
- **v-text-field type="number"**: 数値入力（資本金、金利等）
- **v-textarea**: 複数行テキスト（事業内容、返済履歴等）
- **v-select**: ドロップダウン選択（使途分類、返済方法等）
- **v-file-input**: ファイル選択（決算書アップロード）

#### 4.2.2 バリデーション
```javascript
// バリデーションルール例
const rules = {
  required: (value) => !!value || '必須項目です',
  maxLength: (max) => (value) => 
    !value || value.length <= max || `${max}文字以内で入力してください`,
  number: (value) => 
    !value || !isNaN(value) || '数値を入力してください',
  positiveNumber: (value) => 
    !value || (Number(value) >= 0) || '0以上の数値を入力してください'
}
```

### 4.3 インタラクション設計

#### 4.3.1 セクション管理
- 各セクションは独立して展開/折りたたみ可能
- 入力済みセクションにはチェックマークアイコン表示
- 必須項目未入力時は警告アイコン表示

#### 4.3.2 データ永続化
- LocalStorageを使用した入力内容の自動保存
- 30秒ごとの自動保存
- ページリロード時の復元機能

#### 4.3.3 ユーザーフィードバック
- 入力時のリアルタイムバリデーション
- 保存成功時のスナックバー表示
- エラー時の明確なエラーメッセージ

## 5. 実装詳細

### 5.1 データモデル定義
```typescript
interface LoanApplicationForm {
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
  usage_type: '運転資金' | '設備資金' | 'リファイナンス' | 'その他' | ''
  specific_usage: string
  required_timing: string
  funding_plan_details: string
  
  // 返済条件
  loan_term: number | null
  grace_period: number | null
  repayment_method: '元利均等' | '元金均等' | '期日一括' | 'その他' | ''
  interest_rate: number | null
  rate_type: '固定' | '変動' | ''
  repayment_source: string
  desired_execution_date: string
  
  // 担保・保証
  collateral_type: '不動産' | '預金' | '有価証券' | '売掛負債' | '在庫' | 'その他' | ''
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
```

### 5.2 APIインターフェース更新
```typescript
// POSTリクエスト
POST /api/generate-report
Content-Type: multipart/form-data

// レスポンス（SSE）
data: {"content": "レポート内容の一部"}
data: {"content": "追加のレポート内容"}
data: {"content": "最終レポート", "done": true}
```

## 6. 開発スケジュール

### Phase 1: 基盤整備（1-2日）
- [ ] データモデル定義
- [ ] Vuetifyコンポーネント調査
- [ ] フォーム構造設計

### Phase 2: UI実装（3-4日）
- [ ] フォームセクションコンポーネント作成
- [ ] 各入力フィールド実装
- [ ] バリデーション実装
- [ ] レスポンシブ対応

### Phase 3: 機能実装（2-3日）
- [ ] LocalStorage連携
- [ ] APIエンドポイント更新
- [ ] SSE処理の調整
- [ ] エラーハンドリング

### Phase 4: テスト・調整（1-2日）
- [ ] 単体テスト
- [ ] 統合テスト
- [ ] UIブラッシュアップ
- [ ] パフォーマンス最適化

## 7. 成果物

### 7.1 更新ファイル
1. **pages/index.vue**: メインUIコンポーネント
2. **server/api/generate-report.post.ts**: APIエンドポイント
3. **composables/useLoanForm.ts**: フォーム管理ロジック（新規）
4. **types/loan-application.ts**: 型定義（新規）
5. **assets/styles/form.scss**: フォーム専用スタイル（新規）

### 7.2 ドキュメント
- 本SOWドキュメント
- APIインターフェース仕様書
- ユーザーガイド

## 8. 品質基準

### 8.1 パフォーマンス
- 初期ロード時間: 3秒以内
- フォーム入力レスポンス: 100ms以内
- SSEストリーミング: リアルタイム表示

### 8.2 アクセシビリティ
- WAI-ARIA準拠
- キーボードナビゲーション対応
- スクリーンリーダー対応

### 8.3 ブラウザ対応
- Chrome 最新版
- Firefox 最新版
- Safari 最新版
- Edge 最新版

## 9. リスクと対策

| リスク | 影響度 | 対策 |
|-------|--------|------|
| フォームの複雑化によるUX低下 | 高 | セクション分割とプログレッシブディスクロージャー |
| 大量フィールドによるパフォーマンス低下 | 中 | 遅延ロードとメモ化の活用 |
| バリデーションの複雑化 | 中 | Vuelidateライブラリの導入検討 |

## 10. 承認事項

本SOWに記載された内容に基づいて開発を進めることを承認します。

---

**作成日**: 2024年
**バージョン**: 1.0
**ステータス**: 承認待ち