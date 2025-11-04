import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ModelsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.modelConfig.findMany({
      where: { isActive: true },
      orderBy: { isDefault: 'desc' },
    });
  }

  async getDefault() {
    const defaultModel = await this.prisma.modelConfig.findFirst({
      where: { isDefault: true, isActive: true },
    });

    if (!defaultModel) {
      // 返回Haiku作为默认
      return {
        id: 'default',
        name: 'Claude Haiku 4.5',
        modelId: 'claude-haiku-4-5-20251001',
        description: '快速高效的模型',
        isDefault: true,
      };
    }

    return defaultModel;
  }
}
