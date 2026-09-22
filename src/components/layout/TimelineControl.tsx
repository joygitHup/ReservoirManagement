'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TimelineControlProps {
  selectedTime: Date;
  onTimeChange: (time: Date) => void;
  timeRange: '1h' | '24h' | '7d';
  onTimeRangeChange: (range: '1h' | '24h' | '7d') => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

const rangeConfig = {
  '1h': { label: '1小时', totalSeconds: 3600, step: 60, format: 'HH:mm:ss' },
  '24h': { label: '24小时', totalSeconds: 86400, step: 1800, format: 'MM-DD HH:mm' },
  '7d': { label: '7天', totalSeconds: 604800, step: 21600, format: 'MM-DD' },
};

function formatDateTime(date: Date, format: string) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return format
    .replace('YYYY', String(date.getFullYear()))
    .replace('MM', pad(date.getMonth() + 1))
    .replace('DD', pad(date.getDate()))
    .replace('HH', pad(date.getHours()))
    .replace('mm', pad(date.getMinutes()))
    .replace('ss', pad(date.getSeconds()));
}

export function TimelineControl({
  selectedTime,
  onTimeChange,
  timeRange,
  onTimeRangeChange,
  isPlaying,
  onTogglePlay,
}: TimelineControlProps) {
  const config = rangeConfig[timeRange];
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const startTime = now ? now - config.totalSeconds * 1000 : 0;
  const endTime = now || 0;

  // 当前时间在时间轴上的位置（百分比）
  const currentProgress = endTime > startTime
    ? ((selectedTime.getTime() - startTime) / (endTime - startTime)) * 100
    : 100;

  // 生成刻度点
  const ticks = useMemo(() => {
    if (!now) return [];
    const count = 6;
    const result = [];
    for (let i = 0; i <= count; i++) {
      const time = new Date(startTime + (endTime - startTime) * (i / count));
      result.push({
        value: i / count * 100,
        label: formatDateTime(time, config.format),
      });
    }
    return result;
  }, [startTime, endTime, config.format, now]);

  const handleSliderChange = useCallback((value: number[]) => {
    if (!now) return;
    const progress = value[0];
    const time = new Date(startTime + (endTime - startTime) * (progress / 100));
    onTimeChange(time);
  }, [startTime, endTime, now, onTimeChange]);

  const skipBack = () => {
    if (!now) return;
    const newTime = new Date(selectedTime.getTime() - config.step * 1000);
    if (newTime.getTime() >= startTime) {
      onTimeChange(newTime);
    }
  };

  const skipForward = () => {
    if (!now) return;
    const newTime = new Date(selectedTime.getTime() + config.step * 1000);
    if (newTime.getTime() <= endTime) {
      onTimeChange(newTime);
    }
  };

  const goToRealtime = () => {
    onTimeChange(new Date());
  };

  return (
    <div className="h-20 bg-[rgba(10,22,40,0.95)] backdrop-blur-md border-t border-blue-500/10 flex items-center px-4 gap-4">
      {/* 时间范围选择 */}
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-cyan-400" />
        <Select value={timeRange} onValueChange={(v) => onTimeRangeChange(v as '1h' | '24h' | '7d')}>
          <SelectTrigger className="h-8 w-24 text-xs bg-slate-800/50 border-slate-700 text-slate-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
            <SelectItem value="1h" className="text-xs">最近1小时</SelectItem>
            <SelectItem value="24h" className="text-xs">最近24小时</SelectItem>
            <SelectItem value="7d" className="text-xs">最近7天</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 播放控制 */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
          onClick={skipBack}
        >
          <SkipBack className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`h-9 w-9 rounded-full ${
            isPlaying
              ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
          onClick={onTogglePlay}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
          onClick={skipForward}
        >
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>

      {/* 时间轴滑块 */}
      <div className="flex-1 flex flex-col justify-center gap-1.5">
        <Slider
          value={[currentProgress]}
          onValueChange={handleSliderChange}
          max={100}
          step={0.1}
          className="w-full"
        />
        {/* 刻度 */}
        <div className="flex justify-between text-[10px] text-slate-500 font-mono tabular-nums">
          {ticks.map((tick, index) => (
            <span key={index}>{tick.label}</span>
          ))}
        </div>
      </div>

      {/* 当前时间显示 */}
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-sm font-mono tabular-nums text-cyan-400">
            {formatDateTime(selectedTime, 'YYYY-MM-DD HH:mm:ss')}
          </span>
        </div>
        <Badge
          variant="outline"
          className="text-[10px] mt-1 cursor-pointer h-4 px-2 border-cyan-500/30 text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10"
          onClick={goToRealtime}
        >
          实时
        </Badge>
      </div>
    </div>
  );
}
