import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClaudeService, ExtractionField } from '../claude/claude.service';
import { ArticlesService } from '../articles/articles.service';
import { DimensionsService } from '../dimensions/dimensions.service';

@Injectable()
export class ExtractionsService {
  constructor(
    private prisma: PrismaService,
    private claudeService: ClaudeService,
    private articlesService: ArticlesService,
    private dimensionsService: DimensionsService,
  ) {}

  /**
   * 为文章执行单个维度的提取 - 异步后台处理
   */
  async extractForArticle(articleId: string, templateId: string, userId: string) {
    // 获取文章
    const article = await this.articlesService.findOne(articleId, userId);

    if (article.status === 'error') {
      throw new BadRequestException('文章提取失败,无法进行内容提取');
    }

    // 获取维度模板
    const template = await this.dimensionsService.findOne(templateId, userId);

    // 检查是否已经提取过
    const existingResults = await this.prisma.extractionResult.findMany({
      where: { articleId, templateId },
      take: 1,
    });

    if (existingResults.length > 0) {
      throw new BadRequestException('该文章已使用此维度模板提取过');
    }

    // 生成批次ID
    const batchId = `${articleId}-${templateId}-${Date.now()}`;

    // 先创建占位记录,状态为extracting
    const placeholderResult = await this.prisma.extractionResult.create({
      data: {
        articleId,
        templateId,
        batchId,
        extractedData: {},
        modelUsed: template.modelPreference,
        status: 'extracting',
      },
    });

    // 异步后台提取
    this.performExtraction(batchId, placeholderResult.id, article, template).catch((error) => {
      console.error(`提取失败 ${batchId}:`, error);
    });

    return placeholderResult;
  }

  /**
   * 后台异步执行提取
   */
  private async performExtraction(batchId: string, placeholderId: string, article: any, template: any) {
    try {
      console.log(`开始提取 batchId: ${batchId}, articleId: ${article.id}, templateId: ${template.id}`);

      // 准备内容(优先使用markdown)
      const content = article.markdownContent || JSON.stringify(article.rawContent);
      console.log(`内容长度: ${content.length} 字符`);

      // 调用Claude提取
      console.log(`调用Claude API...`);
      const extractionResult = await this.claudeService.extractData({
        content,
        fields: template.fields as unknown as ExtractionField[],
        modelPreference: template.modelPreference as 'haiku' | 'sonnet',
        customPrompt: template.promptTemplate,
      });
      console.log(`Claude API响应成功, 返回数据数量: ${extractionResult.data?.length || 0}`);

      // Claude返回的是数组,每个元素是一条记录
      const dataArray = extractionResult.data;

      if (!dataArray || dataArray.length === 0) {
        // 如果没有提取到数据,删除占位记录
        await this.prisma.extractionResult.delete({
          where: { id: placeholderId },
        });

        // 更新文章状态
        await this.prisma.article.update({
          where: { id: article.id },
          data: { status: 'completed' },
        });
        return;
      }

      // 为每条数据创建一条提取记录
      console.log(`创建${dataArray.length}条提取记录...`);
      const createPromises = dataArray.map((data, index) =>
        this.prisma.extractionResult.create({
          data: {
            articleId: article.id,
            templateId: template.id,
            batchId,
            extractedData: data, // 单条记录
            modelUsed: extractionResult.modelUsed,
            tokensUsed: Math.floor(extractionResult.tokensUsed / dataArray.length), // 平均分配tokens
            extractionTime: extractionResult.extractionTime,
            status: 'completed',
          },
        })
      );

      await Promise.all(createPromises);
      console.log(`成功创建${dataArray.length}条记录`);

      // 删除占位记录
      await this.prisma.extractionResult.delete({
        where: { id: placeholderId },
      });
      console.log(`删除占位记录: ${placeholderId}`);

      // 更新文章的提取计数和状态
      await this.prisma.article.update({
        where: { id: article.id },
        data: {
          extractionCount: { increment: dataArray.length },
          status: 'completed',
        },
      });
      console.log(`提取完成! batchId: ${batchId}`);
    } catch (error) {
      console.error(`提取失败 ${batchId}:`, error);
      // 更新占位记录为失败状态
      await this.prisma.extractionResult.update({
        where: { id: placeholderId },
        data: {
          status: 'failed',
          errorMessage: error.message,
        },
      });
    }
  }

  /**
   * 为文章执行所有维度的提取 - 异步后台处理
   */
  async extractAllForArticle(articleId: string, userId: string) {
    const article = await this.articlesService.findOne(articleId, userId);

    // 获取该公众号的所有已锁定的维度模板
    const allTemplates = await this.dimensionsService.findAll(userId, article.accountId);
    const templates = allTemplates.filter((t) => t.isLocked);

    if (templates.length === 0) {
      throw new BadRequestException('该公众号没有已锁定的维度模板');
    }

    // 更新文章状态为提取中
    await this.prisma.article.update({
      where: { id: articleId },
      data: { status: 'extracting' },
    });

    // 并行创建所有提取任务(立即返回,后台异步提取)
    const results = await Promise.all(
      templates.map(async (template) => {
        try {
          // 检查是否已提取
          const existingResults = await this.prisma.extractionResult.findMany({
            where: { articleId, templateId: template.id },
            take: 1,
          });

          if (existingResults.length === 0) {
            const result = await this.extractForArticle(articleId, template.id, userId);
            return {
              templateId: template.id,
              templateName: template.name,
              success: true,
              status: 'extracting',
              resultId: result.id
            };
          } else {
            return {
              templateId: template.id,
              templateName: template.name,
              success: false,
              message: '已提取过',
              status: existingResults[0].status
            };
          }
        } catch (error) {
          return {
            templateId: template.id,
            templateName: template.name,
            success: false,
            error: error.message
          };
        }
      }),
    );

    return {
      articleId,
      total: templates.length,
      started: results.filter((r) => r.success).length,
      skipped: results.filter((r) => !r.success).length,
      results,
      message: '提取任务已提交,正在后台处理中',
    };
  }

