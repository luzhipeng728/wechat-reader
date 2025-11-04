import { Controller, Get, Post, Delete, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ExtractionsService } from './extractions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('内容提取')
@Controller('extractions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExtractionsController {
  constructor(private readonly extractionsService: ExtractionsService) {}

  @Post('articles/:articleId/templates/:templateId')
  @ApiOperation({ summary: '为文章执行单个维度的提取' })
  extractForArticle(
    @Param('articleId') articleId: string,
    @Param('templateId') templateId: string,
    @Request() req,
  ) {
    return this.extractionsService.extractForArticle(articleId, templateId, req.user.userId);
  }

  @Post('articles/:articleId/extract-all')
  @ApiOperation({ summary: '为文章执行所有维度的提取' })
  extractAllForArticle(@Param('articleId') articleId: string, @Request() req) {
    return this.extractionsService.extractAllForArticle(articleId, req.user.userId);
  }

  @Get('articles/:articleId')
  @ApiOperation({ summary: '获取文章的所有提取结果' })
  findByArticle(@Param('articleId') articleId: string, @Request() req) {
    return this.extractionsService.findByArticle(articleId, req.user.userId);
  }

  @Get('templates/:templateId')
  @ApiOperation({ summary: '获取维度模板的所有提取结果(支持搜索)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'keyword', required: false, description: '搜索关键词' })
  findByTemplate(
    @Param('templateId') templateId: string,
    @Request() req,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.extractionsService.findByTemplate(
      templateId,
      req.user.userId,
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 20,
      keyword,
    );
  }

  @Get('templates/:templateId/export')
  @ApiOperation({ summary: '导出维度模板的提取结果' })
  exportByTemplate(@Param('templateId') templateId: string, @Request() req) {
    return this.extractionsService.exportByTemplate(templateId, req.user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除提取结果' })
  remove(@Param('id') id: string, @Request() req) {
    return this.extractionsService.remove(id, req.user.userId);
  }
}
