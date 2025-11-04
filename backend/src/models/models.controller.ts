import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ModelsService } from './models.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('模型管理')
@Controller('models')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  @Get()
  @ApiOperation({ summary: '获取可用模型列表' })
  findAll() {
    return this.modelsService.findAll();
  }

  @Get('default')
  @ApiOperation({ summary: '获取默认模型' })
  getDefault() {
    return this.modelsService.getDefault();
  }
}
