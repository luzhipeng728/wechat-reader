import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClaudeService, ExtractionField } from '../claude/claude.service';
import { AccountsService } from '../accounts/accounts.service';

export interface CreateDimensionDto {
  accountId: string;
  name: string;
  description?: string;
  fields: ExtractionField[];
  promptTemplate?: string;
  modelPreference?: 'haiku' | 'sonnet';
}

export interface UpdateDimensionDto {
  name?: string;
  description?: string;
  fields?: ExtractionField[];
  modelPreference?: 'haiku' | 'sonnet';
  promptTemplate?: string;
  isActive?: boolean;
}

@Injectable()
export class DimensionsService {
  constructor(
    private prisma: PrismaService,
    private claudeService: ClaudeService,
    private accountsService: AccountsService,
  ) {}

  /**
   * 创建维度模板
   */
  async create(userId: string, createDimensionDto: CreateDimensionDto) {
    // 验证公众号权限
    await this.accountsService.findOne(createDimensionDto.accountId, userId);

    // 如果没有提供promptTemplate,自动生成一个
    let promptTemplate = createDimensionDto.promptTemplate;
    if (!promptTemplate) {
      promptTemplate = this.generateDefaultPrompt(
        createDimensionDto.name,
        createDimensionDto.description || '',
        createDimensionDto.fields,
      );
    }

    // 获取当前最大sortOrder
    const maxOrder = await this.prisma.dimensionTemplate.findFirst({
      where: { accountId: createDimensionDto.accountId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    return this.prisma.dimensionTemplate.create({
      data: {
        ...createDimensionDto,
        promptTemplate,
        fields: createDimensionDto.fields as any,
        sortOrder: (maxOrder?.sortOrder || 0) + 1,
      },
    });
  }

  /**
   * 生成默认的提取prompt
   */
  private generateDefaultPrompt(name: string, description: string, fields: ExtractionField[]): string {
    const fieldsDesc = fields
      .map((field) => {
        const requiredText = field.required ? '(必填)' : '(可选)';
        const exampleText = field.example ? `\n  示例: ${field.example}` : '';
        return `- ${field.label} (${field.name}) ${requiredText}\n  类型: ${field.type}\n  说明: ${field.description}${exampleText}`;
      })
      .join('\n\n');

    return `请从以下文章内容中提取${name}相关的数据。

${description ? `维度说明: ${description}\n\n` : ''}需要提取的字段:
${fieldsDesc}

请仔细阅读文章内容,提取上述字段的值。如果某个字段在文章中找不到对应信息,请填写null。

返回格式要求:
1. 必须返回JSON数组格式,即使只有一条数据也要放在数组中
2. 如果文章中有多条符合条件的数据,请全部提取并放入数组
3. 每个数组元素是一个对象,包含所有字段
4. JSON的key必须使用字段的name属性(英文名)
5. 数值类型的字段请返回数字,不要包含单位和逗号
6. 日期类型的字段请尽量统一格式为YYYY-MM或YYYY-MM-DD
7. 不要返回任何其他说明文字,只返回JSON数组`;
  }

  /**
   * 从图片创建维度模板
   */
  async createFromImage(userId: string, accountId: string, imageBase64: string, name: string) {
    // 验证公众号权限
    await this.accountsService.findOne(accountId, userId);

    // 调用Claude识别图片中的字段
    const fields = await this.claudeService.extractFieldsFromImage(imageBase64);

    if (!fields || fields.length === 0) {
      throw new BadRequestException('无法从图片中识别出字段信息');
    }

    return this.create(userId, {
      accountId,
      name,
      fields,
    });
  }

  /**
   * 获取维度模板列表
   */
  async findAll(userId: string, accountId: string) {
    // 验证公众号权限
    await this.accountsService.findOne(accountId, userId);

    return this.prisma.dimensionTemplate.findMany({
      where: { accountId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            extractionResults: true,
          },
        },
      },
    });
  }

  /**
   * 获取维度模板详情
   */
  async findOne(id: string, userId: string) {
    const template = await this.prisma.dimensionTemplate.findUnique({
      where: { id },
      include: {
        account: true,
        _count: {
          select: {
            extractionResults: true,
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('维度模板不存在');
    }

    // 验证权限
    await this.accountsService.findOne(template.accountId, userId);

    return template;
  }

  /**
   * 更新维度模板
   */
  async update(id: string, userId: string, updateDimensionDto: UpdateDimensionDto) {
    const template = await this.findOne(id, userId);

    // 如果已锁定,不允许修改fields
    if (template.isLocked && updateDimensionDto.hasOwnProperty('fields')) {
      throw new BadRequestException('维度模板已锁定,无法修改字段定义');
    }

    // 处理fields序列化
    const data: any = { ...updateDimensionDto };
    if (data.fields) {
      data.fields = data.fields as any; // Prisma会自动处理JSON类型
    }

    // 移除不能修改的字段
    delete data.accountId;
    delete data.aiFieldDescription; // 这个字段不存在于数据库中

    return this.prisma.dimensionTemplate.update({
      where: { id },
      data,
    });
  }

  /**
   * 锁定维度模板
   */
  async lock(id: string, userId: string) {
    const template = await this.findOne(id, userId);

    if (template.isLocked) {
      throw new BadRequestException('维度模板已经是锁定状态');
    }

    return this.prisma.dimensionTemplate.update({
      where: { id },
      data: { isLocked: true },
    });
  }

  /**
   * 解锁维度模板
   */
  async unlock(id: string, userId: string) {
    const template = await this.findOne(id, userId);

    if (!template.isLocked) {
      throw new BadRequestException('维度模板已经是解锁状态');
    }

    return this.prisma.dimensionTemplate.update({
      where: { id },
      data: { isLocked: false },
    });
  }

  /**
   * 添加字段到已锁定的模板
   */
  async addFields(id: string, userId: string, newFields: ExtractionField[]) {
    const template = await this.findOne(id, userId);

    if (!template.isLocked) {
      throw new BadRequestException('只能向已锁定的模板添加新字段');
    }

    const existingFields = template.fields as unknown as ExtractionField[];
    const updatedFields = [...existingFields, ...newFields];

    return this.prisma.dimensionTemplate.update({
      where: { id },
      data: { fields: updatedFields as any },
    });
  }

  /**
   * AI智能生成字段 - 根据描述和现有字段上下文生成新字段
   */
  async aiGenerateField(id: string, userId: string, description: string) {
    const template = await this.findOne(id, userId);
    const existingFields = template.fields as unknown as ExtractionField[];

    // 构建提示词,包含现有字段作为上下文
    const existingFieldsContext = existingFields.map((f) =>
      `- ${f.label} (${f.name}): ${f.type} - ${f.description}${f.example ? ` 例: ${f.example}` : ''}`
    ).join('\n');

    const prompt = `你是一个数据字段设计专家。

维度名称: ${template.name}
维度描述: ${template.description || '无'}

现有字段:
${existingFieldsContext || '(暂无字段)'}

用户需求: ${description}

请根据用户需求,设计一个新的数据字段。返回JSON格式,包含以下属性:
- name: 字段名(英文,小写,下划线命名,不能与现有字段重复)
- label: 显示名称(中文)
- type: 数据类型(text/number/date)
- description: 字段描述(说明这个字段用于记录什么信息)
- required: 是否必填(boolean)
- example: 示例值(可选,提供一个真实的示例)

要求:
1. 字段命名要规范,使用小写字母和下划线
2. 字段类型要合适(text用于文本,number用于数字,date用于日期)
3. 描述要清晰,说明这个字段的用途
4. 示例值要真实、有代表性
5. 只返回JSON,不要其他说明文字`;

    try {
      // 调用Claude生成字段
      const response = await this.claudeService.client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        // 解析JSON
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('AI返回格式错误');
        }

        const newField: ExtractionField = JSON.parse(jsonMatch[0]);

        // 验证字段名是否重复
        if (existingFields.some(f => f.name === newField.name)) {
          throw new BadRequestException(`字段名 ${newField.name} 已存在,请修改需求重试`);
        }

        return {
          field: newField,
          message: 'AI生成成功',
        };
      }

      throw new Error('AI响应格式错误');
    } catch (error) {
      throw new BadRequestException(`AI生成失败: ${error.message}`);
    }
  }

  /**
   * 删除维度模板(软删除)
   */
  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    return this.prisma.dimensionTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * 调整排序
   */
  async reorder(userId: string, accountId: string, templateIds: string[]) {
    // 验证权限
    await this.accountsService.findOne(accountId, userId);

    // 批量更新sortOrder
    const updates = templateIds.map((id, index) =>
      this.prisma.dimensionTemplate.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );

    await Promise.all(updates);

    return { success: true };
  }
}
