import { area, circle, distance, point } from '@turf/turf';

/** 淹没范围要素类型（由 turf circle 的返回值推导） */
export type FloodBoundary = ReturnType<typeof circle>;

/** 后端 /api/v1/reservoirs/ 列表返回的水库摘要（淹没分析所需字段） */
export interface FloodReservoir {
  id: string;
  code: string;
  name: string;
  region: string;
  type: string;
  /** 总库容（万 m³） */
  capacity: number;
  /** 当前水位（m） */
  currentWaterLevel: number;
  /** [经度, 纬度] */
  coordinates: [number, number];
}

/** 后端 /api/v1/reservoirs/{id}/ 详情返回的附加水位参数 */
export interface FloodReservoirDetail extends FloodReservoir {
  /** 死水位（m） */
  deadWaterLevel: number;
  /** 正常蓄水位（m） */
  normalWaterLevel: number;
  /** 汛限水位（m） */
  floodLimitLevel: number;
  /** 保证水位（m） */
  guaranteeLevel: number;
}

export interface AffectedReservoir {
  id: string;
  name: string;
  /** 与淹没中心的距离（km） */
  distanceKm: number;
}

export interface FloodAnalysis {
  /** 分析水位（m） */
  waterLevel: number;
  /** 相对当前水位的涨幅（m） */
  riseM: number;
  /** 淹没半径（km） */
  radiusKm: number;
  /** 淹没面积（km²） */
  areaKm2: number;
  /** 淹没范围（GeoJSON，WGS84 经纬度） */
  boundary: FloodBoundary;
  /** 淹没范围内的水库（含本水库，distanceKm 为 0） */
  affected: AffectedReservoir[];
}

/** 淹没范围最小半径（km）：避免水位过低时生成退化几何 */
const MIN_RADIUS_KM = 0.05;

/**
 * 水位推算法（锥体概化模型）
 *
 * 项目暂无 DEM 数据，采用锥体概化近似：
 * 1. 由总库容 V 与死/正常蓄水位水位差 H 反推正常蓄水位对应的等效水面半径
 *    V = πR²H/3  =>  R = sqrt(3V / (πH))
 * 2. 库区概化为锥体，水面半径随水深线性变化，据此由分析水位推算淹没半径
 * 3. 以水库坐标为圆心生成圆形淹没范围，并统计范围内的其他水库
 */
export function computeFloodAnalysis(
  target: FloodReservoirDetail,
  allReservoirs: FloodReservoir[],
  waterLevel: number,
): FloodAnalysis {
  const depth = target.normalWaterLevel - target.deadWaterLevel;
  const volumeM3 = Math.max(target.capacity, 0) * 1e4;
  const safeDepth = depth > 0 ? depth : 1;
  const baseRadiusM = Math.sqrt((3 * volumeM3) / (Math.PI * safeDepth));

  const effectiveDepth = Math.max(waterLevel - target.deadWaterLevel, 0);
  const rawRadiusKm = depth > 0 ? (baseRadiusM * effectiveDepth) / depth / 1000 : baseRadiusM / 1000;
  const radiusKm = Math.max(rawRadiusKm, MIN_RADIUS_KM);

  const center = point(target.coordinates);
  const boundary = circle(target.coordinates, radiusKm, { units: 'kilometers' });

  const affected = allReservoirs
    .map((item) => ({
      id: item.id,
      name: item.name,
      distanceKm:
        item.id === target.id
          ? 0
          : distance(center, point(item.coordinates), { units: 'kilometers' }),
    }))
    .filter((item) => item.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return {
    waterLevel,
    riseM: waterLevel - target.currentWaterLevel,
    radiusKm,
    areaKm2: area(boundary) / 1e6,
    boundary,
    affected,
  };
}

/** 水位滑块取值范围：死水位 ~ max(正常蓄水位, 保证水位, 当前水位) + 10m */
export function getWaterLevelRange(target: FloodReservoirDetail): { min: number; max: number } {
  const max =
    Math.max(target.normalWaterLevel, target.guaranteeLevel, target.currentWaterLevel) + 10;
  const min = Math.min(target.deadWaterLevel, target.currentWaterLevel);
  return { min, max: Math.max(max, min + 1) };
}
