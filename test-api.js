const axios = require('axios');

const BASE_URL = 'http://localhost:4001';

let token = '';
let accountId = '';
let templateId = '';
let articleId = '';

async function test() {
  try {
    console.log('=== 1. 注册用户 ===');
    const registerRes = await axios.post(`${BASE_URL}/auth/register`, {
      email: `test${Date.now()}@wchat.com`,
      password: 'Test123456',
      name: '测试用户'
    });
    console.log('✅ 注册成功:', registerRes.data);
    token = registerRes.data.access_token;
    console.log('Token:', token.substring(0, 50) + '...\n');

    console.log('=== 2. 创建公众号 ===');
    const accountRes = await axios.post(`${BASE_URL}/accounts`, {
      name: '银标Daily',
      description: '银行招标信息公众号'
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ 公众号创建成功:', accountRes.data);
    accountId = accountRes.data.id;
    console.log('Account ID:', accountId, '\n');

    console.log('=== 3. 创建维度模板 ===');
    const templateRes = await axios.post(`${BASE_URL}/dimensions`, {
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
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ 维度模板创建成功:', templateRes.data);
    templateId = templateRes.data.id;
    console.log('Template ID:', templateId, '\n');

    console.log('=== 4. 锁定维度模板 ===');
    const lockRes = await axios.post(`${BASE_URL}/dimensions/${templateId}/lock`, {}, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ 维度模板已锁定\n');

    console.log('=== 5. 添加文章URL ===');
    const articleRes = await axios.post(`${BASE_URL}/articles`, {
      accountId: accountId,
      url: 'https://mp.weixin.qq.com/s/HTe3dyXkypQKW5uhlyn_kw'
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ 文章添加成功:', articleRes.data);
    articleId = articleRes.data.id;
    console.log('Article ID:', articleId);
    console.log('文章标题:', articleRes.data.title);
    console.log('状态:', articleRes.data.status, '\n');

    console.log('等待5秒,让文章内容提取完成...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('=== 6. 提取所有维度 ===');
    const extractRes = await axios.post(
      `${BASE_URL}/extractions/articles/${articleId}/extract-all`,
      {},
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    console.log('✅ 提取请求已发送:', extractRes.data, '\n');

    console.log('等待15秒,让AI提取完成...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    console.log('=== 7. 查看提取结果 ===');
    const resultRes = await axios.get(
      `${BASE_URL}/extractions/articles/${articleId}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    console.log('✅ 提取结果:');
    resultRes.data.forEach((result, index) => {
      console.log(`\n维度 ${index + 1}:`, result.template.name);
      console.log('提取的数据:', JSON.stringify(result.extractedData, null, 2));
      console.log('使用模型:', result.modelUsed);
      console.log('消耗Token:', result.tokensUsed);
      console.log('提取耗时:', result.extractionTime, 'ms');
    });

    console.log('\n=== 8. 导出数据 ===');
    const exportRes = await axios.get(
      `${BASE_URL}/extractions/templates/${templateId}/export`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    console.log('✅ 导出数据:', JSON.stringify(exportRes.data, null, 2));

    console.log('\n\n🎉 所有测试通过!');
    console.log('\n测试摘要:');
    console.log('- 用户注册: ✅');
    console.log('- 创建公众号: ✅');
    console.log('- 创建维度模板: ✅');
    console.log('- 锁定模板: ✅');
    console.log('- 添加文章: ✅');
    console.log('- 提取内容: ✅');
    console.log('- 查看结果: ✅');
    console.log('- 导出数据: ✅');

  } catch (error) {
    console.error('\n❌ 测试失败:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误信息:', error.response.data);
    } else {
      console.error('错误:', error.message);
    }
    process.exit(1);
  }
}

test();
