'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { TopToolbar } from '@/components/layout/TopToolbar';
import { TimelineControl } from '@/components/layout/TimelineControl';
import { ReservoirListPanel } from '@/components/panels/ReservoirListPanel';
import { MonitorPanel } from '@/components/panels/MonitorPanel';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import {
  reservoirList,
  alertList,
  getOverviewStats,
  type Reservoir,
} from '@/data/reservoirs';

// 动态加载地图组件（避免 SSR 问题）
const MapView = dynamic(
  () => import('@/components/map/MapView').then(mod => ({ default: mod.MapView })),
  { ssr: false }
);

export default function Home() {
  const [baseMapType, setBaseMapType] = useState('tianditu_vec');
  const [showReservoirLayer, setShowReservoirLayer] = useState(true);
  const [showAlertLayer, setShowAlertLayer] = useState(true);
  const [showBasinLayer, setShowBasinLayer] = useState(false);
  const [selectedReservoir, setSelectedReservoir] = useState<Reservoir | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');
  const [isPlaying, setIsPlaying] = useState(false);

  const stats = getOverviewStats();
  const unconfirmedAlerts = alertList.filter(a => a.status === 'unconfirmed');

  // 模拟实时数据更新
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setSelectedTime(prev => {
        const next = new Date(prev.getTime() + 60000);
        const now = new Date();
        if (next.getTime() > now.getTime()) {
          setIsPlaying(false);
          return now;
        }
        return next;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleReservoirSelect = useCallback((reservoir: Reservoir) => {
    setSelectedReservoir(reservoir);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a1628]">
      {/* 顶部工具栏 */}
      <TopToolbar
        baseMapType={baseMapType}
        onBaseMapChange={setBaseMapType}
        showReservoirLayer={showReservoirLayer}
        onToggleReservoirLayer={() => setShowReservoirLayer(!showReservoirLayer)}
        showAlertLayer={showAlertLayer}
        onToggleAlertLayer={showAlertLayer}
        showBasinLayer={showBasinLayer}
        onToggleBasinLayer={() => setShowBasinLayer(!showBasinLayer)}
        activeTool={activeTool}
        onToolChange={setActiveTool}
        alertCount={unconfirmedAlerts.length}
        onToggleAlertPanel={() => {}}
      />

      {/* 主体区域 */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* 左侧水库列表 */}
        <aside className="w-72 flex-shrink-0 z-20">
          <ReservoirListPanel
            reservoirs={reservoirList}
            selectedReservoir={selectedReservoir}
            onSelect={handleReservoirSelect}
            totalCount={stats.total}
            normalCount={stats.normal}
            warningCount={stats.warning}
            dangerCount={stats.danger}
            offlineCount={stats.offline}
          />
        </aside>

        {/* 地图主区域 */}
        <main className="flex-1 relative">
          {/* 仪表盘统计卡片（悬浮） */}
          <DashboardStats
            total={stats.total}
            normal={stats.normal}
            warning={stats.warning}
            danger={stats.danger}
            offline={stats.offline}
            onlineRate={stats.onlineRate}
            reservoirs={reservoirList}
            alerts={alertList}
          />

          {/* OpenLayers 地图 */}
          <MapView
            reservoirs={reservoirList}
            alerts={alertList}
            selectedReservoir={selectedReservoir}
            onSelectReservoir={handleReservoirSelect}
            baseMapType={baseMapType}
            showReservoirLayer={showReservoirLayer}
            showAlertLayer={showAlertLayer}
            showBasinLayer={showBasinLayer}
            selectedTime={selectedTime}
          />
        </main>

        {/* 右侧监测面板 */}
        <aside className="w-80 flex-shrink-0 z-20">
          <MonitorPanel
            reservoir={selectedReservoir}
            alerts={alertList}
            timeRange={timeRange}
            selectedTime={selectedTime}
          />
        </aside>
      </div>

      {/* 底部时间轴 */}
      <TimelineControl
        selectedTime={selectedTime}
        onTimeChange={setSelectedTime}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
      />
    </div>
  );
}
