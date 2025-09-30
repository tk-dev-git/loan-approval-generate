#!/bin/zsh

AWS_ACCOUNT_ID="846640070379"
REGION="ap-northeast-1"
REPOSITORY_NAME="hsol-loan-approval"
PROFILE="hsol-t.kikunaga"

PLATFORM="linux/amd64"
APPLICATION_NAME="loan-approval"
VERSION="v0.3.0"
REPOSITORY_URI="$AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPOSITORY_NAME"

# Docker イメージのビルド
docker build --platform $PLATFORM -t $APPLICATION_NAME:$VERSION .

# ECR にログイン
aws ecr get-login-password --region $REGION --profile $PROFILE | \
    docker login --username AWS --password-stdin $REPOSITORY_URI

# Docker イメージにタグを付ける
docker tag $APPLICATION_NAME:$VERSION $REPOSITORY_URI:$VERSION

# Docker イメージを ECR にプッシュ
docker push $REPOSITORY_URI:$VERSION

echo "Pushed Docker image to ECR: $REPOSITORY_URI:$VERSION"

# リポジトリ内のイメージ一覧を表示
aws ecr list-images \
    --repository-name $REPOSITORY_NAME \
    --region $REGION \
    --profile $PROFILE \
    --query 'imageIds[*].[imageTag]' \
    --output text
