import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface SpiderArticleData {
  title: string;
  news_url: string;
  news_id: string;
  meta_info: {
    author_name: string;
    author_url: string;
    publish_time: string;
    extra: Record<string, any>;
  };
  contents: Array<{
    type: string;
    content: string;
    desc: string;
  }>;
  texts: string[];
  images: string[];
  videos: string[];
}

export interface SpiderResponse {
  status: string;
  data: SpiderArticleData;
  markdown: string;
  platform: string;
  extracted_at: string;
  error: string | null;
}

@Injectable()
export class SpiderService {
  private readonly spiderApiUrl: string;

  constructor(private configService: ConfigService) {
    this.spiderApiUrl = this.configService.get('SPIDER_API_URL');
  }

  /**
   * 提取微信公众号文章内容(带重试机制)
   */
  async extractArticle(url: string, retries = 2): Promise<SpiderResponse> {
    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`[爬虫API] 尝试提取文章 (第${attempt + 1}/${retries + 1}次): ${url}`);

        const response = await axios.post(
          `${this.spiderApiUrl}/api/extract`,
          {
            url,
            output_format: 'markdown',
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 60000, // 增加到60秒超时
          },
        );

        if (response.data.status !== 'success') {
          throw new Error(response.data.error || '文章提取失败');
        }

        console.log(`[爬虫API] 提取成功: ${url}`);
        return response.data;
      } catch (error) {
        lastError = error;
        console.error(`[爬虫API] 第${attempt + 1}次尝试失败:`, error.message);

        // 如果不是最后一次尝试,等待后重试
        if (attempt < retries) {
          const waitTime = (attempt + 1) * 2000; // 2秒, 4秒
          console.log(`[爬虫API] 等待${waitTime}ms后重试...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    // 所有重试都失败
    if (axios.isAxiosError(lastError)) {
      throw new Error(`爬虫API调用失败: ${lastError.message}`);
    }
    throw lastError;
  }

  /**
   * 批量提取文章
   */
  async extractArticles(urls: string[]): Promise<SpiderResponse[]> {
    const promises = urls.map((url) => this.extractArticle(url));
    return Promise.all(promises);
  }
}
