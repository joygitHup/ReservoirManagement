// 后端 API 客户端：统一信封 { code, message, data } + 分页 { list, total, page, pageSize }

import type { FloodReservoir, FloodReservoirDetail } from '@/lib/flood';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1';

interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

interface PagedData<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

async function request<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error(`无法连接后端服务（${API_BASE}），请确认后端已启动`);
  }
  if (!response.ok) {
    throw new Error(`接口请求失败（HTTP ${response.status}）`);
  }
  const body = (await response.json()) as ApiEnvelope<T>;
  if (body.code !== 0) {
    throw new Error(body.message || '接口返回异常');
  }
  return body.data;
}

/** 读取全部水库摘要（用于淹没分析选取与影响范围统计），读接口匿名可用 */
export async function fetchReservoirs(pageSize = 200): Promise<FloodReservoir[]> {
  const data = await request<PagedData<FloodReservoir>>(
    `/reservoirs/?page=1&pageSize=${pageSize}`
  );
  return data.list;
}

/** 读取水库详情（含死水位/正常蓄水位等淹没分析必需参数） */
export function fetchReservoirDetail(id: string): Promise<FloodReservoirDetail> {
  return request<FloodReservoirDetail>(`/reservoirs/${id}/`);
}
