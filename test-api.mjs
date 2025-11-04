const BASE_URL = 'http://localhost:4001';

let token = '';
let accountId = '';
let templateId = '';
let articleId = '';

async function fetchAPI(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }
  return response.json();
}

async function test() {
  try {
    console.log('=== 1. 注册用户 ===');
    const registerData = await fetchAPI(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test${Date.now()}@wchat.com`,
        password: 'Test123456',
        name: '测试用户'
      })
    });
    console.log('✅ 注册成功');
    token = registerData.access_token;
    console.log('Token:', token.substring(0, 50) + '...\n');

    console.log('=== 2. 创建公众号 - 银标Daily ===');
    const accountData = await fetchAPI(`${BASE_URL}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: '银标Daily',
        description: '银行招标信息公众号'
      })
    });
    console.log('✅ 公众号创建成功');
    accountId = accountData.id;
    console.log('Account ID:', accountId);
    console.log('公众号名称:', accountData.name, '\n');

    console.log('=== 3. 创建维度模板 ===');
    const templateData = await fetchAPI(`${BASE_URL}/dimensions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        accountId: accountId,
        name: '招标项目信息',
        description: '提取招标项目的基本信息',
        modelPreference: 'haiku',
        fields: [
          {
            name: 'bank_name',
            label: '银行',
            type: 'text',
            description: '银行名称',
            required: true,
            example: '兴业银行'
          },
          {
            name: 'project_name',
            label: '项目名称',
            type: 'text',
            description: '项目完整名称',
            required: true,
            example: '数据中心运行维护类现场技术服务项目'
          },
          {
            name: 'amount',
            label: '成交价(元)',
            type: 'number',
            description: '项目金额,单位元',
            required: false,
            example: '36330000'
          },
          {
            name: 'date',
            label: '日期',
            type: 'date',
            description: '项目发布日期',
            required: false,
            example: '2025-10'
          }
        ]
      })
    });
    console.log('✅ 维度模板创建成功');
    templateId = templateData.id;
    console.log('Template ID:', templateId);
    console.log('模板名称:', templateData.name);
    console.log('字段数量:', templateData.fields.length, '\n');

    console.log('=== 4. 锁定维度模板 ===');
    await fetchAPI(`${BASE_URL}/dimensions/${templateId}/lock`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ 维度模板已锁定\n');

    console.log('=== 5. 添加文章URL ===');
    console.log('URL: https://mp.weixin.qq.com/s/HTe3dyXkypQKW5uhlyn_kw');
    const articleData = await fetchAPI(`${BASE_URL}/articles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        accountId: accountId,
        url: 'https://mp.weixin.qq.com/s/HTe3dyXkypQKW5uhlyn_kw'
      })
    });
    console.log('✅ 文章添加成功');
    articleId = articleData.id;
    console.log('Article ID:', articleId);
    console.log('文章标题:', articleData.title);
    console.log('状态:', articleData.status, '\n');

    console.log('等待5秒,让爬虫提取文章内容...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('=== 6. 提取所有维度 ===');
    const extractData = await fetchAPI(
      `${BASE_URL}/extractions/articles/${articleId}/extract-all`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    console.log('✅ 提取请求已发送');
    console.log('提取结果:', extractData, '\n');

    console.log('等待20秒,让Claude AI提取内容...');
    await new Promise(resolve => setTimeout(resolve, 20000));

    console.log('=== 7. 查看提取结果 ===');
    const results = await fetchAPI(
      `${BASE_URL}/extractions/articles/${articleId}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    console.log('✅ 提取完成!');
    console.log(`共有 ${results.length} 个维度的提取结果\n`);

    results.forEach((result, index) => {
      console.log(`--- 维度 ${index + 1}: ${result.template.name} ---`);
      console.log('提取的数据:');
      Object.entries(result.extractedData).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
      console.log(`使用模型: ${result.modelUsed}`);
      console.log(`消耗Token: ${result.tokensUsed}`);
      console.log(`提取耗时: ${result.extractionTime}ms`);
      console.log(`状态: ${result.status}\n`);
    });

    console.log('=== 8. 导出数据 ===');
    const exportData = await fetchAPI(
      `${BASE_URL}/extractions/templates/${templateId}/export`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    console.log('✅ 导出成功');
    console.log('导出数据:', JSON.stringify(exportData, null, 2), '\n');

    console.log('\n🎉 所有测试通过!\n');
    console.log('===== 测试摘要 =====');
    console.log('✅ 用户注册');
    console.log('✅ 创建公众号(银标Daily)');
    console.log('✅ 创建维度模板(4个字段)');
    console.log('✅ 锁定模板');
    console.log('✅ 添加文章(兴业银行招标)');
    console.log('✅ 提取内容(Claude AI)');
    console.log('✅ 查看结果');
    console.log('✅ 导出数据');
    console.log('\n后端API测试全部通过! 可以开始开发前端了 🚀\n');

  } catch (error) {
    console.error('\n❌ 测试失败:');
    console.error('错误:', error.message);
    process.exit(1);
  }
}

test();
