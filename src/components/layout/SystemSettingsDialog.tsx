'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Map as MapIcon,
  Ruler,
  Crosshair,
  Sparkles,
  AlertTriangle,
  BellRing,
  Info,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';

/** 系统设置项 */
export interface SystemSettings {
  /** 显示比例尺 */
  showScaleLine: boolean;
  /** 显示鼠标经纬度坐标 */
  showCoordinates: boolean;
  /** 定位动画（点击水库时平滑飞行） */
  mapAnimation: boolean;
  /** 告警点位闪烁 */
  alertBlink: boolean;
  /** 地图仅标注未确认告警 */
  onlyUnconfirmedAlert: boolean;
}

/** 默认设置 */
export const DEFAULT_SETTINGS: SystemSettings = {
  showScaleLine: true,
  showCoordinates: false,
  mapAnimation: true,
  alertBlink: true,
  onlyUnconfirmedAlert: false,
};

interface SettingRowProps {
  icon: LucideIcon;
  title: string;
  desc: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function SettingRow({ icon: Icon, title, desc, checked, onCheckedChange }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="min-w-0">
          <div className="text-sm text-slate-200">{title}</div>
          <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="data-[state=checked]:bg-cyan-500 flex-shrink-0"
      />
    </div>
  );
}

function SectionTitle({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-1 text-xs font-medium text-slate-400">
      <Icon className="w-3.5 h-3.5 text-blue-400" />
      {text}
    </div>
  );
}

interface SystemSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: SystemSettings;
  onChange: (patch: Partial<SystemSettings>) => void;
  onReset: () => void;
}

export function SystemSettingsDialog({
  open,
  onOpenChange,
  settings,
  onChange,
  onReset,
}: SystemSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f1d32] border border-blue-500/20 text-slate-200 max-w-[520px] p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-blue-500/10">
          <DialogTitle className="flex items-center gap-2 text-white text-base">
            <Settings className="w-4 h-4 text-cyan-400" />
            系统设置
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            调整地图显示与告警提醒等偏好，修改后自动保存到本地。
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2 max-h-[60vh] overflow-y-auto">
          {/* 地图显示 */}
          <SectionTitle icon={MapIcon} text="地图显示" />
          <SettingRow
            icon={Ruler}
            title="显示比例尺"
            desc="在地图左下角显示当前缩放比例"
            checked={settings.showScaleLine}
            onCheckedChange={(v) => onChange({ showScaleLine: v })}
          />
          <SettingRow
            icon={Crosshair}
            title="显示鼠标坐标"
            desc="跟随鼠标显示经纬度坐标"
            checked={settings.showCoordinates}
            onCheckedChange={(v) => onChange({ showCoordinates: v })}
          />
          <SettingRow
            icon={Sparkles}
            title="定位动画"
            desc="点击水库时使用平滑飞行动画定位"
            checked={settings.mapAnimation}
            onCheckedChange={(v) => onChange({ mapAnimation: v })}
          />

          <Separator className="my-2 bg-blue-500/10" />

          {/* 告警提醒 */}
          <SectionTitle icon={AlertTriangle} text="告警提醒" />
          <SettingRow
            icon={BellRing}
            title="告警点闪烁"
            desc="存在告警的水库点位持续闪烁提示"
            checked={settings.alertBlink}
            onCheckedChange={(v) => onChange({ alertBlink: v })}
          />
          <SettingRow
            icon={AlertTriangle}
            title="仅显示未确认告警"
            desc="地图上仅标注未确认状态的告警水库"
            checked={settings.onlyUnconfirmedAlert}
            onCheckedChange={(v) => onChange({ onlyUnconfirmedAlert: v })}
          />

          <Separator className="my-2 bg-blue-500/10" />

          {/* 关于系统 */}
          <SectionTitle icon={Info} text="关于系统" />
          <div className="py-2 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">系统版本</span>
              <span className="text-slate-300">v1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">前端技术</span>
              <span className="text-slate-300">Next.js 16 · React 19 · OpenLayers 10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">后端服务</span>
              <span className="text-slate-300">Django 5 · DRF</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">底图服务</span>
              <span className="text-slate-300">天地图 / 高德地图</span>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-blue-500/10 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white hover:bg-slate-800/80"
            onClick={onReset}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-2" />
            恢复默认
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-500 text-white"
            onClick={() => onOpenChange(false)}
          >
            完成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
