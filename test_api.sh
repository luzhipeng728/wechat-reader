#!/bin/bash

# 测试API脚本
BASE_URL="http://localhost:3001"

echo "=== 1. 注册用户 ==="
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "yinbiao@test.com",
    "password": "password123",
    "name": "银标测试用户"
  }')

echo "$REGISTER_RESPONSE" | python3 -m json.tool
TOKEN=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "注册失败,尝试登录..."
  LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "yinbiao@test.com",
      "password": "password123"
    }')
  echo "$LOGIN_RESPONSE" | python3 -m json.tool
  TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)
fi

echo ""
echo "Token: $TOKEN"
echo ""

echo "=== 2. 创建公众号 - 银标Daily ==="
ACCOUNT_RESPONSE=$(curl -s -X POST "$BASE_URL/accounts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "银标Daily",
    "description": "银行招标信息公众号"
  }')

echo "$ACCOUNT_RESPONSE" | python3 -m json.tool
ACCOUNT_ID=$(echo "$ACCOUNT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

echo ""
echo "Account ID: $ACCOUNT_ID"
echo ""

echo "=== 3. 创建维度模板 - 招标项目信息 ==="
TEMPLATE_RESPONSE=$(curl -s -X POST "$BASE_URL/dimensions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"accountId\": \"$ACCOUNT_ID\",
    \"name\": \"招标项目信息\",
    \"description\": \"提取招标项目的基本信息\",
    \"modelPreference\": \"haiku\",
    \"fields\": [
      {
        \"name\": \"bank_name\",
        \"label\": \"银行\",
        \"type\": \"text\",
        \"description\": \"银行名称\",
        \"required\": true,
        \"example\": \"兴业银行\"
      },
      {
        \"name\": \"project_name\",
        \"label\": \"项目名称\",
        \"type\": \"text\",
        \"description\": \"项目完整名称\",
        \"required\": true,
        \"example\": \"数据中心运行维护类现场技术服务项目\"
      },
      {
        \"name\": \"amount\",
        \"label\": \"成交价(元)\",
        \"type\": \"number\",
        \"description\": \"项目金额,单位元\",
        \"required\": false,
        \"example\": \"36330000\"
      },
      {
        \"name\": \"date\",
        \"label\": \"日期\",
        \"type\": \"date\",
        \"description\": \"项目发布日期\",
        \"required\": false,
        \"example\": \"2025-10\"
      }
    ]
  }")

echo "$TEMPLATE_RESPONSE" | python3 -m json.tool
TEMPLATE_ID=$(echo "$TEMPLATE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

echo ""
echo "Template ID: $TEMPLATE_ID"
echo ""

echo "=== 4. 锁定维度模板 ==="
LOCK_RESPONSE=$(curl -s -X POST "$BASE_URL/dimensions/$TEMPLATE_ID/lock" \
  -H "Authorization: Bearer $TOKEN")

echo "$LOCK_RESPONSE" | python3 -m json.tool
echo ""

echo "=== 5. 添加文章URL ==="
ARTICLE_RESPONSE=$(curl -s -X POST "$BASE_URL/articles" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"accountId\": \"$ACCOUNT_ID\",
    \"url\": \"https://mp.weixin.qq.com/s/HTe3dyXkypQKW5uhlyn_kw\"
  }")

echo "$ARTICLE_RESPONSE" | python3 -m json.tool
ARTICLE_ID=$(echo "$ARTICLE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

echo ""
echo "Article ID: $ARTICLE_ID"
echo ""

echo "等待5秒,确保文章已提取..."
sleep 5

echo "=== 6. 提取所有维度 ==="
EXTRACT_RESPONSE=$(curl -s -X POST "$BASE_URL/extractions/articles/$ARTICLE_ID/extract-all" \
  -H "Authorization: Bearer $TOKEN")

echo "$EXTRACT_RESPONSE" | python3 -m json.tool
echo ""

echo "等待10秒,让AI提取完成..."
sleep 10

echo "=== 7. 查看提取结果 ==="
RESULT_RESPONSE=$(curl -s -X GET "$BASE_URL/extractions/articles/$ARTICLE_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$RESULT_RESPONSE" | python3 -m json.tool
echo ""

echo "=== 8. 导出数据 ==="
EXPORT_RESPONSE=$(curl -s -X GET "$BASE_URL/extractions/templates/$TEMPLATE_ID/export" \
  -H "Authorization: Bearer $TOKEN")

echo "$EXPORT_RESPONSE" | python3 -m json.tool
echo ""

echo "=== 测试完成! ==="
echo "访问 http://localhost:3001/api/docs 查看完整API文档"
