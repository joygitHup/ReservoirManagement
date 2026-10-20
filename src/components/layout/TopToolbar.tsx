'use client';

import { useState } from 'react';
import {
  Layers,
  Map,
  Maximize,
  Minimize,
  Ruler,
  Triangle,
  AlertTriangle,
  Droplets,
  Settings,
  Bell,
  MapPin,
  Eye,
  EyeOff,
  Waves,
  Activity,
  Thermometer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { baseMapConfigs } from '@/components/map/MapView';
import { SystemSettingsDialog, type SystemSettings } from '@/components/layout/SystemSettingsDialog';

interface ToolbarProps {
  baseMapType: string;
  onBaseMapChange: (type: string) => void;
  showReservoirLayer: boolean;
  onToggleReservoirLayer: () => void;
  showAlertLayer: boolean;
  onToggleAlertLayer: boolean;
  showBasinLayer: boolean;
  onToggleBasinLayer: () => void;
  activeTool: string | null;
  onToolChange: (tool: string | null) => void;
  alertCount: number;
  onToggleAlertPanel: () => void;
  settings: SystemSettings;
  onSettingsChange: (patch: Partial<SystemSettings>) => void;
  onSettingsReset: () => void;
}

const layerOptions = [
  { id: 'reservoir', label: '水库点位', icon: Droplets },
  { id: 'alert', label: '告警标记', icon: AlertTriangle },
  { id: 'basin', label: '流域边界', icon: Waves },
  { id: 'station', label: '监测站点', icon: Activity },
  { id: 'rainfall', label: '雨量分布', icon: Thermometer },
];

export function TopToolbar({
  baseMapType,
  onBaseMapChange,
  showReservoirLayer,
  onToggleReservoirLayer,
  showAlertLayer,
  onToggleAlertLayer,
  showBasinLayer,
  onToggleBasinLayer,
  activeTool,
  onToolChange,
  alertCount,
  onToggleAlertPanel,
  settings,
  onSettingsChange,
  onSettingsReset,
}: ToolbarProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getBaseMapLabel = () => {
    return baseMapConfigs[baseMapType]?.label || '天地图矢量';
  };

  return (
    <TooltipProvider delayDuration={200}>
      <header className="h-14 bg-[rgba(10,22,40,0.95)] backdrop-blur-md border-b border-blue-500/10 flex items-center justify-between px-4 z-50">
        {/* Logo 和标题 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">智慧水库综合管理系统</h1>
              <p className="text-[10px] text-slate-500 -mt-0.5">Reservoir Management System</p>
            </div>
          </div>
        </div>

        {/* 中间工具栏 */}
        <div className="flex items-center gap-1">
          {/* 底图切换 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 text-slate-300 hover:text-white hover:bg-slate-800/80">
                <Map className="w-4 h-4 mr-2" />
                {getBaseMapLabel()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44 bg-slate-800 border-slate-700 text-slate-200">
              <DropdownMenuLabel className="text-xs text-slate-500">底图选择</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-700/50" />
              {Object.entries(baseMapConfigs).map(([key, config]) => (
                <DropdownMenuItem
                  key={key}
                  className="text-sm cursor-pointer focus:bg-slate-700"
                  onClick={() => onBaseMapChange(key)}
                >
                  {config.label}
                  {baseMapType === key && (
                    <span className="ml-auto text-cyan-400">✓</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-5 bg-slate-700 mx-1" />

          {/* 图层控制 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 text-slate-300 hover:text-white hover:bg-slate-800/80">
                <Layers className="w-4 h-4 mr-2" />
                图层控制
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44 bg-slate-800 border-slate-700 text-slate-200">
              <DropdownMenuLabel className="text-xs text-slate-500">业务图层</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-700/50" />
              <DropdownMenuCheckboxItem
                className="cursor-pointer focus:bg-slate-700"
                checked={showReservoirLayer}
                onCheckedChange={onToggleReservoirLayer}
              >
                <Droplets className="w-3.5 h-3.5 mr-2 text-cyan-400" />
                水库点位
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                className="cursor-pointer focus:bg-slate-700"
                checked={showAlertLayer}
                onCheckedChange={() => {}}
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-2 text-red-400" />
                告警标记
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                className="cursor-pointer focus:bg-slate-700"
                checked={showBasinLayer}
                onCheckedChange={onToggleBasinLayer}
              >
                <Waves className="w-3.5 h-3.5 mr-2 text-blue-400" />
                流域边界
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-5 bg-slate-700 mx-1" />

          {/* 工具 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-9 ${activeTool === 'measure' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-300 hover:text-white hover:bg-slate-800/80'}`}
                onClick={() => onToolChange(activeTool === 'measure' ? null : 'measure')}
              >
                <Ruler className="w-4 h-4 mr-2" />
                测距
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-800 border-slate-700 text-slate-200">
              <p>距离测量工具</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-9 ${activeTool === 'area' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-300 hover:text-white hover:bg-slate-800/80'}`}
                onClick={() => onToolChange(activeTool === 'area' ? null : 'area')}
              >
                <Triangle className="w-4 h-4 mr-2" />
                测面
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-800 border-slate-700 text-slate-200">
              <p>面积测量工具</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-9 ${activeTool === 'flood' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-300 hover:text-white hover:bg-slate-800/80'}`}
                onClick={() => onToolChange(activeTool === 'flood' ? null : 'flood')}
              >
                <Waves className="w-4 h-4 mr-2" />
                淹没分析
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-800 border-slate-700 text-slate-200">
              <p>水库淹没分析</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* 右侧工具 */}
        <div className="flex items-center gap-1">
          {/* 告警通知 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-slate-300 hover:text-white hover:bg-slate-800/80 relative"
                onClick={onToggleAlertPanel}
              >
                <Bell className="w-4 h-4" />
                {alertCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-red-500 text-white border-0">
                    {alertCount}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-800 border-slate-700 text-slate-200">
              <p>告警通知</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-slate-300 hover:text-white hover:bg-slate-800/80"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-800 border-slate-700 text-slate-200">
              <p>{isFullscreen ? '退出全屏' : '全屏显示'}</p>
            </TooltipContent>
          </Tooltip>

          <div className="w-px h-5 bg-slate-700 mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-slate-300 hover:text-white hover:bg-slate-800/80"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-800 border-slate-700 text-slate-200">
              <p>系统设置</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      {/* 系统设置弹窗 */}
      <SystemSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onChange={onSettingsChange}
        onReset={onSettingsReset}
      />
    </TooltipProvider>
  );
}
