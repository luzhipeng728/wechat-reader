const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearArticles() {
  try {
    console.log('开始清空文章数据...');

    // 先删除所有提取结果
    const deletedExtractions = await prisma.extractionResult.deleteMany({});
    console.log(`已删除 ${deletedExtractions.count} 条提取结果`);

    // 再删除所有文章
    const deletedArticles = await prisma.article.deleteMany({});
    console.log(`已删除 ${deletedArticles.count} 篇文章`);

    console.log('清空完成!');
  } catch (error) {
    console.error('清空失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearArticles();
