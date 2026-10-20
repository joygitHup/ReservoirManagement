// 测距 / 测面工具的结果类型与展示格式化

export type MeasureTool = 'measure' | 'area';

export interface MeasureResult {
  id: number;
  tool: MeasureTool;
  /** 测距为米（m），测面为平方米（m²） */
  value: number;
}

export function formatLength(meters: number): string {
  if (!Number.isFinite(meters)) return '--';
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${meters.toFixed(meters < 100 ? 1 : 0)} m`;
}

export function formatArea(squareMeters: number): string {
  if (!Number.isFinite(squareMeters)) return '--';
  const km2 = squareMeters / 1e6;
  if (km2 >= 0.01) return `${km2.toFixed(2)} km²`;
  return `${squareMeters.toFixed(0)} m²`;
}

export function formatMeasureValue(tool: MeasureTool, value: number): string {
  return tool === 'measure' ? formatLength(value) : formatArea(value);
}

export function measureToolLabel(tool: MeasureTool): string {
  return tool === 'measure' ? '距离' : '面积';
}
