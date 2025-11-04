import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SpiderService } from '../spider/spider.service';
import { AccountsService } from '../accounts/accounts.service';
import { ConcurrencyLimiter } from '../common/concurrency-limiter';
import { ClaudeService, ExtractionField } from '../claude/claude.service';

export interface CreateArticleDto {
  accountId: string;
  url: string;
}

@Injectable()
export class ArticlesService implements OnModuleInit {
  private spiderConcurrencyLimiter: ConcurrencyLimiter;

  constructor(
    private prisma: PrismaService,
    private spiderService: SpiderService,
    private accountsService: AccountsService,
    private claudeService: ClaudeService,
  ) {
    // 限制整体任务(下载+提取)并发为5
    this.spiderConcurrencyLimiter = new ConcurrencyLimiter(5);
  }

  /**
   * 应用启动时恢复未完成的任务
   */
  async onModuleInit() {
    console.log('[启动] 检查并恢复未完成的文章处理任务...');

    // 延迟3秒后启动,确保所有服务都已初始化
    setTimeout(async () => {
      try {
        await this.processExtractionQueue();
        console.log('[启动] 任务恢复完成');
      } catch (error) {
        console.error('[启动] 任务恢复失败:', error);
      }
    }, 3000);
  }

  /**
   * 从微信文章URL提取newsId
   */
  private extractNewsId(url: string): string {
    // URL格式: https://mp.weixin.qq.com/s/xxxxx 或 https://mp.weixin.qq.com/s?__biz=xxx&mid=xxx&idx=xxx&sn=xxxxx
    try {
      const urlObj = new URL(url);

      // 方式1: /s/xxxxx 格式
      const pathMatch = urlObj.pathname.match(/\/s\/([a-zA-Z0-9_-]+)/);
      if (pathMatch) {
        return pathMatch[1];
      }

      // 方式2: ?sn=xxxxx 格式
      const snParam = urlObj.searchParams.get('sn');
      if (snParam) {
        return snParam;
      }

      throw new Error('无法从URL提取文章ID');
    } catch (error) {
      throw new BadRequestException('无效的微信文章URL');
    }
  }

  /**
   * 创建文章 - 异步后台提取内容
   */
  async create(userId: string, createArticleDto: CreateArticleDto) {
    // 验证公众号权限
    await this.accountsService.findOne(createArticleDto.accountId, userId);

    // 提取newsId
    const newsId = this.extractNewsId(createArticleDto.url);

    // 检查newsId是否已存在
    const existingByNewsId = await this.prisma.article.findFirst({
      where: {
        newsId,
        accountId: createArticleDto.accountId,
      },
    });

    if (existingByNewsId) {
      throw new BadRequestException('该文章已存在(newsId重复)');
    }

    // 检查URL是否已存在
    const existingArticle = await this.prisma.article.findUnique({
      where: { url: createArticleDto.url },
    });

    if (existingArticle) {
      throw new BadRequestException('该文章URL已存在');
    }

    // 先创建文章记录,状态为extracting
    const article = await this.prisma.article.create({
      data: {
        accountId: createArticleDto.accountId,
        url: createArticleDto.url,
        newsId, // 使用提取的newsId
        title: '正在提取...',
        rawContent: {},
        status: 'extracting', // 提取中
      },
    });

    // 异步后台提取内容
    this.extractArticleContent(article.id, createArticleDto.url).catch((error) => {
      console.error(`文章提取失败 ${article.id}:`, error);
    });

    return article;
  }

