'use client';

import { useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  XCircle,
  AlertTriangle,
  Activity,
  Clock,
  Clock3,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import type { AlertRecord } from '@/data/reservoirs';

interface NotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alerts: AlertRecord[];
  onSelectAlert: (alert: AlertRecord) => void;
}

function formatTime(isoString: string) {
  const date = new Date(isoString);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

function AlertIcon({ type, level }: { type: string; level: string }) {
  if (level === 'danger') return <XCircle className="w-4 h-4 text-red-400" />;
  if (type === 'device_offline') return <Activity className="w-4 h-4 text-slate-400" />;
  return <AlertTriangle className="w-4 h-4 text-amber-400" />;
}

function statusMeta(status: string) {
  switch (status) {
    case 'unconfirmed':
      return { icon: <Clock3 className="w-3.5 h-3.5 text-amber-400" />, text: '未确认' };
    case 'processing':
      return { icon: <Clock className="w-3.5 h-3.5 text-blue-400" />, text: '处理中' };
    case 'resolved':
      return { icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />, text: '已解决' };
    default:
      return { icon: null, text: status };
  }
}

function typeText(type: string) {
  if (type === 'water_level') return '水位超限';
  if (type === 'device_offline') return '设备离线';
  if (type === 'rainfall') return '雨量异常';
  return '数据异常';
}

export function NotificationPanel({
  open,
  onOpenChange,
  alerts,
  onSelectAlert,
}: NotificationPanelProps) {
  const sortedAlerts = useMemo(
    () => [...alerts].sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime()),
    [alerts]
  );
  const unconfirmedCount = alerts.filter((a) => a.status === 'unconfirmed').length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[360px] sm:max-w-[360px] bg-[#0f1d32] border-l border-blue-500/20 p-0 gap-0"
      >
        <SheetHeader className="px-4 py-3 pr-12 border-b border-blue-500/10 gap-1">
          <SheetTitle className="flex items-center gap-2 text-white text-sm">
            <Bell className="w-4 h-4 text-cyan-400" />
            告警消息
            {unconfirmedCount > 0 && (
              <Badge className="h-4 min-w-4 px-1 text-[10px] bg-red-500 text-white border-0">
                {unconfirmedCount}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription className="text-xs text-slate-500">
            共 {alerts.length} 条告警，点击任意一条可在地图上定位对应水库
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {sortedAlerts.map((alert) => {
              const status = statusMeta(alert.status);
              return (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => onSelectAlert(alert)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-slate-800/40 cursor-pointer ${
                    alert.level === 'danger'
                      ? 'bg-red-500/5 border-red-500/20'
                      : 'bg-amber-500/5 border-amber-500/20'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">
                      <AlertIcon type={alert.type} level={alert.level} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-200 truncate">
                          {alert.reservoirName}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] flex-shrink-0 ml-2">
                          {status.icon}
                          <span className="text-slate-400">{status.text}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mb-1.5 line-clamp-2">{alert.message}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>{typeText(alert.type)}</span>
                        <span className="flex items-center gap-1">
                          {formatTime(alert.createTime)}
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            {sortedAlerts.length === 0 && (
              <div className="text-center py-16 text-slate-500 text-sm">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                暂无告警消息
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
