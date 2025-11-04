import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAccountDto {
  name: string;
  description?: string;
  avatarUrl?: string;
  wechatId?: string;
  biz?: string;
  reservedFields?: any;
}

export interface UpdateAccountDto {
  name?: string;
  description?: string;
  avatarUrl?: string;
  wechatId?: string;
  biz?: string;
  reservedFields?: any;
  isActive?: boolean;
}

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createAccountDto: CreateAccountDto) {
    return this.prisma.officialAccount.create({
      data: {
        userId,
        ...createAccountDto,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.officialAccount.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            articles: true,
            dimensionTemplates: true,
          },
        },
      },
    });
  }

  async findOne(id: string, userId: string) {
    const account = await this.prisma.officialAccount.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            articles: true,
            dimensionTemplates: true,
          },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('公众号不存在');
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('无权访问该公众号');
    }

    return account;
  }

  async update(id: string, userId: string, updateAccountDto: UpdateAccountDto) {
    await this.findOne(id, userId); // 验证权限

    return this.prisma.officialAccount.update({
      where: { id },
      data: updateAccountDto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // 验证权限

    return this.prisma.officialAccount.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
