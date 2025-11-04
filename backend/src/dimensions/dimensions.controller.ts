import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { DimensionsService, CreateDimensionDto, UpdateDimensionDto } from './dimensions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExtractionField } from '../claude/claude.service';

class CreateFromImageDto {
  @ApiProperty({ example: 'account-id' })
  @IsString()
  accountId: string;

  @ApiProperty({ example: '维度名称' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'base64编码的图片' })
  @IsString()
  imageBase64: string;
}

class AddFieldsDto {
  fields: ExtractionField[];
}

class AIGenerateFieldDto {
  @ApiProperty({ example: '请添加一个字段用于记录项目预算金额' })
  @IsString()
  description: string;
}

class ReorderDto {
  templateIds: string[];
}

@ApiTags('维度管理')
@Controller('dimensions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DimensionsController {
  constructor(private readonly dimensionsService: DimensionsService) {}

  @Post()
  @ApiOperation({ summary: '创建维度模板' })
  create(@Request() req, @Body() createDimensionDto: CreateDimensionDto) {
    return this.dimensionsService.create(req.user.userId, createDimensionDto);
  }

  @Post('from-image')
  @ApiOperation({ summary: '从图片创建维度模板' })
  createFromImage(@Request() req, @Body() createFromImageDto: CreateFromImageDto) {
    return this.dimensionsService.createFromImage(
      req.user.userId,
      createFromImageDto.accountId,
      createFromImageDto.imageBase64,
      createFromImageDto.name,
    );
  }

  @Get()
  @ApiOperation({ summary: '获取维度模板列表' })
  findAll(@Request() req, @Query('accountId') accountId: string) {
    return this.dimensionsService.findAll(req.user.userId, accountId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取维度模板详情' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.dimensionsService.findOne(id, req.user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新维度模板' })
  update(@Param('id') id: string, @Request() req, @Body() updateDimensionDto: UpdateDimensionDto) {
    return this.dimensionsService.update(id, req.user.userId, updateDimensionDto);
  }

  @Post(':id/lock')
  @ApiOperation({ summary: '锁定维度模板' })
  lock(@Param('id') id: string, @Request() req) {
    return this.dimensionsService.lock(id, req.user.userId);
  }

  @Post(':id/unlock')
  @ApiOperation({ summary: '解锁维度模板' })
  unlock(@Param('id') id: string, @Request() req) {
    return this.dimensionsService.unlock(id, req.user.userId);
  }

  @Post(':id/add-fields')
  @ApiOperation({ summary: '向已锁定的模板添加字段' })
  addFields(@Param('id') id: string, @Request() req, @Body() addFieldsDto: AddFieldsDto) {
    return this.dimensionsService.addFields(id, req.user.userId, addFieldsDto.fields);
  }

  @Post(':id/ai-generate-field')
  @ApiOperation({ summary: 'AI智能生成字段' })
  aiGenerateField(@Param('id') id: string, @Request() req, @Body() aiGenerateFieldDto: AIGenerateFieldDto) {
    return this.dimensionsService.aiGenerateField(id, req.user.userId, aiGenerateFieldDto.description);
  }

  @Post('reorder')
  @ApiOperation({ summary: '调整维度模板排序' })
  reorder(@Request() req, @Query('accountId') accountId: string, @Body() reorderDto: ReorderDto) {
    return this.dimensionsService.reorder(req.user.userId, accountId, reorderDto.templateIds);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除维度模板' })
  remove(@Param('id') id: string, @Request() req) {
    return this.dimensionsService.remove(id, req.user.userId);
  }
}
