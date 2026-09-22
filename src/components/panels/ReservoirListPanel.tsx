'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, ChevronRight, Droplets, AlertTriangle, Activity, Wifi, WifiOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { Reservoir, ReservoirStatus } from '@/data/reservoirs';

interface ReservoirListPanelProps {
  reservoirs: Reservoir[];
  selectedReservoir: Reservoir | null;
  onSelect: (reservoir: Reservoir) => void;
  totalCount: number;
  normalCount: number;
  warningCount: number;
  dangerCount: number;
  offlineCount: number;
}

const statusConfig: Record<ReservoirStatus, { label: string; color: string; bgColor: string }> = {
  normal: { label: '正常', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  warning: { label: '预警', color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  danger: { label: '告警', color: 'text-red-400', bgColor: 'bg-red-500/10' },
  offline: { label: '离线', color: 'text-slate-400', bgColor: 'bg-slate-500/10' },
};

const regions = ['全部区域', '华东', '华中', '华北', '东北', '西北', '西南', '华南'];
const types = ['全部类型', '大型水库', '中型水库', '小型水库'];
const statusFilters = [
  { value: 'all', label: '全部状态' },
  { value: 'normal', label: '正常' },
  { value: 'warning', label: '预警' },
  { value: 'danger', label: '告警' },
  { value: 'offline', label: '离线' },
];

export function ReservoirListPanel({
  reservoirs,
  selectedReservoir,
  onSelect,
  totalCount,
  normalCount,
  warningCount,
  dangerCount,
  offlineCount,
}: ReservoirListPanelProps) {
  const [searchText, setSearchText] = useState('');
  const [regionFilter, setRegionFilter] = useState('全部区域');
  const [typeFilter, setTypeFilter] = useState('全部类型');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredReservoirs = useMemo(() => {
    return reservoirs.filter((r) => {
      if (searchText && !r.name.includes(searchText) && !r.location.includes(searchText)) {
        return false;
      }
      if (regionFilter !== '全部区域' && r.region !== regionFilter) {
        return false;
      }
      if (typeFilter !== '全部类型' && r.type !== typeFilter) {
        return false;
      }
      if (statusFilter !== 'all' && r.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [reservoirs, searchText, regionFilter, typeFilter, statusFilter]);

  const handleItemClick = (reservoir: Reservoir) => {
    onSelect(reservoir);
    // 调用地图定位
    if (typeof window !== 'undefined' && (window as unknown as { mapFlyTo?: (lon: number, lat: number, zoom?: number) => void }).mapFlyTo) {
      (window as unknown as { mapFlyTo: (lon: number, lat: number, zoom?: number) => void }).mapFlyTo(
        reservoir.coordinates[0],
        reservoir.coordinates[1],
        10
      );
    }
  };

  return (
    <div className="h-full flex flex-col bg-[rgba(10,22,40,0.92)] backdrop-blur-md border-r border-blue-500/10">
      {/* 头部 */}
      <div className="p-4 border-b border-blue-500/10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Droplets className="w-5 h-5 text-cyan-400" />
            水库列表
          </h2>
          <Badge variant="outline" className="text-xs font-mono text-slate-400 border-slate-600">
            {filteredReservoirs.length} / {totalCount}
          </Badge>
        </div>

        {/* 状态概览 */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-400 tabular-nums">{normalCount}</div>
            <div className="text-[10px] text-slate-500">正常</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-amber-400 tabular-nums">{warningCount}</div>
            <div className="text-[10px] text-slate-500">预警</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-400 tabular-nums">{dangerCount}</div>
            <div className="text-[10px] text-slate-500">告警</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-slate-400 tabular-nums">{offlineCount}</div>
            <div className="text-[10px] text-slate-500">离线</div>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="搜索水库名称或位置..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9 h-9 bg-slate-800/50 border-slate-700 text-sm text-slate-200 placeholder:text-slate-500 focus:border-blue-500/50"
          />
        </div>

        {/* 筛选按钮 */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 justify-start text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 text-xs"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-3.5 h-3.5 mr-2" />
          筛选条件
          <ChevronRight className={`w-3.5 h-3.5 ml-auto transition-transform ${showFilters ? 'rotate-90' : ''}`} />
        </Button>

        {/* 筛选面板 */}
        {showFilters && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="h-8 text-xs bg-slate-800/50 border-slate-700 text-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                  {regions.map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 text-xs bg-slate-800/50 border-slate-700 text-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                  {types.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs bg-slate-800/50 border-slate-700 text-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                  {statusFilters.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <Separator className="bg-blue-500/10" />

      {/* 水库列表 */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredReservoirs.map((reservoir) => {
            const isSelected = selectedReservoir?.id === reservoir.id;
            const status = statusConfig[reservoir.status];
            return (
              <div
                key={reservoir.id}
                className={`p-3 rounded-lg cursor-pointer transition-all duration-200 group ${
                  isSelected
                    ? 'bg-blue-500/20 border border-blue-500/40'
                    : 'bg-transparent hover:bg-slate-800/50 border border-transparent'
                }`}
                onClick={() => handleItemClick(reservoir)}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        reservoir.status === 'danger' ? 'bg-red-500 animate-pulse' :
                        reservoir.status === 'warning' ? 'bg-amber-500' :
                        reservoir.status === 'normal' ? 'bg-emerald-500' :
                        'bg-slate-500'
                      }`}
                    />
                    <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                      {reservoir.name}
                    </span>
                  </div>
                  <Badge className={`text-[10px] px-1.5 py-0 ${status.bgColor} ${status.color} border-0`}>
                    {status.label}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 mb-2 ml-4.5">
                  {reservoir.location}
                </div>
                <div className="flex items-center justify-between text-xs ml-4.5">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Activity className="w-3 h-3 text-cyan-500" />
                      <span className="font-mono tabular-nums">{reservoir.currentWaterLevel.toFixed(2)}m</span>
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      {reservoir.deviceStatus === 'online' ? (
                        <><Wifi className="w-3 h-3 text-emerald-500" /><span>在线</span></>
                      ) : (
                        <><WifiOff className="w-3 h-3 text-slate-500" /><span>离线</span></>
                      )}
                    </span>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-blue-400 translate-x-0' : 'text-slate-600 -translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0'}`} />
                </div>
              </div>
            );
          })}
          {filteredReservoirs.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              未找到匹配的水库
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
