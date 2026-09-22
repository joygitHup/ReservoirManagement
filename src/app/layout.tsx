import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '智慧水库综合管理系统',
  description: '面向水利管理部门、水库运维单位、防汛指挥中心的WebGIS可视化管理系统',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[#0a1628] text-slate-200 antialiased">
        {children}
      </body>
    </html>
  );
}