  /**
   * 完整的文章处理任务:下载 + 数据提取(带并发控制)
   * 一个任务 = 下载文章 + 提取所有锁定维度的数据
   */
  private async extractArticleContent(articleId: string, url: string) {
    // 使用并发限制器执行完整任务(下载+提取)
    await this.spiderConcurrencyLimiter.run(async () => {
      const runningCount = this.spiderConcurrencyLimiter.getRunningCount();
      console.log(`[任务队列] 当前并发数: ${runningCount}/5, 文章ID: ${articleId}`);

      try {
        // ===== 第一步:下载文章 =====
        // 更新状态为downloading
        await this.prisma.article.update({
          where: { id: articleId },
          data: {
            status: 'downloading',
            title: '正在下载文章...',
          },
        });

        console.log(`[任务队列] 步骤1/2: 开始下载文章 ${articleId}`);
        const spiderResult = await this.spiderService.extractArticle(url);

        // 解析发布时间
        let publishTime: Date | null = null;
        if (spiderResult.data.meta_info.publish_time) {
          publishTime = new Date(spiderResult.data.meta_info.publish_time);
        }

        // 获取文章信息(包括accountId)
        const article = await this.prisma.article.findUnique({
          where: { id: articleId },
          select: { accountId: true },
        });

        // 更新文章内容
        await this.prisma.article.update({
          where: { id: articleId },
          data: {
            newsId: spiderResult.data.news_id,
            title: spiderResult.data.title,
            authorName: spiderResult.data.meta_info.author_name,
            publishTime,
            rawContent: spiderResult.data as any,
            markdownContent: spiderResult.markdown,
            status: 'extracting', // 正在提取数据
          },
        });

        console.log(`[任务队列] 步骤1/2完成: 文章下载成功 ${articleId}`);

        // ===== 第二步:自动提取数据 =====
        console.log(`[任务队列] 步骤2/2: 开始数据提取 ${articleId}`);

        // 查询该公众号的所有已锁定的维度模板
        const lockedTemplates = await this.prisma.dimensionTemplate.findMany({
          where: {
            accountId: article.accountId,
            isLocked: true,
          },
        });

        if (lockedTemplates.length === 0) {
          console.log(`[任务队列] 公众号 ${article.accountId} 没有锁定的维度模板,跳过数据提取`);
          // 没有锁定的模板,直接标记为完成
          await this.prisma.article.update({
            where: { id: articleId },
            data: { status: 'completed' },
          });
          console.log(`[任务队列] 任务完成 ${articleId}`);
          return;
        }

        console.log(`[任务队列] 发现 ${lockedTemplates.length} 个锁定的维度模板`);

        // 准备内容(优先使用markdown)
        const content = spiderResult.markdown || JSON.stringify(spiderResult.data);

        // 依次处理每个维度模板
        for (const template of lockedTemplates) {
          try {
            console.log(`[任务队列] 提取维度: ${template.name}`);

            // 检查是否已提取过
            const existingResults = await this.prisma.extractionResult.findMany({
              where: { articleId, templateId: template.id },
              take: 1,
            });

            if (existingResults.length > 0) {
              console.log(`[任务队列] 维度 ${template.name} 已提取过,跳过`);
              continue;
            }

            // 调用Claude提取数据
            const extractionResult = await this.claudeService.extractData({
              content,
              fields: template.fields as unknown as ExtractionField[],
              modelPreference: template.modelPreference as 'haiku' | 'sonnet',
              customPrompt: template.promptTemplate,
            });

            const dataArray = extractionResult.data;

            if (!dataArray || dataArray.length === 0) {
              console.log(`[任务队列] 维度 ${template.name} 未提取到数据`);
              continue;
            }

            // 生成批次ID
            const batchId = `${articleId}-${template.id}-${Date.now()}`;

            // 创建提取记录
            const results = [];
            for (let i = 0; i < dataArray.length; i++) {
              const result = await this.prisma.extractionResult.create({
                data: {
                  articleId,
                  templateId: template.id,
                  batchId,
                  extractedData: dataArray[i],
                  modelUsed: extractionResult.modelUsed,
                  tokensUsed: Math.floor(extractionResult.tokensUsed / dataArray.length),
                  extractionTime: Math.floor(extractionResult.extractionTime / dataArray.length),
                  status: 'completed',
                },
              });
              results.push(result);
            }

            console.log(`[任务队列] 维度 ${template.name} 提取成功: ${dataArray.length} 条记录`);
          } catch (error) {
            console.error(`[任务队列] 维度 ${template.name} 提取失败:`, error.message);
          }
        }

        // 更新文章状态为已完成
        await this.prisma.article.update({
          where: { id: articleId },
          data: {
            status: 'completed',
            extractionCount: await this.prisma.extractionResult.count({
              where: { articleId },
            }),
          },
        });

        console.log(`[任务队列] 步骤2/2完成: 数据提取完成 ${articleId}`);
        console.log(`[任务队列] ✅ 任务全部完成 ${articleId}`);

      } catch (error) {
        console.error(`[任务队列] ❌ 任务失败 ${articleId}:`, error.message);

        // 任务失败,更新状态
        await this.prisma.article.update({
          where: { id: articleId },
          data: {
            title: error.message.includes('爬虫') ? '下载失败' : '提取失败',
            status: 'error',
            errorMessage: error.message,
          },
        });
      }
    });
  }

