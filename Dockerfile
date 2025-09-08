# ========================================
# Builder Stage - ビルド環境  
# ========================================
FROM node:20.10.0-alpine AS builder

# ビルド依存パッケージのインストール
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# 作業ディレクトリ設定
WORKDIR /app

# パッケージファイルコピー（キャッシュ最適化）
COPY package*.json ./

# 依存関係インストール（全依存関係）
RUN npm ci --verbose

# ソースコードコピー
COPY . .

# Nuxtアプリケーションビルド
RUN npm run build && \
    npm prune --production

# ========================================
# Runtime Stage - 実行環境
# ========================================
FROM gcr.io/distroless/nodejs20-debian12 AS runtime

# 非rootユーザー設定
USER 1001:1001

# 作業ディレクトリ
WORKDIR /app

# 必要ファイルのコピー（所有者変更）
COPY --from=builder --chown=1001:1001 /app/.output /app/.output
COPY --from=builder --chown=1001:1001 /app/package.json /app/package.json

# プロダクション環境変数
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV NITRO_PORT=3000
ENV NITRO_HOST=0.0.0.0

# ヘルスチェック用ポート公開
EXPOSE 3000

# アプリケーション起動
CMD [".output/server/index.mjs"]