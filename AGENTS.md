# 智慧水库综合管理系统 - AGENTS.md

## 项目概览

面向水利管理部门、水库运维单位、防汛指挥中心的 WebGIS 可视化管理系统，基于 Next.js + OpenLayers + ECharts 构建，实现水库分布可视化、实时监测、告警预警、空间分析与历史回溯的一体化管控。

### 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **地图引擎**: OpenLayers 8.x
- **图表库**: ECharts + echarts-for-react
- **空间分析**: @turf/turf
- **底图服务**: 天地图（已配置 Key）

## 目录结构

```
src/
├── app/
│   ├── globals.css          # 全局样式 + 主题变量
│   ├── layout.tsx           # 根布局
│   └── page.tsx             # 主页面（地图+面板布局）
├── components/
│   ├── layout/              # 布局组件
│   │   ├── TopToolbar.tsx   # 顶部工具栏（底图切换、图层控制、工具）
│   │   └── TimelineControl.tsx  # 底部时间轴控件
│   ├── panels/              # 侧边面板
│   │   ├── ReservoirListPanel.tsx  # 左侧水库列表+搜索+筛选
│   │   └── MonitorPanel.tsx # 右侧监测面板（实时数据/告警/详情）
│   ├── map/
│   │   └── MapView.tsx      # OpenLayers 地图组件
│   ├── dashboard/
│   │   └── DashboardStats.tsx  # 顶部统计卡片+图表
│   └── ui/                  # shadcn/ui 组件库
├── data/
│   └── reservoirs.ts        # 模拟数据 + 类型定义 + 工具函数
├── hooks/                   # 自定义 Hooks
└── lib/
    └── utils.ts             # 通用工具函数 (cn)
```

## 核心数据模型

### Reservoir（水库）
- 基本信息：id、name、location、region、type、capacity
- 水位参数：deadWaterLevel、normalWaterLevel、floodLimitLevel、warningLevel、guaranteeLevel
- 实时数据：currentWaterLevel、currentStorage、inflow、outflow、rainfall
- 状态：status (normal/warning/danger/offline)、deviceStatus (online/offline)
- 空间：coordinates [lon, lat]
- 联系：responsiblePerson、phone

### AlertRecord（告警记录）
- type: water_level / device_offline / data_abnormal / rainfall
- level: warning / danger
- status: unconfirmed / processing / resolved

## 功能模块清单

| 模块 | 对应文件 | 状态 |
|------|---------|------|
| 地图基础（缩放/平移/底图切换） | components/map/MapView.tsx | ✅ |
| 水库点位标注 + hover 弹窗 | components/map/MapView.tsx | ✅ |
| 告警点位闪烁动画 | components/map/MapView.tsx | ✅ |
| 左侧水库列表 + 搜索筛选 | components/panels/ReservoirListPanel.tsx | ✅ |
| 列表-地图联动定位 | components/panels/ReservoirListPanel.tsx | ✅ |
| 右侧实时监测数据面板 | components/panels/MonitorPanel.tsx | ✅ |
| 水位仪表（含警戒/保证刻度） | components/panels/MonitorPanel.tsx | ✅ |
| 历史趋势曲线图 | components/panels/MonitorPanel.tsx | ✅ |
| 告警中心列表 | components/panels/MonitorPanel.tsx | ✅ |
| 水库基本信息详情 | components/panels/MonitorPanel.tsx | ✅ |
| 顶部工具栏（底图/图层/工具） | components/layout/TopToolbar.tsx | ✅ |
| 底部时间轴 + 播放控制 | components/layout/TimelineControl.tsx | ✅ |
| 顶部数据看板统计卡片 | components/dashboard/DashboardStats.tsx | ✅ |
| 水位占比排行图 | components/dashboard/DashboardStats.tsx | ✅ |
| 告警趋势图 | components/dashboard/DashboardStats.tsx | ✅ |

## 开发规范

### 编码规范
- 严格 TypeScript strict 模式，禁止隐式 any
- 组件默认 'use client'（地图系统以客户端交互为主）
- 动态数据（Date.now/Math.random 等）必须放 useEffect/useState 中
- 使用 useMemo/useCallback 时依赖必须与实际使用匹配

### 样式规范
- 深色主题，主色 #0a1628（深蓝背景）
- 强调色：青色 #06b6d4（水位/水文）、蓝色 #3b82f6（主色）
- 状态色：绿色 #10b981（正常）、橙色 #f59e0b（预警）、红色 #ef4444（告警）

### 地图规范
- 坐标系：EPSG:3857（Web Mercator）
- 坐标存储：WGS84 经纬度，使用 fromLonLat/toLonLat 转换
- 天地图 Key 写死在 MapView.tsx 中（生产环境建议放环境变量）

## 构建和启动命令

```bash
pnpm install     # 安装依赖
pnpm dev         # 开发模式（端口 5000）
pnpm build       # 生产构建
pnpm start       # 生产模式
pnpm lint        # 代码检查
pnpm ts-check    # 类型检查
```

## 后续扩展方向

1. **后端接入**：替换 data/reservoirs.ts 为 API 调用，接入真实监测数据
2. **WebSocket 推送**：实时数据从模拟 setInterval 改为 WebSocket 订阅
3. **淹没分析**：结合 DEM 数据，使用 Turf.js + 等值线算法实现
4. **用户权限**：接入 Supabase Auth，实现管理员/操作员/只读用户分级
5. **大屏模式**：单独的 /screen 路由，自动轮播水库数据
6. **数据导出**：历史数据导出 Excel/CSV
