'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  Select,
  message,
  Space,
  Tag,
  Button,
  Popconfirm,
  Card,
  Statistic,
} from 'antd';
import {
  DownloadOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import AppLayout from '@/components/Layout';
import { extractionsAPI, dimensionsAPI, accountsAPI } from '@/lib/api';

interface Extraction {
  id: string;
  articleId: string;
  templateId: string;
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
  template?: {
    id: string;
    name: string;
    fields: any[];
  };
}

interface Dimension {
  id: string;
  name: string;
  accountId: string;
}

interface Account {
  id: string;
  name: string;
}

export default function ExtractionsPage() {
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    totalTokens: 0,
  });

  const loadExtractions = async (templateId: string) => {
    if (!templateId) {
      setExtractions([]);
      return;
    }
    setLoading(true);
    try {
      const data = await extractionsAPI.getByTemplate(templateId);
      // 后端返回 { items, total, page, pageSize }
      const items = data.items || [];
      setExtractions(items);

      // 计算统计数据
      const completed = items.filter((e: Extraction) => e.status === 'completed').length;
      const failed = items.filter((e: Extraction) => e.status === 'failed').length;
      const totalTokens = items.reduce(
        (sum: number, e: Extraction) => sum + (e.tokensUsed || 0),
        0
      );

      setStats({
        total: items.length,
        completed,
        failed,
        totalTokens,
      });
    } catch (error: any) {
      message.error('获取提取结果失败');
    } finally {
      setLoading(false);
    }
  };

  const loadDimensions = async (accountId: string) => {
    if (!accountId) {
      setDimensions([]);
      setSelectedTemplateId('');
      return;
    }
    try {
      const data = await dimensionsAPI.list(accountId);
      setDimensions(data);
      if (data.length > 0) {
        setSelectedTemplateId(data[0].id);
        loadExtractions(data[0].id);
      } else {
        setSelectedTemplateId('');
        setExtractions([]);
      }
    } catch (error: any) {
      message.error('获取维度列表失败');
    }
  };

  const loadAccounts = async () => {
    try {
      const data = await accountsAPI.list();
      setAccounts(data);
      if (data.length > 0) {
        setSelectedAccountId(data[0].id);
        loadDimensions(data[0].id);
      }
    } catch (error: any) {
      message.error('获取公众号列表失败');
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  // 自动刷新 - 每5秒检查是否有提取中的任务
  useEffect(() => {
    const hasExtracting = extractions.some(
      (extraction) => extraction.status === 'extracting'
    );

    if (!hasExtracting || !selectedTemplateId) return;

    const timer = setInterval(() => {
      loadExtractions(selectedTemplateId);
    }, 5000); // 每5秒刷新一次

    return () => clearInterval(timer);
  }, [extractions, selectedTemplateId]);

  const handleAccountChange = (accountId: string) => {
    setSelectedAccountId(accountId);
    loadDimensions(accountId);
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    loadExtractions(templateId);
  };

  const handleExport = async () => {
    if (!selectedTemplateId) {
      message.warning('请先选择维度');
      return;
    }
    try {
      const data = await extractionsAPI.export(selectedTemplateId);

      // 转换为CSV并下载
      const dimension = dimensions.find((d) => d.id === selectedTemplateId);
      const filename = `${dimension?.name || '提取结果'}_${new Date().toLocaleDateString()}.json`;

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      message.success('导出成功');
    } catch (error: any) {
      message.error('导出失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await extractionsAPI.delete(id);
      message.success('删除成功');
      loadExtractions(selectedTemplateId);
    } catch (error: any) {
      message.error('删除失败');
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<
      string,
      { icon: any; color: string; text: string }
    > = {
      completed: {
        icon: <CheckCircleOutlined />,
        color: 'success',
        text: '成功',
      },
      failed: { icon: <CloseCircleOutlined />, color: 'error', text: '失败' },
      extracting: {
        icon: <ClockCircleOutlined />,
        color: 'processing',
        text: '提取中',
      },
    };
    const config = statusMap[status] || {
      icon: null,
      color: 'default',
      text: status,
    };
    return (
      <Tag icon={config.icon} color={config.color}>
        {config.text}
      </Tag>
    );
  };

  const columns = [
    {
      title: '文章标题',
      dataIndex: ['article', 'title'],
      key: 'title',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '使用模型',
      dataIndex: 'modelUsed',
      key: 'modelUsed',
      render: (model: string) => {
        const modelName = model?.includes('haiku') ? 'Haiku' : 'Sonnet';
        const color = model?.includes('haiku') ? 'blue' : 'purple';
        return <Tag color={color}>{modelName}</Tag>;
      },
    },
    {
      title: 'Token消耗',
      dataIndex: 'tokensUsed',
      key: 'tokensUsed',
      render: (tokens: number) => tokens?.toLocaleString() || '-',
    },
    {
      title: '耗时(ms)',
      dataIndex: 'extractionTime',
      key: 'extractionTime',
      render: (time: number) => time?.toLocaleString() || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Extraction) => (
        <Space>
          <Popconfirm
            title="确定要删除这条提取结果吗?"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const expandedRowRender = (record: Extraction) => {
    if (!record.extractedData || !record.template?.fields) {
      return <div>无数据</div>;
    }

    return (
      <Card size="small" className="bg-gray-50">
        <div className="grid grid-cols-2 gap-4">
          {record.template.fields.map((field: any) => (
            <div key={field.name}>
              <div className="text-gray-500 text-sm mb-1">{field.label}</div>
              <div className="font-medium">
                {record.extractedData[field.name] || '-'}
              </div>
            </div>
          ))}
        </div>
        {record.article?.url && (
          <div className="mt-4 pt-4 border-t">
            <a
              href={record.article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600"
            >
              查看原文 →
            </a>
          </div>
        )}
      </Card>
    );
  };

  return (
    <AppLayout>
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold m-0">提取结果</h2>
            <Select
              placeholder="选择公众号"
              style={{ width: 200 }}
              value={selectedAccountId || undefined}
              onChange={handleAccountChange}
              options={accounts.map((acc) => ({
                label: acc.name,
                value: acc.id,
              }))}
            />
            <Select
              placeholder="选择维度"
              style={{ width: 200 }}
              value={selectedTemplateId || undefined}
              onChange={handleTemplateChange}
              options={dimensions.map((dim) => ({
                label: dim.name,
                value: dim.id,
              }))}
            />
          </div>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={!selectedTemplateId || extractions.length === 0}
          >
            导出数据
          </Button>
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

        <Table
          columns={columns}
          dataSource={extractions}
          loading={loading}
          rowKey="id"
          expandable={{ expandedRowRender }}
          pagination={{ pageSize: 10 }}
        />
      </div>
    </AppLayout>
  );
}
