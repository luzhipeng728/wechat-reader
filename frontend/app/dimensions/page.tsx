'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Card,
  Upload,
  Radio,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
  FileImageOutlined,
  TableOutlined,
  ThunderboltOutlined,
  MenuOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import AppLayout from '@/components/Layout';
import { dimensionsAPI, accountsAPI } from '@/lib/api';

interface Field {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date';
  description: string;
  required: boolean;
  example?: string;
}

interface Dimension {
  id: string;
  accountId: string;
  name: string;
  description: string;
  fields: Field[];
  isLocked: boolean;
  modelPreference: 'haiku' | 'sonnet';
  createdAt: string;
  account?: {
    id: string;
    name: string;
  };
}

interface Account {
  id: string;
  name: string;
}

export default function DimensionsPage() {
  const router = useRouter();
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [fieldModalVisible, setFieldModalVisible] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [editingDimension, setEditingDimension] = useState<Dimension | null>(null);
  const [currentDimension, setCurrentDimension] = useState<Dimension | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [form] = Form.useForm();
  const [fieldForm] = Form.useForm();
  const [imageForm] = Form.useForm();

  const loadDimensions = async (accountId?: string) => {
    if (!accountId) {
      setDimensions([]);
      return;
    }
    setLoading(true);
    try {
      const data = await dimensionsAPI.list(accountId);
      setDimensions(data);
    } catch (error: any) {
      message.error('获取维度列表失败');
    } finally {
      setLoading(false);
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

  const handleCreate = () => {
    setEditingDimension(null);
    form.resetFields();
    form.setFieldsValue({ accountId: selectedAccountId, modelPreference: 'haiku' });
    setModalVisible(true);
  };

  const handleEdit = (record: Dimension) => {
    setEditingDimension(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await dimensionsAPI.delete(id);
      message.success('删除成功');
      loadDimensions(selectedAccountId);
    } catch (error: any) {
      message.error('删除失败');
    }
  };

  const handleLock = async (id: string) => {
    try {
      await dimensionsAPI.lock(id);
      message.success('锁定成功,维度字段已确定');
      loadDimensions(selectedAccountId);
    } catch (error: any) {
      message.error('锁定失败');
    }
  };

  const handleUnlock = async (id: string) => {
    try {
      await dimensionsAPI.unlock(id);
      message.success('解锁成功,现在可以编辑维度');
      loadDimensions(selectedAccountId);
    } catch (error: any) {
      message.error('解锁失败');
    }
  };

  const handleAddFields = (dimension: Dimension) => {
    setCurrentDimension(dimension);
    fieldForm.resetFields();
    setFieldModalVisible(true);
  };

  const handleImageRecognition = () => {
    imageForm.resetFields();
    imageForm.setFieldsValue({ accountId: selectedAccountId });
    setImageModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingDimension) {
        await dimensionsAPI.update(editingDimension.id, values);
        message.success('更新成功');
      } else {
        await dimensionsAPI.create(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadDimensions(selectedAccountId);
    } catch (error: any) {
      message.error(editingDimension ? '更新失败' : '创建失败');
    }
  };

  const handleFieldSubmit = async () => {
    try {
      const values = await fieldForm.validateFields();
      if (!currentDimension) return;

      await dimensionsAPI.addFields(currentDimension.id, [values]);
      message.success('添加字段成功');
      setFieldModalVisible(false);
      loadDimensions(selectedAccountId);
    } catch (error: any) {
      message.error('添加字段失败');
    }
  };

  const handleImageSubmit = async () => {
    try {
      const values = await imageForm.validateFields();
      const file = values.image?.file;

      if (!file) {
        message.error('请选择图片');
        return;
      }

      // 转换图片为base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          await dimensionsAPI.createFromImage({
            accountId: values.accountId,
            name: values.name,
            imageBase64: base64,
          });
          message.success('维度创建成功');
          setImageModalVisible(false);
          loadDimensions(selectedAccountId);
        } catch (error: any) {
          message.error('图片识别失败');
        }
      };
    } catch (error: any) {
      message.error('提交失败');
    }
  };

  const handleAccountChange = (accountId: string) => {
    setSelectedAccountId(accountId);
    loadDimensions(accountId);
  };

  const handleAIGenerateField = async () => {
    try {
      const description = form.getFieldValue('aiFieldDescription');
      if (!description) {
        message.warning('请输入字段描述');
        return;
      }

      // 如果是编辑模式,需要先保存当前数据到临时变量
      const dimensionId = editingDimension?.id;
      if (!dimensionId) {
        message.warning('请先保存维度后再使用AI生成字段');
        return;
      }

      setAiGenerating(true);
      const result = await dimensionsAPI.aiGenerateField(dimensionId, description);

      // 将生成的字段添加到表单中
      const currentFields = form.getFieldValue('fields') || [];
      form.setFieldsValue({
        fields: [...currentFields, result.field],
        aiFieldDescription: '', // 清空描述
      });

      message.success('AI生成字段成功');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'AI生成字段失败');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;

    const newDimensions = [...dimensions];
    [newDimensions[index], newDimensions[index - 1]] = [newDimensions[index - 1], newDimensions[index]];

    const templateIds = newDimensions.map(d => d.id);

    try {
      await dimensionsAPI.reorder(selectedAccountId, templateIds);
      setDimensions(newDimensions);
      message.success('调整顺序成功');
    } catch (error: any) {
      message.error('调整顺序失败');
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === dimensions.length - 1) return;

    const newDimensions = [...dimensions];
    [newDimensions[index], newDimensions[index + 1]] = [newDimensions[index + 1], newDimensions[index]];

    const templateIds = newDimensions.map(d => d.id);

    try {
      await dimensionsAPI.reorder(selectedAccountId, templateIds);
      setDimensions(newDimensions);
      message.success('调整顺序成功');
    } catch (error: any) {
      message.error('调整顺序失败');
    }
  };

  const handleFieldMoveUp = async (dimensionId: string, fieldIndex: number) => {
    if (fieldIndex === 0) return;

    const dimension = dimensions.find(d => d.id === dimensionId);
    if (!dimension) return;

    const newFields = [...dimension.fields];
    [newFields[fieldIndex], newFields[fieldIndex - 1]] = [newFields[fieldIndex - 1], newFields[fieldIndex]];

    try {
      await dimensionsAPI.update(dimensionId, { fields: newFields });
      // 更新本地状态
      setDimensions(dimensions.map(d =>
        d.id === dimensionId ? { ...d, fields: newFields } : d
      ));
      message.success('调整字段顺序成功');
    } catch (error: any) {
      message.error('调整字段顺序失败');
    }
  };

  const handleFieldMoveDown = async (dimensionId: string, fieldIndex: number, totalFields: number) => {
    if (fieldIndex === totalFields - 1) return;

    const dimension = dimensions.find(d => d.id === dimensionId);
    if (!dimension) return;

    const newFields = [...dimension.fields];
    [newFields[fieldIndex], newFields[fieldIndex + 1]] = [newFields[fieldIndex + 1], newFields[fieldIndex]];

    try {
      await dimensionsAPI.update(dimensionId, { fields: newFields });
      // 更新本地状态
      setDimensions(dimensions.map(d =>
        d.id === dimensionId ? { ...d, fields: newFields } : d
      ));
      message.success('调整字段顺序成功');
    } catch (error: any) {
      message.error('调整字段顺序失败');
    }
  };

  const columns = [
    {
      title: '排序',
      key: 'sort',
      width: 80,
      render: (_: any, record: Dimension, index: number) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<ArrowUpOutlined />}
            disabled={index === 0}
            onClick={() => handleMoveUp(index)}
          />
          <Button
            type="text"
            size="small"
            icon={<ArrowDownOutlined />}
            disabled={index === dimensions.length - 1}
            onClick={() => handleMoveDown(index)}
          />
        </Space>
      ),
    },
    {
      title: '维度名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '字段数量',
      dataIndex: 'fields',
      key: 'fieldsCount',
      render: (fields: Field[]) => fields.length,
    },
    {
      title: '模型',
      dataIndex: 'modelPreference',
      key: 'modelPreference',
      render: (model: string) => (
        <Tag color={model === 'haiku' ? 'blue' : 'purple'}>
          {model === 'haiku' ? 'Haiku(快速)' : 'Sonnet(精准)'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isLocked',
      key: 'isLocked',
      render: (isLocked: boolean) =>
        isLocked ? (
          <Tag icon={<LockOutlined />} color="warning">
            已锁定
          </Tag>
        ) : (
          <Tag icon={<UnlockOutlined />} color="default">
            未锁定
          </Tag>
        ),
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
      width: 250,
      fixed: 'right' as const,
      render: (_: any, record: Dimension) => (
        <Space size="small">
          {record.isLocked && (
            <Button
              type="primary"
              size="small"
              icon={<TableOutlined />}
              onClick={() => router.push(`/dimensions/${record.id}/data`)}
            >
              查看数据
            </Button>
          )}
          {!record.isLocked && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                编辑
              </Button>
              <Button
                type="link"
                size="small"
                icon={<LockOutlined />}
                onClick={() => handleLock(record.id)}
              >
                锁定
              </Button>
            </>
          )}
          {record.isLocked && (
            <>
              <Button
                type="link"
                size="small"
                icon={<UnlockOutlined />}
                onClick={() => handleUnlock(record.id)}
              >
                解锁
              </Button>
              <Button
                type="link"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => handleAddFields(record)}
              >
                添加字段
              </Button>
            </>
          )}
          <Popconfirm
            title="确定要删除这个维度吗?"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const expandedRowRender = (record: Dimension) => {
    const fieldColumns = [
      {
        title: '排序',
        key: 'fieldSort',
        width: 80,
        render: (_: any, field: Field, index: number) => (
          <Space>
            <Button
              type="text"
              size="small"
              icon={<ArrowUpOutlined />}
              disabled={index === 0 || record.isLocked}
              onClick={() => handleFieldMoveUp(record.id, index)}
            />
            <Button
              type="text"
              size="small"
              icon={<ArrowDownOutlined />}
              disabled={index === record.fields.length - 1 || record.isLocked}
              onClick={() => handleFieldMoveDown(record.id, index, record.fields.length)}
            />
          </Space>
        ),
      },
      { title: '字段名', dataIndex: 'name', key: 'name' },
      { title: '显示名', dataIndex: 'label', key: 'label' },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        render: (type: string) => {
          const typeMap: Record<string, string> = {
            text: '文本',
            number: '数字',
            date: '日期',
          };
          return typeMap[type] || type;
        },
      },
      { title: '描述', dataIndex: 'description', key: 'description' },
      {
        title: '必填',
        dataIndex: 'required',
        key: 'required',
        render: (required: boolean) => (required ? '是' : '否'),
      },
      { title: '示例', dataIndex: 'example', key: 'example' },
    ];

    return (
      <Table
        columns={fieldColumns}
        dataSource={record.fields}
        pagination={false}
        rowKey="name"
        size="small"
      />
    );
  };

  return (
    <AppLayout>
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold m-0">维度管理</h2>
            <Select
              placeholder="选择公众号"
              style={{ width: 200 }}
              value={selectedAccountId}
              onChange={handleAccountChange}
              options={accounts.map((acc) => ({
                label: acc.name,
                value: acc.id,
              }))}
            />
          </div>
          <Space>
            <Button icon={<FileImageOutlined />} onClick={handleImageRecognition}>
              图片识别
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              添加维度
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={dimensions}
          loading={loading}
          rowKey="id"
          expandable={{ expandedRowRender }}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1200 }}
        />

        <Modal
          title={editingDimension ? '编辑维度' : '添加维度'}
          open={modalVisible}
          onOk={handleSubmit}
          onCancel={() => setModalVisible(false)}
          okText="确定"
          cancelText="取消"
          width={900}
        >
          <Form form={form} layout="vertical">
            <Form.Item name="accountId" label="公众号" hidden>
              <Input />
            </Form.Item>
            <Form.Item
              name="name"
              label="维度名称"
              rules={[{ required: true, message: '请输入维度名称' }]}
            >
              <Input placeholder="例如: 招标项目信息" />
            </Form.Item>
            <Form.Item name="description" label="描述">
              <Input.TextArea placeholder="例如: 提取招标项目的基本信息" rows={2} />
            </Form.Item>
            <Form.Item
              name="modelPreference"
              label="AI模型"
              rules={[{ required: true }]}
            >
              <Radio.Group>
                <Radio value="haiku">Haiku (快速,成本低)</Radio>
                <Radio value="sonnet">Sonnet (精准,成本高)</Radio>
              </Radio.Group>
            </Form.Item>

            {editingDimension && (
              <Card title="AI智能生成字段" size="small" className="mb-4">
                <Space.Compact style={{ width: '100%' }}>
                  <Form.Item name="aiFieldDescription" noStyle>
                    <Input placeholder="描述你需要的字段,例如: 请添加一个字段用于记录项目预算金额" />
                  </Form.Item>
                  <Button
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    onClick={handleAIGenerateField}
                    loading={aiGenerating}
                  >
                    AI生成
                  </Button>
                </Space.Compact>
                <div className="text-xs text-gray-500 mt-1">
                  AI会根据维度的现有字段和你的描述,智能生成新字段
                </div>
              </Card>
            )}

            <Form.List name="fields">
              {(fields, { add, remove }) => (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-medium">字段配置</label>
                    <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                      手动添加字段
                    </Button>
                  </div>
                  {fields.map((field, index) => (
                    <Card
                      key={field.key}
                      size="small"
                      className="mb-2"
                      extra={
                        <Button
                          type="link"
                          danger
                          onClick={() => remove(field.name)}
                        >
                          删除
                        </Button>
                      }
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <Form.Item
                          {...field}
                          name={[field.name, 'name']}
                          label="字段名"
                          rules={[{ required: true, message: '请输入字段名' }]}
                        >
                          <Input placeholder="bank_name" />
                        </Form.Item>
                        <Form.Item
                          {...field}
                          name={[field.name, 'label']}
                          label="显示名"
                          rules={[{ required: true, message: '请输入显示名' }]}
                        >
                          <Input placeholder="银行" />
                        </Form.Item>
                        <Form.Item
                          {...field}
                          name={[field.name, 'type']}
                          label="类型"
                          rules={[{ required: true }]}
                        >
                          <Select
                            options={[
                              { label: '文本', value: 'text' },
                              { label: '数字', value: 'number' },
                              { label: '日期', value: 'date' },
                            ]}
                          />
                        </Form.Item>
                        <Form.Item
                          {...field}
                          name={[field.name, 'required']}
                          label="是否必填"
                          initialValue={false}
                        >
                          <Select
                            options={[
                              { label: '必填', value: true },
                              { label: '可选', value: false },
                            ]}
                          />
                        </Form.Item>
                        <Form.Item
                          {...field}
                          name={[field.name, 'description']}
                          label="描述"
                          className="col-span-2"
                        >
                          <Input placeholder="例如: 银行名称" />
                        </Form.Item>
                        <Form.Item
                          {...field}
                          name={[field.name, 'example']}
                          label="示例值"
                          className="col-span-2"
                        >
                          <Input placeholder="例如: 兴业银行" />
                        </Form.Item>
                      </div>
                    </Card>
                  ))}
                </>
              )}
            </Form.List>

            {editingDimension && (
              <Form.Item name="promptTemplate" label="提取Prompt (高级)" className="mt-4">
                <Input.TextArea
                  placeholder="留空将使用系统默认prompt"
                  rows={6}
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                />
              </Form.Item>
            )}
          </Form>
        </Modal>

        <Modal
          title="添加字段"
          open={fieldModalVisible}
          onOk={handleFieldSubmit}
          onCancel={() => setFieldModalVisible(false)}
          okText="确定"
          cancelText="取消"
        >
          <Form form={fieldForm} layout="vertical">
            <Form.Item
              name="name"
              label="字段名"
              rules={[{ required: true, message: '请输入字段名' }]}
            >
              <Input placeholder="supplier" />
            </Form.Item>
            <Form.Item
              name="label"
              label="显示名"
              rules={[{ required: true, message: '请输入显示名' }]}
            >
              <Input placeholder="中标厂商" />
            </Form.Item>
            <Form.Item
              name="type"
              label="类型"
              rules={[{ required: true }]}
              initialValue="text"
            >
              <Select
                options={[
                  { label: '文本', value: 'text' },
                  { label: '数字', value: 'number' },
                  { label: '日期', value: 'date' },
                ]}
              />
            </Form.Item>
            <Form.Item name="description" label="描述">
              <Input placeholder="中标的供应商名称" />
            </Form.Item>
            <Form.Item name="required" label="是否必填" initialValue={false}>
              <Select
                options={[
                  { label: '必填', value: true },
                  { label: '可选', value: false },
                ]}
              />
            </Form.Item>
            <Form.Item name="example" label="示例值">
              <Input placeholder="华为技术有限公司" />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="图片识别创建维度"
          open={imageModalVisible}
          onOk={handleImageSubmit}
          onCancel={() => setImageModalVisible(false)}
          okText="确定"
          cancelText="取消"
        >
          <Form form={imageForm} layout="vertical">
            <Form.Item name="accountId" hidden>
              <Input />
            </Form.Item>
            <Form.Item
              name="name"
              label="维度名称"
              rules={[{ required: true, message: '请输入维度名称' }]}
            >
              <Input placeholder="例如: 招标项目信息" />
            </Form.Item>
            <Form.Item
              name="image"
              label="上传Excel截图"
              rules={[{ required: true, message: '请上传图片' }]}
            >
              <Upload
                listType="picture-card"
                maxCount={1}
                beforeUpload={() => false}
              >
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>上传图片</div>
                </div>
              </Upload>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AppLayout>
  );
}