  /**
   * 获取文章的所有提取结果
   */
  async findByArticle(articleId: string, userId: string) {
    await this.articlesService.findOne(articleId, userId); // 验证权限

    return this.prisma.extractionResult.findMany({
      where: { articleId },
      include: {
        template: true,
      },
      orderBy: {
        template: {
          sortOrder: 'asc',
        },
      },
    });
  }

  /**
   * 获取维度模板的所有提取结果(分页+搜索)
   */
  async findByTemplate(templateId: string, userId: string, page = 1, pageSize = 20, keyword?: string) {
    try {
      await this.dimensionsService.findOne(templateId, userId); // 验证权限

      // 构建搜索条件
      const whereCondition: any = { templateId };

      // 如果有关键词,搜索 extractedData 中的所有字段
      let matchedIds: string[] | null = null;
      if (keyword && keyword.trim()) {
        const searchKeyword = keyword.trim().toLowerCase();
        console.log(`开始搜索关键词: ${keyword}`);

        // 先获取该维度下所有已完成的记录
        const allRecords = await this.prisma.extractionResult.findMany({
          where: {
            templateId,
            status: 'completed', // 只搜索已完成的记录
          },
          select: { id: true, extractedData: true },
        });

        console.log(`获取到 ${allRecords.length} 条记录,开始过滤`);

        // 在内存中过滤匹配关键词的记录
        matchedIds = allRecords
          .filter(record => {
            try {
              // 将 extractedData 转为字符串进行搜索
              const dataStr = JSON.stringify(record.extractedData).toLowerCase();
              return dataStr.includes(searchKeyword);
            } catch (err) {
              console.error(`过滤记录 ${record.id} 时出错:`, err);
              return false;
            }
          })
          .map(record => record.id);

        console.log(`搜索关键词: ${keyword}, 匹配到 ${matchedIds.length} 条记录`);

        if (matchedIds.length === 0) {
        // 没有匹配结果,返回空数据但保留总体统计
        const [completed, failed, allResults] = await Promise.all([
          this.prisma.extractionResult.count({ where: { templateId, status: 'completed' } }),
          this.prisma.extractionResult.count({ where: { templateId, status: 'failed' } }),
          this.prisma.extractionResult.findMany({
            where: { templateId },
            select: { tokensUsed: true },
          }),
        ]);

        const totalTokens = allResults.reduce((sum, r) => sum + (r.tokensUsed || 0), 0);
        const totalCount = await this.prisma.extractionResult.count({ where: { templateId } });

        return {
          items: [],
          total: 0, // 搜索结果为0
          page,
          pageSize,
          stats: {
            total: totalCount, // 保留总体统计
            completed,
            failed,
            totalTokens,
          },
        };
      }

      whereCondition.id = { in: matchedIds };
    }

    const [items, total, completed, failed, allResults] = await Promise.all([
      this.prisma.extractionResult.findMany({
        where: whereCondition,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          article: {
            select: {
              id: true,
              title: true,
              url: true,
              publishTime: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.extractionResult.count({ where: whereCondition }),
      this.prisma.extractionResult.count({ where: { templateId, status: 'completed' } }),
      this.prisma.extractionResult.count({ where: { templateId, status: 'failed' } }),
      this.prisma.extractionResult.findMany({
        where: { templateId },
        select: { tokensUsed: true },
      }),
    ]);

      const totalTokens = allResults.reduce((sum, r) => sum + (r.tokensUsed || 0), 0);

      return {
        items,
        total,
        page,
        pageSize,
        stats: {
          total,
          completed,
          failed,
          totalTokens,
        },
      };
    } catch (error) {
      console.error(`获取维度数据失败 (templateId: ${templateId}):`, error);
      throw error;
    }
  }

  /**
   * 删除提取结果
   */
  async remove(id: string, userId: string) {
    const result = await this.prisma.extractionResult.findUnique({
      where: { id },
      include: { article: true },
    });

    if (!result) {
      throw new NotFoundException('提取结果不存在');
    }

    // 验证权限
    await this.articlesService.findOne(result.articleId, userId);

    return this.prisma.extractionResult.delete({
      where: { id },
    });
  }

  /**
   * 导出提取结果为JSON
   */
  async exportByTemplate(templateId: string, userId: string) {
    await this.dimensionsService.findOne(templateId, userId);

    const results = await this.prisma.extractionResult.findMany({
      where: { templateId, status: 'success' },
      include: {
        article: {
          select: {
            title: true,
            url: true,
            publishTime: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return results.map((r) => ({
      ...(r.extractedData as Record<string, any>),
      _meta: {
        articleTitle: r.article.title,
        articleUrl: r.article.url,
        publishTime: r.article.publishTime,
        extractedAt: r.createdAt,
      },
    }));
  }
}
