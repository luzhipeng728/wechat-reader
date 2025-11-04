'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  Tag,
  Popconfirm,
} from 'antd';
import { PlusOutlined, DeleteOutlined, ThunderboltOutlined, FileTextOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/Layout';
import { articlesAPI, accountsAPI, extractionsAPI } from '@/lib/api';

interface Article {
  id: string;
  accountId: string;
  url: string;
  title: string;
  content: string;
  status: string;
  createdAt: string;
  account?: {
    id: string;
    name: string;
  };
  _count?: {
    extractionResults: number;
  };
}

interface Account {
  id: string;
  name: string;
}

export default function ArticlesPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [form] = Form.useForm();
  const [batchForm] = Form.useForm();

  const loadArticles = async (accountId?: string, page = 1, size = 50) => {
    setLoading(true);
    try {
      const data = await articlesAPI.list({ accountId, page, pageSize: size });
      // 后端返回 { items, total, page, pageSize }
      setArticles(data.items || []);
      setTotal(data.total || 0);
      setCurrentPage(data.page || 1);
      setPageSize(data.pageSize || 50);
    } catch (error: any) {
      message.error('获取文章列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 自动刷新 - 每3秒检查是否有处理中的文章
  useEffect(() => {
    const hasProcessing = articles.some(
      (article) => ['pending', 'downloading', 'extracting'].includes(article.status)
    );

    if (!hasProcessing) return;

    const timer = setInterval(() => {
      loadArticles(selectedAccountId, currentPage, pageSize);
    }, 3000); // 每3秒刷新一次

    return () => clearInterval(timer);
  }, [articles, selectedAccountId, currentPage, pageSize]);

  const loadAccounts = async () => {
    try {
      const data = await accountsAPI.list();
      setAccounts(data);
    } catch (error: any) {
      message.error('获取公众号列表失败');
    }
  };

  useEffect(() => {
    loadArticles();
    loadAccounts();
  }, []);

  const handleCreate = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleBatchCreate = () => {
    batchForm.resetFields();
    setBatchModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await articlesAPI.delete(id);
      message.success('删除成功');
      loadArticles(selectedAccountId, currentPage, pageSize);
    } catch (error: any) {
      message.error('删除失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的文章');
      return;
    }

    try {
      await articlesAPI.batchDelete(selectedRowKeys);
      message.success(`成功删除 ${selectedRowKeys.length} 篇文章`);
      setSelectedRowKeys([]);
      loadArticles(selectedAccountId, currentPage, pageSize);
    } catch (error: any) {
      message.error('批量删除失败');
    }
  };

  const handleExtractAll = async (articleId: string) => {
    try {
      await extractionsAPI.extractAll(articleId);
      message.success('提取任务已提交,请稍后查看结果');
      // 立即刷新文章列表,显示提取中状态
      loadArticles(selectedAccountId, currentPage, pageSize);
    } catch (error: any) {
      message.error('提取失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await articlesAPI.create(values);
      message.success('文章添加成功,正在后台提取内容...');
      setModalVisible(false);
      loadArticles(selectedAccountId, 1, pageSize); // 回到第一页
    } catch (error: any) {
      message.error('添加失败');
    }
  };

  const handleBatchSubmit = async () => {
    try {
      const values = await batchForm.validateFields();
      const urls = values.urls
        .split('\n')
        .map((url: string) => url.trim())
        .filter((url: string) => url);

      const result = await articlesAPI.createBatch({
        accountId: values.accountId,
        urls,
      });

      // 显示详细的添加结果
      if (result.failed > 0) {
        message.warning(
          `成功添加 ${result.success} 篇,跳过 ${result.failed} 篇重复文章`
        );
      } else {
        message.success(
          `成功添加 ${result.success} 篇文章,正在后台提取内容...`
        );
      }

      setBatchModalVisible(false);
      loadArticles(selectedAccountId, 1, pageSize); // 回到第一页
    } catch (error: any) {
      message.error('批量添加失败');
    }
  };

  const handleAccountChange = (accountId: string) => {
    setSelectedAccountId(accountId);
    setCurrentPage(1); // 重置到第一页
    loadArticles(accountId || undefined, 1, pageSize);
  };

  const handlePageChange = (page: number, size?: number) => {
    const newSize = size || pageSize;
    setCurrentPage(page);
    setPageSize(newSize);
    loadArticles(selectedAccountId, page, newSize);
  };

  const getStatusTag = (status: string, extractionCount?: number) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'default', text: '排队等待' },
      downloading: { color: 'processing', text: '下载文章中' },
      extracting: { color: 'blue', text: '提取数据中' },
      completed: { color: 'success', text: '提取完成' },
      error: { color: 'error', text: '失败' },
    };
    const config = statusMap[status] || { color: 'default', text: status };

    // 如果是completed状态,显示提取的记录数
    if (status === 'completed' && extractionCount !== undefined && extractionCount > 0) {
      return <Tag color={config.color}>{config.text} ({extractionCount}条)</Tag>;
    }

    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: '#',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      render: (id: string) => {
        // 显示ID的前8位
        return <span className="font-mono text-xs text-gray-500">{id.substring(0, 8)}</span>;
      },
    },
    {
      title: '公众号',
      dataIndex: ['account', 'name'],
      key: 'account',
      width: 120,
    },
    {
      title: '文章标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text: string, record: Article) => (
        <div className="flex items-center gap-2">
          <a
            href={record.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800"
            title={text}
          >
            {text}
          </a>
          {record.status === 'completed' && (
            <Button
              type="text"
              size="small"
              icon={<FileTextOutlined />}
              onClick={() => router.push(`/articles/${record.id}/content`)}
              title="查看内容"
            />
          )}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string, record: Article) => getStatusTag(status, record._count?.extractionResults),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right' as const,
      render: (_: any, record: Article) => (
        <Popconfirm
          title="确定要删除这篇文章吗?"
          onConfirm={() => handleDelete(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            title="删除"
          />
        </Popconfirm>
      ),
    },
  ];

  return (
    <AppLayout>
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold m-0">文章管理</h2>
            <Select
              placeholder="筛选公众号"
              allowClear
              style={{ width: 200 }}
              value={selectedAccountId || undefined}
              onChange={handleAccountChange}
              options={accounts.map((acc) => ({
                label: acc.name,
                value: acc.id,
              }))}
            />
          </div>
          <Space>
            <Button icon={<PlusOutlined />} onClick={handleCreate}>
              添加文章
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleBatchCreate}>
              批量添加
            </Button>
          </Space>
        </div>

        {selectedRowKeys.length > 0 && (
          <div className="mb-4 p-2 bg-blue-50 rounded flex items-center justify-between">
            <span>已选择 {selectedRowKeys.length} 篇文章</span>
            <Space>
              <Button size="small" onClick={() => setSelectedRowKeys([])}>
                取消选择
              </Button>
              <Popconfirm
                title={`确定要删除选中的 ${selectedRowKeys.length} 篇文章吗?`}
                onConfirm={handleBatchDelete}
                okText="确定"
                cancelText="取消"
              >
                <Button size="small" danger icon={<DeleteOutlined />}>
                  批量删除
                </Button>
              </Popconfirm>
            </Space>
          </div>
        )}

        <Table
          columns={columns}
          dataSource={articles}
          loading={loading}
          rowKey="id"
          rowSelection={{
            selectedRowKeys,
            onChange: (selectedKeys: React.Key[]) => {
              setSelectedRowKeys(selectedKeys as string[]);
            },
          }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100', '200'],
            showTotal: (total) => `共 ${total} 篇文章`,
            onChange: handlePageChange,
          }}
        />

        <Modal
          title="添加文章"
          open={modalVisible}
          onOk={handleSubmit}
          onCancel={() => setModalVisible(false)}
          okText="确定"
          cancelText="取消"
        >
          <Form form={form} layout="vertical">
            <Form.Item
              name="accountId"
              label="公众号"
              rules={[{ required: true, message: '请选择公众号' }]}
            >
              <Select
                placeholder="选择公众号"
                options={accounts.map((acc) => ({
                  label: acc.name,
                  value: acc.id,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="url"
              label="文章URL"
              rules={[
                { required: true, message: '请输入文章URL' },
                { type: 'url', message: '请输入有效的URL' },
              ]}
            >
              <Input placeholder="https://mp.weixin.qq.com/s/..." />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="批量添加文章"
          open={batchModalVisible}
          onOk={handleBatchSubmit}
          onCancel={() => setBatchModalVisible(false)}
          okText="确定"
          cancelText="取消"
          width={600}
        >
          <Form form={batchForm} layout="vertical">
            <Form.Item
              name="accountId"
              label="公众号"
              rules={[{ required: true, message: '请选择公众号' }]}
            >
              <Select
                placeholder="选择公众号"
                options={accounts.map((acc) => ({
                  label: acc.name,
                  value: acc.id,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="urls"
              label="文章URL列表"
              rules={[{ required: true, message: '请输入文章URL' }]}
              extra="每行一个URL"
            >
              <Input.TextArea
                placeholder="https://mp.weixin.qq.com/s/...&#10;https://mp.weixin.qq.com/s/..."
                rows={10}
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AppLayout>
  );
}
