'use client';

import { useEffect, useState } from 'react';
import { Layout, Menu, Button, Dropdown, Avatar, Spin } from 'antd';
import {
  AppstoreOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, _hasHydrated } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // 等待状态恢复完成
    if (_hasHydrated) {
      setIsChecking(false);
      if (!user) {
        router.push('/login');
      }
    }
  }, [_hasHydrated, user, router]);

  // 状态恢复中,显示加载状态
  if (!_hasHydrated || isChecking) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  // 未登录,返回空(即将跳转到登录页)
  if (!user) {
    return null;
  }

  const menuItems = [
    {
      key: '/accounts',
      icon: <AppstoreOutlined />,
      label: '公众号管理',
    },
    {
      key: '/articles',
      icon: <FileTextOutlined />,
      label: '文章管理',
    },
    {
      key: '/dimensions',
      icon: <DatabaseOutlined />,
      label: '维度管理',
    },
    {
      key: '/extractions',
      icon: <LineChartOutlined />,
      label: '提取结果',
    },
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: () => {
        logout();
        router.push('/login');
      },
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    router.push(key);
  };

  return (
    <Layout className="min-h-screen">
      <Header className="flex items-center justify-between bg-white border-b px-6">
        <div className="flex items-center">
          <h1 className="text-xl font-bold m-0">微信公众号文章管理平台</h1>
        </div>
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <div className="flex items-center cursor-pointer hover:bg-gray-50 px-3 py-2 rounded">
            <Avatar icon={<UserOutlined />} size="small" className="mr-2" />
            <span>{user.name}</span>
          </div>
        </Dropdown>
      </Header>
      <Layout>
        <Sider width={200} className="bg-white border-r">
          <Menu
            mode="inline"
            selectedKeys={[pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            className="h-full border-none"
          />
        </Sider>
        <Layout className="p-6">
          <Content className="bg-white rounded-lg p-6">{children}</Content>
        </Layout>
      </Layout>
    </Layout>
  );
}
