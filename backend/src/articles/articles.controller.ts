import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsNotEmpty } from 'class-validator';
import { ArticlesService, CreateArticleDto } from './articles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class CreateArticleBatchDto {
  @ApiProperty({ description: '公众号ID' })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({ description: '文章URL列表', type: [String] })
  @IsArray()
  @IsNotEmpty()
  urls: string[];
}

class DeleteArticleBatchDto {
  @ApiProperty({ description: '文章ID列表', type: [String] })
  @IsArray()
  @IsNotEmpty()
  ids: string[];
}

@ApiTags('文章管理')
@Controller('articles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @ApiOperation({ summary: '添加文章URL并自动提取内容' })
  create(@Request() req, @Body() createArticleDto: CreateArticleDto) {
    return this.articlesService.create(req.user.userId, createArticleDto);
  }

  @Post('batch')
  @ApiOperation({ summary: '批量添加文章URL' })
  createBatch(@Request() req, @Body() createBatchDto: CreateArticleBatchDto) {
    return this.articlesService.createBatch(
      req.user.userId,
      createBatchDto.accountId,
      createBatchDto.urls,
    );
  }

  @Get()
  @ApiOperation({ summary: '获取文章列表' })
  @ApiQuery({ name: 'accountId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  findAll(
    @Request() req,
    @Query('accountId') accountId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.articlesService.findAll(
      req.user.userId,
      accountId,
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 20,
    );
  }

  @Get(':id/content')
  @ApiOperation({ summary: '获取文章Markdown内容' })
  getContent(@Param('id') id: string, @Request() req) {
    return this.articlesService.getContent(id, req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取文章详情' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.articlesService.findOne(id, req.user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除文章' })
  remove(@Param('id') id: string, @Request() req) {
    return this.articlesService.remove(id, req.user.userId);
  }

  @Post('batch-delete')
  @ApiOperation({ summary: '批量删除文章' })
  batchDelete(@Request() req, @Body() deleteBatchDto: DeleteArticleBatchDto) {
    return this.articlesService.batchDelete(req.user.userId, deleteBatchDto.ids);
  }

  @Post('resume-tasks')
  @ApiOperation({ summary: '恢复未完成的任务处理' })
  resumeTasks() {
    return this.articlesService.resumePendingTasks();
  }
}
