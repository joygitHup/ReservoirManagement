'use client';

import { useState, useMemo, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Droplets,
  TrendingUp,
  TrendingDown,
  CloudRain,
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Clock3,
  XCircle,
  ChevronRight,
  BarChart3,
  Gauge,
  RefreshCw,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import type { Reservoir, AlertRecord, HistoryDataPoint } from '@/data/reservoirs';
import { generateHistoryData } from '@/data/reservoirs';

interface MonitorPanelProps {
  reservoir: Reservoir | null;
  alerts: AlertRecord[];
  timeRange: '1h' | '24h' | '7d';
  selectedTime: Date;
}

function formatTime(isoString: string) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

function DataCard({
  icon: Icon,
  label,
  value,
  unit,
  trend,
  color = 'cyan',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  unit: string;
  trend?: 'up' | 'down' | 'stable';
  color?: 'cyan' | 'blue' | 'emerald' | 'amber' | 'red';
}) {
  const colorMap = {
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
  };

  return (
    <Card className={`bg-[rgba(15,29,50,0.8)] border rounded-lg ${colorMap[color].split(' ').slice(-1)[0]}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1.5 rounded-md ${colorMap[color].split(' ').slice(0, 2).join(' ')}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-xs text-slate-400">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-xl font-bold font-mono tabular-nums ${colorMap[color].split(' ')[0]}`}>
            {value}
          </span>
          <span className="text-xs text-slate-500">{unit}</span>
          {trend && (
            <span className="ml-auto">
              {trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-red-400" />}
              {trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function WaterLevelGauge({ reservoir }: { reservoir: Reservoir }) {
  const range = reservoir.guaranteeLevel - reservoir.deadWaterLevel;
  const percent = Math.min(100, Math.max(0, ((reservoir.currentWaterLevel - reservoir.deadWaterLevel) / range) * 100));
  const warningPercent = ((reservoir.warningLevel - reservoir.deadWaterLevel) / range) * 100;
  const dangerPercent = ((reservoir.guaranteeLevel - reservoir.deadWaterLevel) / range) * 100;

  const statusColor =
    reservoir.status === 'danger' ? 'text-red-400' :
    reservoir.status === 'warning' ? 'text-amber-400' :
    'text-emerald-400';

  return (
    <div className="bg-[rgba(15,29,50,0.8)] border border-blue-500/20 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-300 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-cyan-400" />
          水位状态
        </span>
        <Badge className={`text-xs ${
          reservoir.status === 'danger' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
          reservoir.status === 'warning' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
          'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        } border`}>
          {reservoir.status === 'normal' ? '正常' : reservoir.status === 'warning' ? '预警' : reservoir.status === 'danger' ? '告警' : '离线'}
        </Badge>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>死水位 {reservoir.deadWaterLevel}m</span>
          <span>保证水位 {reservoir.guaranteeLevel}m</span>
        </div>
        <div className="relative h-3 bg-slate-700/50 rounded-full overflow-hidden">
          {/* 预警区段 */}
          <div
            className="absolute h-full bg-amber-500/30"
            style={{ left: `${warningPercent}%`, width: `${dangerPercent - warningPercent}%` }}
          />
          {/* 告警区段 */}
          <div
            className="absolute h-full bg-red-500/30"
            style={{ left: `${dangerPercent}%`, width: `${100 - dangerPercent}%` }}
          />
          {/* 当前水位指示器 */}
          <div
            className="absolute top-0 h-full w-1 bg-white shadow-lg transition-all duration-500"
            style={{ left: `calc(${percent}% - 2px)` }}
          />
        </div>
        {/* 刻度标记 */}
        <div className="flex justify-between mt-1">
          <div className="text-[10px] text-slate-500">低</div>
          <div className="text-[10px] text-amber-500">警戒</div>
          <div className="text-[10px] text-red-500">保证</div>
        </div>
      </div>

      <div className="flex items-end justify-between mt-4">
        <div>
          <div className="text-xs text-slate-500 mb-0.5">当前水位</div>
          <div className={`text-2xl font-bold font-mono tabular-nums ${statusColor}`}>
            {reservoir.currentWaterLevel.toFixed(2)}
            <span className="text-sm font-normal text-slate-400 ml-1">m</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500 mb-0.5">距警戒水位</div>
          <div className="text-sm font-mono tabular-nums text-slate-300">
            {Math.abs(reservoir.warningLevel - reservoir.currentWaterLevel).toFixed(2)} m
            {reservoir.currentWaterLevel < reservoir.warningLevel ? '' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryChart({ reservoir, timeRange }: { reservoir: Reservoir; timeRange: string }) {
  const hours = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : 168;
  const historyData = useMemo(() => generateHistoryData(reservoir, hours), [reservoir, hours]);

  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    grid: { left: 40, right: 20, top: 30, bottom: 25 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 29, 50, 0.95)',
      borderColor: 'rgba(59, 130, 246, 0.3)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      axisPointer: { lineStyle: { color: 'rgba(59, 130, 246, 0.5)' } },
    },
    legend: {
      data: ['水位', '流量', '雨量'],
      textStyle: { color: '#94a3b8', fontSize: 11 },
      top: 0,
      right: 0,
      itemWidth: 12,
      itemHeight: 8,
    },
    xAxis: {
      type: 'category',
      data: historyData.map(d => {
        const date = new Date(d.time);
        return timeRange === '1h'
          ? `${date.getMinutes()}分`
          : timeRange === '24h'
          ? `${date.getHours()}:00`
          : `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.3)' } },
      axisLabel: { color: '#64748b', fontSize: 10 },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        name: '水位(m)',
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.1)' } },
        axisLine: { show: false },
        axisLabel: { color: '#64748b', fontSize: 10 },
      },
      {
        type: 'value',
        name: '流量/雨量',
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        splitLine: { show: false },
        axisLine: { show: false },
        axisLabel: { color: '#64748b', fontSize: 10 },
      },
    ],
    series: [
      {
        name: '水位',
        type: 'line',
        data: historyData.map(d => d.waterLevel),
        smooth: true,
        lineStyle: { color: '#06b6d4', width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(6, 182, 212, 0.3)' },
              { offset: 1, color: 'rgba(6, 182, 212, 0)' },
            ],
          },
        },
        symbol: 'none',
        yAxisIndex: 0,
      },
      {
        name: '流量',
        type: 'line',
        data: historyData.map(d => d.inflow),
        smooth: true,
        lineStyle: { color: '#3b82f6', width: 1.5 },
        symbol: 'none',
        yAxisIndex: 1,
      },
      {
        name: '雨量',
        type: 'bar',
        data: historyData.map(d => d.rainfall),
        barWidth: 4,
        itemStyle: { color: 'rgba(59, 130, 246, 0.6)', borderRadius: [2, 2, 0, 0] },
        yAxisIndex: 1,
      },
    ],
  }), [historyData, timeRange]);

  return (
    <div className="bg-[rgba(15,29,50,0.8)] border border-blue-500/20 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-300 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          历史趋势
        </span>
        <span className="text-[10px] text-slate-500">最近 {timeRange}</span>
      </div>
      <ReactECharts option={option} style={{ height: '180px' }} theme="dark" />
    </div>
  );
}

function AlertList({ alerts }: { alerts: AlertRecord[] }) {
  const sortedAlerts = useMemo(() =>
    [...alerts].sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime()),
    [alerts]
  );

  const getAlertIcon = (type: string, level: string) => {
    if (level === 'danger') return <XCircle className="w-4 h-4 text-red-400" />;
    if (type === 'device_offline') return <Activity className="w-4 h-4 text-slate-400" />;
    return <AlertTriangle className="w-4 h-4 text-amber-400" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'unconfirmed': return <Clock3 className="w-3.5 h-3.5 text-amber-400" />;
      case 'processing': return <Clock className="w-3.5 h-3.5 text-blue-400" />;
      case 'resolved': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      default: return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'unconfirmed': return '未确认';
      case 'processing': return '处理中';
      case 'resolved': return '已解决';
      default: return status;
    }
  };

  return (
    <div className="space-y-2">
      {sortedAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`p-3 rounded-lg border transition-colors cursor-pointer hover:bg-slate-800/30 ${
            alert.level === 'danger'
              ? 'bg-red-500/5 border-red-500/20'
              : 'bg-amber-500/5 border-amber-500/20'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5">{getAlertIcon(alert.type, alert.level)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-200 truncate">
                  {alert.reservoirName}
                </span>
                <div className="flex items-center gap-1 text-[10px]">
                  {getStatusIcon(alert.status)}
                  <span className="text-slate-400">{getStatusText(alert.status)}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1.5 line-clamp-2">{alert.message}</p>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>{alert.type === 'water_level' ? '水位超限' : alert.type === 'device_offline' ? '设备离线' : '数据异常'}</span>
                <span>{formatTime(alert.createTime)}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
      {sortedAlerts.length === 0 && (
        <div className="text-center py-8 text-slate-500 text-sm">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          暂无告警
        </div>
      )}
    </div>
  );
}

export function MonitorPanel({ reservoir, alerts, timeRange }: MonitorPanelProps) {
  const [activeTab, setActiveTab] = useState('monitor');

  // 告警计数
  const unconfirmedCount = alerts.filter(a => a.status === 'unconfirmed').length;

  if (!reservoir) {
    return (
      <div className="h-full flex flex-col bg-[rgba(10,22,40,0.92)] backdrop-blur-md border-l border-blue-500/10">
        <div className="flex-1 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <Droplets className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">请选择一个水库查看详情</p>
            <p className="text-xs text-slate-600 mt-1">点击地图上的水库点或从左侧列表选择</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[rgba(10,22,40,0.92)] backdrop-blur-md border-l border-blue-500/10">
      {/* 头部 */}
      <div className="p-4 border-b border-blue-500/10">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-white">{reservoir.name}</h2>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-slate-500">{reservoir.location}</p>
      </div>

      {/* Tab 切换 */}
      <div className="px-3 pt-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-slate-800/50 h-8">
            <TabsTrigger value="monitor" className="flex-1 text-xs h-7 data-[state=active]:bg-slate-700">
              实时监测
            </TabsTrigger>
            <TabsTrigger value="alert" className="flex-1 text-xs h-7 data-[state=active]:bg-slate-700 relative">
              告警中心
              {unconfirmedCount > 0 && (
                <span className="absolute top-1 right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="info" className="flex-1 text-xs h-7 data-[state=active]:bg-slate-700">
              基本信息
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Separator className="bg-blue-500/10 my-2" />

      {/* 内容区 */}
      <ScrollArea className="flex-1 px-3 pb-3">
        {activeTab === 'monitor' && (
          <div className="space-y-3">
            {/* 水位仪表 */}
            <WaterLevelGauge reservoir={reservoir} />

            {/* 数据卡片 */}
            <div className="grid grid-cols-2 gap-2">
              <DataCard
                icon={TrendingUp}
                label="入库流量"
                value={reservoir.inflow.toFixed(1)}
                unit="m³/s"
                trend={reservoir.inflow > reservoir.outflow ? 'up' : 'down'}
                color="blue"
              />
              <DataCard
                icon={TrendingDown}
                label="出库流量"
                value={reservoir.outflow.toFixed(1)}
                unit="m³/s"
                trend={reservoir.outflow > reservoir.inflow ? 'up' : 'down'}
                color="emerald"
              />
              <DataCard
                icon={CloudRain}
                label="降雨量"
                value={reservoir.rainfall.toFixed(1)}
                unit="mm"
                color="cyan"
              />
              <DataCard
                icon={Droplets}
                label="当前库容"
                value={(reservoir.currentStorage / 10000).toFixed(2)}
                unit="亿m³"
                color="cyan"
              />
            </div>

            {/* 历史曲线 */}
            <HistoryChart reservoir={reservoir} timeRange={timeRange} />
          </div>
        )}

        {activeTab === 'alert' && (
          <AlertList alerts={alerts.filter(a => a.reservoirId === reservoir.id)} />
        )}

        {activeTab === 'info' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-2">基本信息</h3>
              <div className="bg-[rgba(15,29,50,0.8)] border border-blue-500/20 rounded-lg p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">水库编号</span>
                  <span className="text-slate-300 font-mono">{reservoir.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">水库类型</span>
                  <span className="text-slate-300">{reservoir.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">所属区域</span>
                  <span className="text-slate-300">{reservoir.region}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">总库容</span>
                  <span className="text-slate-300 font-mono">{reservoir.capacity.toLocaleString()} 万m³</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">正常蓄水位</span>
                  <span className="text-slate-300 font-mono">{reservoir.normalWaterLevel} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">汛限水位</span>
                  <span className="text-slate-300 font-mono">{reservoir.floodLimitLevel} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">警戒水位</span>
                  <span className="text-amber-400 font-mono">{reservoir.warningLevel} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">保证水位</span>
                  <span className="text-red-400 font-mono">{reservoir.guaranteeLevel} m</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-2">责任人信息</h3>
              <div className="bg-[rgba(15,29,50,0.8)] border border-blue-500/20 rounded-lg p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">责任人</span>
                  <span className="text-slate-300">{reservoir.responsiblePerson}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">联系电话</span>
                  <span className="text-slate-300 font-mono">{reservoir.phone}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-2">水库简介</h3>
              <div className="bg-[rgba(15,29,50,0.8)] border border-blue-500/20 rounded-lg p-3">
                <p className="text-xs text-slate-400 leading-relaxed">{reservoir.description}</p>
              </div>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
