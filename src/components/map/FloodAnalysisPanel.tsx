'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, RefreshCw, Waves, X } from 'lucide-react';
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
import { fetchReservoirDetail, fetchReservoirs } from '@/lib/api';
import {
  computeFloodAnalysis,
  getWaterLevelRange,
  type FloodAnalysis,
  type FloodReservoir,
  type FloodReservoirDetail,
} from '@/lib/flood';

interface FloodAnalysisPanelProps {
  open: boolean;
  onClose: () => void;
  onResult: (result: FloodAnalysis | null) => void;
}

export function FloodAnalysisPanel({ open, onClose, onResult }: FloodAnalysisPanelProps) {
  const [reservoirs, setReservoirs] = useState<FloodReservoir[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<FloodReservoirDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [waterLevel, setWaterLevel] = useState(0);
  const listRequestedRef = useRef(false);

  // 加载水库列表（后端 API，仅首次打开时请求）
  const loadReservoirs = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const list = await fetchReservoirs();
      setReservoirs(list);
      setSelectedId((prev) => prev || list[0]?.id || '');
    } catch (error) {
      setListError(error instanceof Error ? error.message : '水库列表加载失败');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || listRequestedRef.current) return;
    listRequestedRef.current = true;
    void loadReservoirs();
  }, [open, loadReservoirs]);

  // 选中水库后加载详情（含死水位 / 正常蓄水位等推算参数）
  useEffect(() => {
    if (!open || !selectedId) return;
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);

    fetchReservoirDetail(selectedId)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setWaterLevel(data.currentWaterLevel);
        const fly = (
          window as unknown as {
            mapFlyTo?: (lon: number, lat: number, zoom?: number) => void;
          }
        ).mapFlyTo;
        fly?.(data.coordinates[0], data.coordinates[1], 9);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setDetail(null);
        setDetailError(error instanceof Error ? error.message : '水库详情加载失败');
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, selectedId]);

  const range = useMemo(
    () => (detail ? getWaterLevelRange(detail) : { min: 0, max: 100 }),
    [detail]
  );

  const analysis = useMemo(
    () => (detail ? computeFloodAnalysis(detail, reservoirs, waterLevel) : null),
    [detail, reservoirs, waterLevel]
  );

  // 把淹没范围回传给地图渲染
  useEffect(() => {
    if (!open) return;
    onResult(analysis);
  }, [open, analysis, onResult]);

  if (!open) return null;

  return (
    <div className="absolute top-[48px] left-3 z-20 w-[284px] rounded-lg border border-blue-500/20 bg-[rgba(15,29,50,0.92)] backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between px-3 py-2 border-b border-blue-500/10">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Waves className="w-4 h-4 text-cyan-400" />
          淹没分析
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors"
          aria-label="关闭淹没分析"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-3 py-3 space-y-3">
        {/* 水库选择 */}
        {listError ? (
          <div className="space-y-2">
            <p className="text-xs text-red-400">{listError}</p>
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80"
              onClick={() => void loadReservoirs()}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              重试
            </Button>
          </div>
        ) : (
          <Select value={selectedId} onValueChange={setSelectedId} disabled={listLoading}>
            <SelectTrigger className="h-8 text-xs bg-slate-800/50 border-slate-700 text-slate-300">
              <SelectValue placeholder={listLoading ? '加载中…' : '选择水库'} />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 text-slate-200 max-h-64">
              {reservoirs.map((item) => (
                <SelectItem key={item.id} value={item.id} className="text-xs">
                  {item.name}（{item.region}）
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {detailLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            正在读取水库参数…
          </div>
        )}

        {detailError && !detailLoading && (
          <p className="text-xs text-red-400">{detailError}</p>
        )}

        {detail && !detailLoading && analysis && (
          <>
            {/* 基础参数 */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded bg-slate-800/40 py-1.5">
                <div className="text-[10px] text-slate-500">当前水位</div>
                <div className="text-xs font-mono text-slate-200">
                  {detail.currentWaterLevel.toFixed(2)}m
                </div>
              </div>
              <div className="rounded bg-slate-800/40 py-1.5">
                <div className="text-[10px] text-slate-500">正常蓄水位</div>
                <div className="text-xs font-mono text-slate-200">
                  {detail.normalWaterLevel.toFixed(2)}m
                </div>
              </div>
              <div className="rounded bg-slate-800/40 py-1.5">
                <div className="text-[10px] text-slate-500">总库容</div>
                <div className="text-xs font-mono text-slate-200">
                  {detail.capacity.toFixed(0)}万m³
                </div>
              </div>
            </div>

            {/* 水位滑块 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">分析水位</span>
                <span className="font-mono text-cyan-300">
                  {waterLevel.toFixed(2)} m
                  <span
                    className={`ml-1.5 ${analysis.riseM > 0 ? 'text-red-400' : 'text-slate-500'}`}
                  >
                    {analysis.riseM >= 0 ? '+' : ''}
                    {analysis.riseM.toFixed(2)}
                  </span>
                </span>
              </div>
              <Slider
                min={range.min}
                max={range.max}
                step={0.1}
                value={[waterLevel]}
                onValueChange={(values) => setWaterLevel(values[0])}
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>死水位 {range.min.toFixed(1)}m</span>
                <span>上限 {range.max.toFixed(1)}m</span>
              </div>
            </div>

            {/* 分析结果 */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded bg-cyan-500/10 border border-cyan-500/20 py-1.5">
                <div className="text-[10px] text-slate-500">淹没半径</div>
                <div className="text-xs font-mono text-cyan-300">
                  {analysis.radiusKm.toFixed(2)}km
                </div>
              </div>
              <div className="rounded bg-cyan-500/10 border border-cyan-500/20 py-1.5">
                <div className="text-[10px] text-slate-500">淹没面积</div>
                <div className="text-xs font-mono text-cyan-300">
                  {analysis.areaKm2.toFixed(2)}km²
                </div>
              </div>
              <div className="rounded bg-red-500/10 border border-red-500/20 py-1.5">
                <div className="text-[10px] text-slate-500">影响水库</div>
                <div className="text-xs font-mono text-red-400">
                  {analysis.affected.length}座
                </div>
              </div>
            </div>

            {/* 受影响水库清单 */}
            <div className="space-y-1">
              <div className="text-[10px] text-slate-500">淹没范围内水库</div>
              <ul className="max-h-28 overflow-y-auto space-y-1">
                {analysis.affected.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between text-xs text-slate-300"
                  >
                    <span className="truncate mr-2">{item.name}</span>
                    <Badge
                      className={`text-[10px] border ${
                        item.distanceKm === 0
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : 'bg-slate-700/40 text-slate-400 border-slate-600/40'
                      }`}
                    >
                      {item.distanceKm === 0 ? '本水库' : `${item.distanceKm.toFixed(1)}km`}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-[10px] leading-relaxed text-slate-500">
              采用锥体概化的水位推算法：由库容与死/正常蓄水位差反推水面半径，再按分析水位推算淹没范围（未叠加 DEM 精算）。
            </p>
          </>
        )}
      </div>
    </div>
  );
}
