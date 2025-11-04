'use client';

import { useState, useEffect } from 'react';
import { Button, Spin, message, Card, Typography, Tag } from 'antd';
import { ArrowLeftOutlined, LinkOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import AppLayout from '@/components/Layout';
import { articlesAPI } from '@/lib/api';

const { Title, Text } = Typography;

interface ArticleContent {
  id: string;
  title: string;
  url: string;
  newsId: string;
  authorName?: string;
  publishTime?: string;
  markdownContent: string;
}

export default function ArticleContentPage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;

  const [article, setArticle] = useState<ArticleContent | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadArticleContent();
  }, [articleId]);

  const loadArticleContent = async () => {
    setLoading(true);
    try {
      const data = await articlesAPI.getContent(articleId);
      setArticle(data);
    } catch (error: any) {
      message.error(error.response?.data?.message || '获取文章内容失败');
      router.push('/articles');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center min-h-screen">
          <Spin size="large" />
        </div>
      </AppLayout>
    );
  }

  if (!article) {
    return null;
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/articles')}
          >
            返回文章列表
          </Button>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600"
          >
            <Button icon={<LinkOutlined />}>查看原文</Button>
          </a>
        </div>

        <Card>
          <div className="mb-6">
            <Title level={2}>{article.title}</Title>
            <div className="flex gap-4 items-center text-gray-500 mb-2">
              {article.authorName && (
                <Text type="secondary">作者: {article.authorName}</Text>
              )}
              {article.publishTime && (
                <Text type="secondary">
                  发布时间: {new Date(article.publishTime).toLocaleString('zh-CN')}
                </Text>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <Tag color="blue">文章ID: {article.newsId}</Tag>
            </div>
          </div>

          <div className="markdown-content prose max-w-none">
            <ReactMarkdown>{article.markdownContent}</ReactMarkdown>
          </div>
        </Card>
      </div>

      <style jsx global>{`
        .markdown-content {
          font-size: 16px;
          line-height: 1.8;
        }
        .markdown-content h1 {
          font-size: 2em;
          font-weight: bold;
          margin-top: 1em;
          margin-bottom: 0.5em;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 0.3em;
        }
        .markdown-content h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin-top: 1em;
          margin-bottom: 0.5em;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 0.3em;
        }
        .markdown-content h3 {
          font-size: 1.25em;
          font-weight: bold;
          margin-top: 0.8em;
          margin-bottom: 0.4em;
        }
        .markdown-content p {
          margin-bottom: 1em;
        }
        .markdown-content ul, .markdown-content ol {
          margin-left: 2em;
          margin-bottom: 1em;
        }
        .markdown-content li {
          margin-bottom: 0.5em;
        }
        .markdown-content a {
          color: #1890ff;
          text-decoration: none;
        }
        .markdown-content a:hover {
          text-decoration: underline;
        }
        .markdown-content blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1em;
          margin-left: 0;
          color: #6b7280;
          font-style: italic;
        }
        .markdown-content code {
          background-color: #f3f4f6;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
        }
        .markdown-content pre {
          background-color: #f3f4f6;
          padding: 1em;
          border-radius: 5px;
          overflow-x: auto;
          margin-bottom: 1em;
        }
        .markdown-content pre code {
          background-color: transparent;
          padding: 0;
        }
        .markdown-content img {
          max-width: 100%;
          height: auto;
          margin: 1em 0;
        }
        .markdown-content table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 1em;
        }
        .markdown-content th, .markdown-content td {
          border: 1px solid #e5e7eb;
          padding: 0.5em 1em;
        }
        .markdown-content th {
          background-color: #f3f4f6;
          font-weight: bold;
        }
      `}</style>
    </AppLayout>
  );
}