  /**
   * 获取文章列表
   */
  async findAll(userId: string, accountId?: string, page = 1, pageSize = 20) {
    // 如果指定了accountId,验证权限
    if (accountId) {
      await this.accountsService.findOne(accountId, userId);
    } else {
      // 获取用户的所有公众号ID
      const accounts = await this.accountsService.findAll(userId);
      const accountIds = accounts.map((a) => a.id);

      if (accountIds.length === 0) {
        return { items: [], total: 0, page, pageSize };
      }

      accountId = undefined; // 查询所有
    }

    const where = accountId ? { accountId } : {};

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          account: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              extractionResults: true,
            },
          },
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取文章详情
   */
  async findOne(id: string, userId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        account: true,
        extractionResults: {
          include: {
            template: true,
          },
        },
      },
    });

    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    // 验证权限
    await this.accountsService.findOne(article.accountId, userId);

    return article;
  }

  /**
   * 获取文章Markdown内容
   */
  async getContent(id: string, userId: string) {
    const article = await this.findOne(id, userId);

    if (!article.markdownContent) {
      throw new NotFoundException('文章内容尚未提取或提取失败');
    }

    return {
      id: article.id,
      title: article.title,
      url: article.url,
      newsId: article.newsId,
      authorName: article.authorName,
      publishTime: article.publishTime,
      markdownContent: article.markdownContent,
    };
  }

  /**
   * 删除文章
   */
  async remove(id: string, userId: string) {
    const article = await this.findOne(id, userId);

    return this.prisma.article.delete({
      where: { id: article.id },
    });
  }

  /**
   * 批量删除文章
   */
  async batchDelete(userId: string, ids: string[]) {
    // 验证所有文章的权限
    const articles = await this.prisma.article.findMany({
      where: { id: { in: ids } },
      include: { account: true },
    });

    // 检查权限
    for (const article of articles) {
      await this.accountsService.findOne(article.accountId, userId);
    }

    // 批量删除
    const result = await this.prisma.article.deleteMany({
      where: { id: { in: ids } },
    });

    return {
      success: true,
      deletedCount: result.count,
    };
  }

  /**
   * 手动恢复未完成的任务
   */
  async resumePendingTasks() {
    console.log('[手动恢复] 开始恢复未完成的任务...');
    await this.processExtractionQueue();
    return {
      success: true,
      message: '任务恢复处理已启动',
    };
  }

  /**
   * 批量创建文章 - 快速创建记录,后台队列处理下载
   */
  async createBatch(userId: string, accountId: string, urls: string[]) {
    // 验证权限
    await this.accountsService.findOne(accountId, userId);

    const results = [];

    // 快速创建所有文章记录(不触发下载)
    for (const url of urls) {
      try {
        // 提取newsId
        const newsId = this.extractNewsId(url);

        // 检查newsId是否已存在
        const existingByNewsId = await this.prisma.article.findFirst({
          where: {
            newsId,
            accountId,
          },
        });

        if (existingByNewsId) {
          results.push({ url, success: false, error: '该文章已存在(newsId重复)' });
          continue;
        }

        // 检查URL是否已存在
        const existingArticle = await this.prisma.article.findUnique({
          where: { url },
        });

        if (existingArticle) {
          results.push({ url, success: false, error: '该文章URL已存在' });
          continue;
        }

        // 创建文章记录,状态为pending(排队等待)
        const article = await this.prisma.article.create({
          data: {
            accountId,
            url,
            newsId,
            title: '排队等待中...',
            rawContent: {},
            status: 'pending', // 排队等待
          },
        });

        results.push({ url, success: true, articleId: article.id, status: 'extracting' });
      } catch (error) {
        results.push({ url, success: false, error: error.message });
      }
    }

    // 触发后台下载队列处理器(异步,不等待完成)
    this.processExtractionQueue().catch((error) => {
      console.error('[批量添加] 队列处理器错误:', error);
    });

    return {
      total: urls.length,
      success: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  /**
   * 处理提取队列 - 从数据库中取出待处理的文章,按5个并发进行处理
   */
  private async processExtractionQueue() {
    // 查询所有等待处理的文章(pending状态)
    const pendingArticles = await this.prisma.article.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' }, // 按创建时间排序,先创建的先处理
    });

    if (pendingArticles.length === 0) {
      return;
    }

    console.log(`[队列处理器] 发现 ${pendingArticles.length} 篇待处理文章`);

    // 使用并发限制器处理所有文章
    const tasks = pendingArticles.map((article) => async () => {
      await this.extractArticleContent(article.id, article.url);
    });

    // 并发执行所有任务(并发限制器会自动控制为5个并发)
    await Promise.all(tasks.map((task) => task()));

    console.log(`[队列处理器] 处理完成`);
  }
}
