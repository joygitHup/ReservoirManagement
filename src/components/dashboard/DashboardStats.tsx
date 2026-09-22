'use client';

import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import { Droplets, AlertTriangle, Activity, Wifi, TrendingUp } from 'lucide-react';
import type { Reservoir, AlertRecord } from '@/data/reservoirs';

interface DashboardStatsProps {
  total: number;
  normal: number;
  warning: number;
  danger: number;
  offline: number;
  onlineRate: number;
  reservoirs: Reservoir[];
  alerts: AlertRecord[];
}

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
  trend,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string | number;
  unit?: string;
  color: string;
  trend?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div 
      className="relative overflow-hidden border border-white/5 rounded-2xl px-5 py-4 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
      style={{ 
        background: 'linear-gradient(135deg, rgba(15,29,50,0.65) 0%, rgba(10,22,40,0.55) 100%)',
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.25), transparent)' }} />
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-xl" style={{ background: `${color}14` }}>
          <Icon className="w-5 h-5" style={{ color: color }} />
        </div>
        {trend && (
          <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-white tabular-nums" style={{ textShadow: '0 0 20px rgba(59,130,246,0.3)' }}>{value}</span>
        {unit && <span className="text-xs text-slate-400 font-medium">{unit}</span>}
      </div>
      <div className="text-xs text-slate-400 mt-1 font-medium">{label}</div>
    </div>
  );
}

function WaterLevelDistribution({ reservoirs }: { reservoirs: Reservoir[] }) {
  const sortedReservoirs = useMemo(
    () => [...reservoirs].sort((a, b) => b.currentWaterLevel / b.warningLevel - a.currentWaterLevel / a.warningLevel).slice(0, 8),
    [reservoirs]
  );

  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    grid: { left: 80, right: 30, top: 10, bottom: 10 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 29, 50, 0.95)',
      borderColor: 'rgba(59, 130, 246, 0.3)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(59, 130, 246, 0.1)' } },
    },
    xAxis: {
      type: 'value',
      max: 120,
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.1)' } },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#64748b',
        fontSize: 10,
        formatter: '{value}%',
      },
    },
    yAxis: {
      type: 'category',
      data: sortedReservoirs.map(r => r.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 11,
        width: 75,
        overflow: 'truncate',
      },
    },
    series: [
      {
        type: 'bar',
        data: sortedReservoirs.map(r => ({
          value: Math.round((r.currentWaterLevel / r.warningLevel) * 100),
          itemStyle: {
            color: r.status === 'danger' ? '#ef4444' : r.status === 'warning' ? '#f59e0b' : '#06b6d4',
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barWidth: 12,
        markLine: {
          silent: true,
          lineStyle: { color: '#f59e0b', type: 'dashed', width: 1 },
          data: [{ xAxis: 100, label: { show: false } }],
        },
      },
    ],
  }), [sortedReservoirs]);

  return (
    <div className="bg-[rgba(15,29,50,0.8)] border border-blue-500/20 rounded-xl p-4">
      <h3 className="text-sm font-medium text-slate-200 mb-2">水位占比排行（占警戒水位%）</h3>
      <ReactECharts option={option} style={{ height: '240px' }} theme="dark" />
    </div>
  );
}

function AlertTrendChart({ alerts }: { alerts: AlertRecord[] }) {
  const option = useMemo(() => {
    // 生成最近7天的告警趋势（伪随机，基于alerts数量产生种子）
    const days: string[] = [];
    const warningCounts: number[] = [];
    const dangerCounts: number[] = [];
    const seed = alerts.length || 1;
    
    const pseudoRandom = (i: number) => {
      const x = Math.sin(seed * 999 + i * 77) * 10000;
      return x - Math.floor(x);
    };
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(`${date.getMonth() + 1}/${date.getDate()}`);
      warningCounts.push(Math.floor(pseudoRandom(i) * 8 + 2));
      dangerCounts.push(Math.floor(pseudoRandom(i + 100) * 3));
    }

    return {
      backgroundColor: 'transparent',
      grid: { left: 35, right: 15, top: 30, bottom: 20 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 29, 50, 0.95)',
        borderColor: 'rgba(59, 130, 246, 0.3)',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
      },
      legend: {
        data: ['预警', '告警'],
        textStyle: { color: '#94a3b8', fontSize: 11 },
        top: 0,
        right: 0,
        itemWidth: 12,
        itemHeight: 8,
      },
      xAxis: {
        type: 'category',
        data: days,
        axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.3)' } },
        axisLabel: { color: '#64748b', fontSize: 10 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.1)' } },
        axisLine: { show: false },
        axisLabel: { color: '#64748b', fontSize: 10 },
      },
      series: [
        {
          name: '预警',
          type: 'line',
          data: warningCounts,
          smooth: true,
          lineStyle: { color: '#f59e0b', width: 2 },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(245, 158, 11, 0.25)' },
                { offset: 1, color: 'rgba(245, 158, 11, 0)' },
              ],
            },
          },
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: '#f59e0b', borderColor: 'rgba(15, 29, 50, 1)', borderWidth: 2 },
        },
        {
          name: '告警',
          type: 'line',
          data: dangerCounts,
          smooth: true,
          lineStyle: { color: '#ef4444', width: 2 },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(239, 68, 68, 0.25)' },
                { offset: 1, color: 'rgba(239, 68, 68, 0)' },
              ],
            },
          },
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: '#ef4444', borderColor: 'rgba(15, 29, 50, 1)', borderWidth: 2 },
        },
      ],
    };
  }, [alerts.length]);

  return (
    <div className="bg-[rgba(15,29,50,0.8)] border border-blue-500/20 rounded-xl p-4">
      <h3 className="text-sm font-medium text-slate-200 mb-2">告警趋势（近7天）</h3>
      <ReactECharts option={option} style={{ height: '200px' }} theme="dark" />
    </div>
  );
}

export function DashboardStats({ total, normal, warning, danger, offline, onlineRate, reservoirs, alerts }: DashboardStatsProps) {
  return (
    <div className="absolute top-[72px] left-[300px] right-[340px] z-10 pointer-events-none">
      <div className="grid grid-cols-5 gap-4 pointer-events-auto">
        <StatCard
          icon={Droplets}
          label="水库总数"
          value={total}
          unit="座"
          color="#06b6d4"
        />
        <StatCard
          icon={Activity}
          label="正常运行"
          value={normal}
          unit="座"
          color="#10b981"
        />
        <StatCard
          icon={AlertTriangle}
          label="预警"
          value={warning}
          unit="座"
          color="#f59e0b"
        />
        <StatCard
          icon={AlertTriangle}
          label="告警"
          value={danger}
          unit="座"
          color="#ef4444"
        />
        <StatCard
          icon={Wifi}
          label="设备在线率"
          value={onlineRate}
          unit="%"
          color="#3b82f6"
        />
      </div>
    </div>
  );
}

export { WaterLevelDistribution, AlertTrendChart };
