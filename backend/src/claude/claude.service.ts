import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export interface ExtractionField {
  name: string;
  label: string;
  type: string;
  description: string;
  required: boolean;
  example?: string;
}

export interface ExtractionRequest {
  content: string;
  fields: ExtractionField[];
  modelPreference?: 'haiku' | 'sonnet';
  customPrompt?: string;
}

export interface ExtractionResponse {
  data: Record<string, any>[];  // 改为数组,支持一篇文章提取多条记录
  modelUsed: string;
  tokensUsed: number;
  extractionTime: number;
}

@Injectable()
export class ClaudeService {
  public client: Anthropic; // 改为public,允许其他服务访问
  private readonly models = {
    haiku: 'claude-haiku-4-5-20251001',
    sonnet: 'claude-sonnet-4-5-20250929',
  };

  constructor(private configService: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.configService.get('ANTHROPIC_AUTH_TOKEN'),
      baseURL: this.configService.get('ANTHROPIC_BASE_URL'),
    });
  }

  /**
   * 从文章内容中提取结构化数据
   */
  async extractData(request: ExtractionRequest): Promise<ExtractionResponse> {
    const startTime = Date.now();
    const modelId = this.models[request.modelPreference || 'haiku'];

    // 构建提取提示词
    const prompt = this.buildExtractionPrompt(request);

    try {
      const response = await this.client.messages.create({
        model: modelId,
        max_tokens: 4096,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const extractionTime = Date.now() - startTime;
      const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

      // 解析响应内容
      const content = response.content[0];
      let extractedData: any[] = [];

      if (content.type === 'text') {
        const parsed = this.parseJsonResponse(content.text);
        // 确保返回的是数组
        if (Array.isArray(parsed)) {
          extractedData = parsed;
        } else if (parsed && typeof parsed === 'object') {
          // 如果返回的是对象,包装成数组
          extractedData = [parsed];
        }
      }

      return {
        data: extractedData,
        modelUsed: modelId,
        tokensUsed,
        extractionTime,
      };
    } catch (error) {
      throw new Error(`Claude API调用失败: ${error.message}`);
    }
  }

  /**
   * 从图片识别维度字段
   */
  async extractFieldsFromImage(imageBase64: string): Promise<ExtractionField[]> {
    const modelId = this.models.sonnet; // 使用Sonnet处理图片

    const prompt = `请分析这张表格图片,识别出表格的列头信息。

返回JSON格式的字段定义数组,每个字段包含:
- name: 字段名(英文,小写,下划线命名)
- label: 显示名称(中文,与表头一致)
- type: 数据类型(text/number/date)
- description: 字段描述
- required: 是否必填(boolean)
- example: 示例值(如果图片中有数据)

只返回JSON数组,不要其他说明文字。`;

    try {
      const response = await this.client.messages.create({
        model: modelId,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return this.parseJsonResponse(content.text);
      }

      return [];
    } catch (error) {
      throw new Error(`图片识别失败: ${error.message}`);
    }
  }

  /**
   * 构建提取提示词
   */
  private buildExtractionPrompt(request: ExtractionRequest): string {
    const fieldsDesc = request.fields
      .map((field) => {
        const requiredText = field.required ? '(必填)' : '(可选)';
        const exampleText = field.example ? `\n  示例: ${field.example}` : '';
        return `- ${field.label} (${field.name}) ${requiredText}
  类型: ${field.type}
  说明: ${field.description}${exampleText}`;
      })
      .join('\n\n');

    const defaultPrompt = `请从以下文章内容中提取指定的字段信息。

需要提取的字段:
${fieldsDesc}

文章内容:
${request.content}

请仔细阅读文章内容,提取上述字段的值。如果某个字段在文章中找不到对应信息,请填写null。

返回格式要求:
1. 必须返回JSON数组格式,即使只有一条数据也要放在数组中
2. 如果文章中有多条符合条件的数据,请全部提取并放入数组
3. 每个数组元素是一个对象,包含所有字段
4. JSON的key必须使用字段的name属性(英文名)
5. 数值类型的字段请返回数字,不要包含单位和逗号
6. 日期类型的字段请尽量统一格式为YYYY-MM或YYYY-MM-DD
7. 不要返回任何其他说明文字,只返回JSON数组

示例返回格式(单条数据):
[
  {
    "field_name1": "value1",
    "field_name2": 123456,
    "field_name3": "2025-10"
  }
]

示例返回格式(多条数据):
[
  {
    "field_name1": "value1",
    "field_name2": 123456,
    "field_name3": "2025-10"
  },
  {
    "field_name1": "value2",
    "field_name2": 234567,
    "field_name3": "2025-11"
  }
]`;

    // 如果有自定义提示词,需要将占位符替换为实际内容
    if (request.customPrompt) {
      let customPrompt = request.customPrompt;

      // 替换 {fields} 占位符
      customPrompt = customPrompt.replace('{fields}', fieldsDesc);

      // 如果提示词中已有 {content} 占位符,直接替换
      if (customPrompt.includes('{content}')) {
        customPrompt = customPrompt.replace('{content}', request.content);
      } else {
        // 否则,在提示词末尾追加文章内容
        customPrompt += `\n\n文章内容:\n${request.content}`;
      }

      return customPrompt;
    }

    return defaultPrompt;
  }

  /**
   * 解析JSON响应
   */
  private parseJsonResponse(text: string): any {
    try {
      // 尝试提取JSON部分
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`JSON解析失败: ${text}`);
    }
  }
}
