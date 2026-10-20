'use client';

import { Ruler, Trash2, X, Triangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  formatMeasureValue,
  type MeasureResult,
  type MeasureTool,
} from '@/lib/measure';

interface MeasurePanelProps {
  /** 当前激活的工具；为 null 表示仅展示已有测量结果 */
  activeTool: MeasureTool | null;
  items: MeasureResult[];
  onClear: () => void;
  onExit: () => void;
}

export function MeasurePanel({ activeTool, items, onClear, onExit }: MeasurePanelProps) {
  const lastTool = items[items.length - 1]?.tool ?? 'measure';
  const tool = activeTool ?? lastTool;
  const isArea = tool === 'area';

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[260px] rounded-lg border border-cyan-500/25 bg-[rgba(15,29,50,0.92)] backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between px-3 py-2 border-b border-blue-500/10">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
          {isArea ? (
            <Triangle className="w-4 h-4 text-cyan-400" />
          ) : (
            <Ruler className="w-4 h-4 text-cyan-400" />
          )}
          {isArea ? '测面' : '测距'}
        </span>
        <button
          type="button"
          onClick={onExit}
          className="text-slate-400 hover:text-white transition-colors"
          aria-label="退出测量工具"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-3 py-2 space-y-2">
        {activeTool && items.length === 0 && (
          <p className="text-xs text-slate-500">
            单击地图添加节点，双击结束绘制；可连续绘制多段。
          </p>
        )}

        {items.length > 0 && (
          <ul className="max-h-40 overflow-y-auto space-y-1">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="flex items-center justify-between text-xs text-slate-300"
              >
                <span className="text-slate-500">#{index + 1}</span>
                <span className="font-mono tabular-nums text-cyan-300">
                  {formatMeasureValue(item.tool, item.value)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10"
            onClick={onClear}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            清除全部结果
          </Button>
        )}

        {activeTool && items.length > 0 && (
          <p className="text-[10px] text-slate-500">继续单击地图可绘制下一段</p>
        )}
      </div>
    </div>
  );
}
