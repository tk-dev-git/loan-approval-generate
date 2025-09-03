# UI のデザイン変更について

## 前提条件

以下の条件を厳守してデザイン変更を行なってください。

- アプリケーションの `SSE（Server Sent Event）` 受信機能は維持する
- Input Form にある `ファイルアップロード` 機能は維持する

## 改修内容

1. 下記の Yaml 定義内容を参考に全ての変数を Input Form で入力可能にする

```yaml
        variables:
        - label: 企業名
          max_length: 256
          options: []
          required: false
          type: text-input
          variable: company_name
        - label: 業種
          max_length: 256
          options: []
          required: false
          type: text-input
          variable: industry
        - label: 設立年月
          max_length: 256
          options: []
          required: false
          type: text-input
          variable: establishment_date
        - label: 資本金（百万円）
          max_length: 49
          options: []
          required: false
          type: number
          variable: capital
        - label: 代表者
          max_length: 256
          options: []
          required: false
          type: text-input
          variable: representative
        - label: 従業員数
          max_length: 256
          options: []
          required: false
          type: text-input
          variable: employees
        - label: 所在地
          max_length: 256
          options: []
          required: false
          type: text-input
          variable: location
        - label: 事業内容
          max_length: 1024
          options: []
          required: false
          type: paragraph
          variable: business_description
        - label: 主要取引先
          max_length: 1024
          options: []
          required: false
          type: paragraph
          variable: major_customers
        - label: 主要仕入先
          max_length: 1024
          options: []
          required: false
          type: paragraph
          variable: major_suppliers
        - label: 申込金額（百万円）
          max_length: 48
          options: []
          required: false
          type: number
          variable: loan_amount
        - label: 使途分類
          max_length: 48
          options:
          - 運転資金
          - 設備資金
          - リファイナンス
          - その他
          required: false
          type: select
          variable: usage_type
        - label: 具体的使途
          max_length: 1024
          options: []
          required: false
          type: paragraph
          variable: specific_usage
        - label: 必要時期
          max_length: 256
          options: []
          required: false
          type: text-input
          variable: required_timing
        - label: 資金計画詳細
          max_length: 1024
          options: []
          required: false
          type: paragraph
          variable: funding_plan_details
        - label: 借入期間（年）
          max_length: 48
          options: []
          required: false
          type: number
          variable: loan_term
        - label: 据置期間（ヶ月）
          max_length: 48
          options: []
          required: false
          type: number
          variable: grace_period
        - label: 返済方法
          max_length: 48
          options:
          - 元利均等
          - 元金均等
          - 期日一括
          - その他
          required: false
          type: select
          variable: repayment_method
        - label: 金利条件（％）
          max_length: 48
          options: []
          required: false
          type: number
          variable: interest_rate
        - label: 金利タイプ
          max_length: 48
          options:
          - 固定
          - 変動
          required: false
          type: select
          variable: rate_type
        - label: 返済原資
          max_length: 1024
          options: []
          required: false
          type: paragraph
          variable: repayment_source
        - label: 希望実行日
          max_length: 256
          options: []
          required: false
          type: text-input
          variable: desired_execution_date
        - label: 担保種類
          max_length: 48
          options:
          - 不動産
          - 預金
          - 有価証券
          - 売掛負債
          - 在庫
          - その他
          required: false
          type: select
          variable: collateral_type
        - label: 担保詳細
          max_length: 1024
          options: []
          required: false
          type: paragraph
          variable: collateral_details
        - label: 評価額（百万円）
          max_length: 48
          options: []
          required: false
          type: number
          variable: collateral_value
        - label: 設定順位
          max_length: 256
          options: []
          required: false
          type: text-input
          variable: collateral_rank
        - label: 保証人
          max_length: 256
          options: []
          required: false
          type: text-input
          variable: guarantor_info
        - label: メインバンク
          max_length: 256
          options: []
          required: false
          type: text-input
          variable: main_bank
        - label: 当行シェア（％）
          max_length: 48
          options: []
          required: false
          type: number
          variable: our_bank_share
        - label: 他行借入残高合計（百万円）
          max_length: 48
          options: []
          required: false
          type: number
          variable: other_banks_total
        - label: 主要取引行と残高
          max_length: 1024
          options: []
          required: false
          type: paragraph
          variable: other_banks_details
        - label: 返済履歴
          max_length: 1024
          options: []
          required: false
          type: paragraph
          variable: repayment_history
        - label: その他補足
          max_length: 1024
          options: []
          required: false
          type: paragraph
          variable: additional_info
        - allowed_file_extensions: []
          allowed_file_types:
          - document
          allowed_file_upload_methods:
          - local_file
          - remote_url
          label: 決算（3期分）
          max_length: 5
          options: []
          required: false
          type: file-list
          variable: settlement
```

2. 各項目は UI 左部分または右上半分に適切に配置してシンプルにする
