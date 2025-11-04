'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Popconfirm, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/Layout';
import { accountsAPI } from '@/lib/api';

interface Account {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [form] = Form.useForm();
  const router = useRouter();

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await accountsAPI.list();
      setAccounts(data);
    } catch (error: any) {
      message.error('获取公众号列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleCreate = () => {
    setEditingAccount(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Account) => {
    setEditingAccount(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await accountsAPI.delete(id);
      message.success('删除成功');
      loadAccounts();
    } catch (error: any) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingAccount) {
        await accountsAPI.update(editingAccount.id, values);
        message.success('更新成功');
      } else {
        await accountsAPI.create(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadAccounts();
    } catch (error: any) {
      message.error(editingAccount ? '更新失败' : '创建失败');
    }
  };

  const columns = [
    {
      title: '公众号名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
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
      render: (_: any, record: Account) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个公众号吗?"
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

  return (
    <AppLayout>
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold m-0">公众号管理</h2>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            添加公众号
          </Button>
        </div>

        {accounts.length > 0 && (
          <Alert
            message="接下来的步骤"
            description={
              <div>
                <p>公众号创建成功后,请按以下步骤操作:</p>
                <ol className="ml-4 mt-2">
                  <li>1. 前往"维度管理"页面创建提取维度模板</li>
                  <li>2. 配置好字段后,点击"锁定"按钮锁定维度</li>
                  <li>3. 在"文章管理"页面添加文章URL</li>
                  <li>4. 等待文章提取完成后,点击"提取"按钮提取数据</li>
                </ol>
                <Button
                  type="link"
                  icon={<InfoCircleOutlined />}
                  onClick={() => router.push('/dimensions')}
                  className="mt-2 p-0"
                >
                  立即前往维度管理
                </Button>
              </div>
            }
            type="info"
            showIcon
            closable
            className="mb-4"
          />
        )}

        <Table
          columns={columns}
          dataSource={accounts}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />

        <Modal
          title={editingAccount ? '编辑公众号' : '添加公众号'}
          open={modalVisible}
          onOk={handleSubmit}
          onCancel={() => setModalVisible(false)}
          okText="确定"
          cancelText="取消"
        >
          <Form form={form} layout="vertical">
            <Form.Item
              name="name"
              label="公众号名称"
              rules={[{ required: true, message: '请输入公众号名称' }]}
            >
              <Input placeholder="例如: 银标Daily" />
            </Form.Item>
            <Form.Item name="description" label="描述">
              <Input.TextArea
                placeholder="例如: 银行招标信息公众号"
                rows={4}
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AppLayout>
  );
}
