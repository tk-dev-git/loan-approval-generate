#!/bin/zsh

REGION="ap-northeast-1"
REPOSITORY_NAME="hsol-loan-approval"
PROFILE="hsol-t.kikunaga"

# ECRリポジトリの作成
aws ecr create-repository \
    --repository-name $REPOSITORY_NAME \
    --region $REGION \
    --profile $PROFILE

# ECRリポジトリのURIを取得
REPOSITORY_URI=$(aws ecr describe-repositories \
    --repository-names $REPOSITORY_NAME \
    --region $REGION \
    --profile $PROFILE \
    --query 'repositories[0].repositoryUri' \
    --output text)

echo "ECR Repository URI: $REPOSITORY_URI"
