'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Select,
  message,
  Card,
  Statistic,
  Tag,
  Space,
  Tooltip,
  Input,
} from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, ReloadOutlined, LinkOutlined, SearchOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import AppLayout from '@/components/Layout';
import { extractionsAPI, dimensionsAPI } from '@/lib/api';

interface Extraction {
  id: string;
  articleId: string;
  extractedData: Record<string, any>;
  status: string;
  modelUsed: string;
  tokensUsed: number;
  extractionTime: number;
  createdAt: string;
  article?: {
    id: string;
    title: string;
    url: string;
  };
}

interface Dimension {
  id: string;
  name: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    description: string;
  }>;
}

export default function DimensionDataPage() {
  const params = useParams();
  const router = useRouter();
  const dimensionId = params.id as string;

  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [dimension, setDimension] = useState<Dimension | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    totalTokens: 0,
  });

  const loadDimension = async () => {
    try {
      const data = await dimensionsAPI.get(dimensionId);
      setDimension(data);
    } catch (error: any) {
      message.error('获取维度信息失败');
    }
  };

  const loadExtractions = async (page = 1, size = 50, keyword = '') => {
    setLoading(true);
    try {
      const data = await extractionsAPI.getByTemplate(dimensionId, {
        page,
        pageSize: size,
        keyword: keyword || undefined,
      });
      const items = data.items || [];
      setExtractions(items);
      setTotal(data.total || 0);
      setCurrentPage(data.page || 1);
      setPageSize(data.pageSize || 50);

      // 使用后端返回的统计数据
      if (data.stats) {
        setStats(data.stats);
      } else {
        // 兼容旧版本,如果没有stats就用本地计算
        const completed = items.filter((e: Extraction) => e.status === 'completed').length;
        const failed = items.filter((e: Extraction) => e.status === 'failed').length;
        const totalTokens = items.reduce(
          (sum: number, e: Extraction) => sum + (e.tokensUsed || 0),
          0
        );

        setStats({
          total: data.total || 0,
          completed,
          failed,
          totalTokens,
        });
      }
    } catch (error: any) {
      message.error('获取提取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDimension();
    loadExtractions();
  }, [dimensionId]);

  // 自动刷新
  useEffect(() => {
    const hasExtracting = extractions.some(
      (extraction) => extraction.status === 'extracting'
    );

    if (!hasExtracting) return;

    const timer = setInterval(() => {
      loadExtractions(currentPage, pageSize, searchKeyword);
    }, 5000);

    return () => clearInterval(timer);
  }, [extractions, dimensionId, currentPage, pageSize, searchKeyword]);

  // 搜索输入处理 - 输入时触发搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1); // 搜索时重置到第一页
      loadExtractions(1, pageSize, searchKeyword);
    }, 500); // 延迟500ms,避免频繁请求

    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const handlePageChange = (page: number, size?: number) => {
    loadExtractions(page, size || pageSize, searchKeyword);
  };

  const handleSearch = (value: string) => {
    setSearchKeyword(value);
  };

  const handleExport = async () => {
    try {
      const data = await extractionsAPI.export(dimensionId);

      // 转换为CSV
      if (dimension && data.length > 0) {
        const headers = ['文章标题', '文章URL', ...dimension.fields.map(f => f.label)];
        const rows = data.map((item: any) => {
          const row = [
            item.article?.title || '',
            item.article?.url || '',
          ];
          dimension.fields.forEach(field => {
            row.push(item.extractedData?.[field.name] || '');
          });
          return row;
        });

        const csvContent = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${dimension.name}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        message.success('导出成功');
      }
    } catch (error: any) {
      message.error('导出失败');
    }
  };

  // 动态生成表格列
  const columns = [
    ...(dimension?.fields.map((field) => ({
      title: field.label,
      dataIndex: ['extractedData', field.name],
      key: field.name,
      width: 200,
      ellipsis: false,
      render: (text: any) => {
        const displayText = text || '-';
        return (
          <Tooltip title={displayText} placement="topLeft">
            <div
              style={{
                wordBreak: 'break-word',
                whiteSpace: 'normal',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                lineHeight: '1.5em',
                maxHeight: '4.5em',
                cursor: 'help',
              }}
            >
              {displayText}
            </div>
          </Tooltip>
        );
      },
    })) || []),
    {
      title: '链接',
      dataIndex: ['article', 'url'],
      key: 'url',
      width: 100,
      fixed: 'right' as const,
      align: 'center' as const,
      render: (url: string, record: Extraction) => (
        <Tooltip title={record.article?.title || '查看原文'} placement="left">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600"
          >
            <Button type="link" icon={<LinkOutlined />} size="small">
              查看
            </Button>
          </a>
        </Tooltip>
      ),
    },
  ];

  return (
    <AppLayout>
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push('/dimensions')}
            >
              返回
            </Button>
            <h2 className="text-xl font-semibold m-0">
              {dimension?.name || '维度数据'}
            </h2>
          </div>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadExtractions}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExport}
              disabled={extractions.length === 0}
            >
              导出CSV
            </Button>
          </Space>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-4">
          <Card>
            <Statistic title="总提取数" value={stats.total} />
          </Card>
          <Card>
            <Statistic
              title="成功"
              value={stats.completed}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
          <Card>
            <Statistic
              title="失败"
              value={stats.failed}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
          <Card>
            <Statistic
              title="总Token消耗"
              value={stats.totalTokens}
              suffix="tokens"
            />
          </Card>
        </div>

        <div className="mb-4">
          <Input
            placeholder="搜索内容...输入时自动搜索"
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
            style={{ width: 400 }}
          />
          {searchKeyword && (
            <span className="ml-2 text-gray-500">
              找到 {total} 条匹配结果
            </span>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={extractions.filter(e => e.status === 'completed')}
          loading={loading}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100', '200'],
            showTotal: (total) => `共 ${total} 条提取数据`,
            onChange: handlePageChange,
          }}
        />
      </div>
    </AppLayout>
  );
}
