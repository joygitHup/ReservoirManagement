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
  type AlertRecord,
} from '@/data/reservoirs';
import {
  DEFAULT_SETTINGS,
  type SystemSettings,
} from '@/components/layout/SystemSettingsDialog';
import { NotificationPanel } from '@/components/layout/NotificationPanel';
import { FloodAnalysisPanel } from '@/components/map/FloodAnalysisPanel';
import type { FloodAnalysis } from '@/lib/flood';

// 动态加载地图组件（避免 SSR 问题）
const MapView = dynamic(
  () => import('@/components/map/MapView').then(mod => ({ default: mod.MapView })),
  { ssr: false }
);

// 从本地读取系统设置
function loadStoredSettings(): SystemSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem('rms-settings');
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<SystemSettings>) };
    }
  } catch {
    // 读取失败时回退到默认设置
  }
  return DEFAULT_SETTINGS;
}

export default function Home() {
  const [baseMapType, setBaseMapType] = useState('gaode');
  const [showReservoirLayer, setShowReservoirLayer] = useState(true);
  const [showAlertLayer, setShowAlertLayer] = useState(true);
  const [showBasinLayer, setShowBasinLayer] = useState(false);
  const [selectedReservoir, setSelectedReservoir] = useState<Reservoir | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');
  const [isPlaying, setIsPlaying] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>(loadStoredSettings);
  const [alertPanelOpen, setAlertPanelOpen] = useState(false);
  const [floodResult, setFloodResult] = useState<FloodAnalysis | null>(null);

  const stats = getOverviewStats();
  const unconfirmedAlerts = alertList.filter(a => a.status === 'unconfirmed');

  // 地图标注使用的告警（可按设置仅显示未确认告警）
  const mapAlerts = settings.onlyUnconfirmedAlert
    ? unconfirmedAlerts
    : alertList;

  // 持久化系统设置
  useEffect(() => {
    try {
      localStorage.setItem('rms-settings', JSON.stringify(settings));
    } catch {
      // 忽略写入失败
    }
  }, [settings]);

  const handleSettingsChange = useCallback((patch: Partial<SystemSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
  }, []);

  const handleSettingsReset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  // 切换地图工具
  const handleToolChange = useCallback((tool: string | null) => {
    setActiveTool(tool);
  }, []);

  // 淹没分析结果回传（来自后端接口计算）
  const handleFloodResult = useCallback((result: FloodAnalysis | null) => {
    setFloodResult(result);
  }, []);

  // 退出淹没分析时清除地图上的淹没范围
  useEffect(() => {
    if (activeTool !== 'flood') setFloodResult(null);
  }, [activeTool]);

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

  // 点击告警消息：定位到对应水库并关闭面板
  const handleAlertSelect = useCallback((alert: AlertRecord) => {
    const target = reservoirList.find(r => r.id === alert.reservoirId);
    if (target) setSelectedReservoir(target);
    setAlertPanelOpen(false);
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
        onToolChange={handleToolChange}
        alertCount={unconfirmedAlerts.length}
        onToggleAlertPanel={() => setAlertPanelOpen(prev => !prev)}
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onSettingsReset={handleSettingsReset}
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
            alerts={mapAlerts}
            selectedReservoir={selectedReservoir}
            onSelectReservoir={handleReservoirSelect}
            baseMapType={baseMapType}
            showReservoirLayer={showReservoirLayer}
            showAlertLayer={showAlertLayer}
            showBasinLayer={showBasinLayer}
            selectedTime={selectedTime}
            showScaleLine={settings.showScaleLine}
            showCoordinates={settings.showCoordinates}
            mapAnimation={settings.mapAnimation}
            alertBlink={settings.alertBlink}
            activeTool={activeTool}
            onToolChange={handleToolChange}
            floodBoundary={floodResult?.boundary ?? null}
          />

          {/* 淹没分析面板 */}
          <FloodAnalysisPanel
            open={activeTool === 'flood'}
            onClose={() => setActiveTool(null)}
            onResult={handleFloodResult}
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

      {/* 告警消息面板 */}
      <NotificationPanel
        open={alertPanelOpen}
        onOpenChange={setAlertPanelOpen}
        alerts={alertList}
        onSelectAlert={handleAlertSelect}
      />
    </div>
  );
}
