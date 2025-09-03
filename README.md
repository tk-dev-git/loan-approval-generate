# 融資稟議書生成アプリケーション

> 日立ソリューションズ：融資稟議書生成システム

[![Nuxt 3](https://img.shields.io/badge/Nuxt-3.17.4-00DC82?logo=nuxt.js)](https://nuxt.com/)
[![Vue 3](https://img.shields.io/badge/Vue.js-3.5.16-4FC08D?logo=vue.js)](https://vuejs.org/)
[![Vuetify](https://img.shields.io/badge/Vuetify-3.8.7-1867C0?logo=vuetify)](https://vuetifyjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)

## 📋 概要

本アプリケーションは、日立ソリューションズ：融資稟議書生成システムとして開発された、融資稟議書の自動生成システムです。ビジネスコンテンツや業界情報を入力として、高品質なレポートを効率的に生成します。

### ✨ 主な特徴

- **📁 スマートファイルアップロード** - ドラッグ&ドロップ対応の直感的なインターフェース
- **📝 柔軟な入力システム** - ビジネスコンテンツとタスク内容の詳細入力
- **🏭 業界特化型分析** - 業界別のテンプレートと分析ロジック
- **📊 多様なレポート形式** - 複数のフォーマットでレポート出力
- **⚡ リアルタイム処理** - Dify ワークフローとの統合による高速処理
- **🎨 洗練されたUI/UX** - Material Design に基づくモダンなインターフェース

## 🚀 クイックスタート

### 必要条件

- Node.js 18.x 以上
- npm 9.x 以上
- Git

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/your-org/loan-approval-generate.git
cd loan-approval-generate

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .env ファイルを編集して必要な設定を追加
```

### 開発サーバーの起動

```bash
# 開発サーバーを起動 (http://localhost:3000)
npm run dev
```

### ビルド & デプロイ

```bash
# プロダクションビルド
npm run build

# ビルドのプレビュー
npm run preview

# 静的サイト生成
npm run generate
```

## 🏗️ プロジェクト構造

```
loan-approval-generate/
├── assets/          # スタイルシート、画像などの静的アセット
├── components/      # Vue コンポーネント
│   ├── FileUpload.vue
│   ├── IndustrySelector.vue
│   └── ReportGenerator.vue
├── composables/     # Vue Composition API のユーティリティ
├── layouts/         # アプリケーションレイアウト
├── middleware/      # Nuxt ミドルウェア
├── pages/           # アプリケーションページ
│   └── index.vue    # メインページ
├── plugins/         # Nuxt プラグイン
│   └── vuetify.ts   # Vuetify 設定
├── public/          # 静的ファイル
├── server/          # サーバーサイド API
│   ├── api/
│   │   ├── generate-report.post.ts
│   │   └── dify/
│   │       ├── upload.post.ts
│   │       └── workflow.post.ts
│   └── tsconfig.json
├── types/           # TypeScript 型定義
└── nuxt.config.ts   # Nuxt 設定ファイル
```

## 🛠️ 技術スタック

### フロントエンド
- **[Nuxt 3](https://nuxt.com/)** - フルスタック Vue フレームワーク
- **[Vue 3](https://vuejs.org/)** - プログレッシブ JavaScript フレームワーク
- **[Vuetify 3](https://vuetifyjs.com/)** - Material Design コンポーネントライブラリ
- **[TypeScript](https://www.typescriptlang.org/)** - 型安全な JavaScript

### UI/UX
- **Material Design Icons** - 豊富なアイコンセット
- **Google Fonts** - Be Vietnam Pro & Noto Sans フォント
- **Sass** - 高度な CSS プリプロセッサ

### ユーティリティ
- **[VueUse](https://vueuse.org/)** - Vue 3 Composition API ユーティリティ集
- **[DOMPurify](https://github.com/cure53/DOMPurify)** - XSS 対策のための HTML サニタイザー
- **[Marked](https://marked.js.org/)** - Markdown パーサー

### 認証（オプション）
- **[Keycloak](https://www.keycloak.org/)** - エンタープライズ認証・認可（現在無効化）

## 🎨 デザインシステム

### ブランドカラー

| 用途 | カラー名 | HEX | RGB |
|------|----------|-----|-----|
| プライマリー | オレンジ | `#FF6B35` | (255, 107, 53) |
| テキスト | ダークグレー | `#1A1A1A` | (26, 26, 26) |
| 背景 | ライトグレー | `#F5F5F5` | (245, 245, 245) |

### デザインリファレンス
- [Google Stitch](https://stitch.withgoogle.com/) - UI デザインインスピレーション

## 🔧 環境変数

`.env` ファイルで以下の環境変数を設定してください：

```bash
# API設定
NUXT_PUBLIC_API_BASE_URL=your_api_base_url
NUXT_DIFY_API_KEY=your_dify_api_key
NUXT_DIFY_WORKFLOW_ID=your_workflow_id

# 認証設定 (オプション)
NUXT_PUBLIC_KEYCLOAK_URL=your_keycloak_url
NUXT_PUBLIC_KEYCLOAK_REALM=your_realm
NUXT_PUBLIC_KEYCLOAK_CLIENT_ID=your_client_id
```

## 📚 API エンドポイント

| エンドポイント | メソッド | 説明 |
|---------------|----------|------|
| `/api/generate-report` | POST | レポート生成 |
| `/api/dify/upload` | POST | ファイルアップロード |
| `/api/dify/workflow` | POST | Dify ワークフロー実行 |

## 🧪 開発ガイド

### コーディング規約

詳細は [CLAUDE.md](./CLAUDE.md) を参照してください。

- **YAGNI** - 今必要じゃない機能は作らない
- **DRY** - 同じコードを繰り返さない
- **KISS** - シンプルに保つ

### コンポーネント開発

```vue
<template>
  <v-card>
    <!-- Vuetify コンポーネントを使用 -->
  </v-card>
</template>

<script setup lang="ts">
// Composition API を使用
import { ref, computed } from 'vue'

// TypeScript で型安全なコード
const data = ref<string>('')
</script>
```

### テスト実行

```bash
# テストの実行（テストフレームワークが設定されている場合）
npm run test

# カバレッジレポート
npm run test:coverage
```

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をコミット (`git commit -m 'Add some AmazingFeature'`)
4. ブランチにプッシュ (`git push origin feature/AmazingFeature`)
5. プルリクエストを作成

## 📝 ライセンス

プロプライエタリ - 詳細はプロジェクトオーナーにお問い合わせください。

## 🔗 関連リンク

- [Nuxt 3 Documentation](https://nuxt.com/docs)
- [Vue 3 Documentation](https://vuejs.org/guide/)
- [Vuetify Documentation](https://vuetifyjs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## 📞 サポート

問題が発生した場合や質問がある場合は、[Issues](https://github.com/your-org/loan-approval-generate/issues) セクションで報告してください。

---

<div align="center">
  <strong>Industrial-X (I-X) 戦略策定支援システム</strong><br>
  Powered by Modern Web Technologies
</div>