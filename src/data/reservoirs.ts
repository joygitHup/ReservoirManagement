// 水库数据类型定义
export type ReservoirStatus = 'normal' | 'warning' | 'danger' | 'offline';

export interface Reservoir {
  id: string;
  name: string;
  location: string;
  region: string;
  type: string; // 大型/中型/小型
  capacity: number; // 总库容 (万m³)
  deadWaterLevel: number; // 死水位 (m)
  normalWaterLevel: number; // 正常蓄水位 (m)
  floodLimitLevel: number; // 汛限水位 (m)
  warningLevel: number; // 警戒水位 (m)
  guaranteeLevel: number; // 保证水位 (m)
  currentWaterLevel: number; // 当前水位 (m)
  currentStorage: number; // 当前库容 (万m³)
  inflow: number; // 入库流量 (m³/s)
  outflow: number; // 出库流量 (m³/s)
  rainfall: number; // 降雨量 (mm)
  deviceStatus: 'online' | 'offline';
  status: ReservoirStatus;
  updateTime: string;
  coordinates: [number, number]; // [lon, lat]
  responsiblePerson: string;
  phone: string;
  description: string;
}

export interface AlertRecord {
  id: string;
  reservoirId: string;
  reservoirName: string;
  type: 'water_level' | 'device_offline' | 'data_abnormal' | 'rainfall';
  level: 'warning' | 'danger';
  value: number;
  threshold: number;
  unit: string;
  message: string;
  status: 'unconfirmed' | 'processing' | 'resolved';
  createTime: string;
  confirmTime?: string;
  resolveTime?: string;
  handler?: string;
}

export interface HistoryDataPoint {
  time: string;
  waterLevel: number;
  storage: number;
  inflow: number;
  outflow: number;
  rainfall: number;
}

// 生成模拟水库数据
const reservoirNames = [
  { name: '新安江水库', location: '浙江省杭州市建德市', region: '华东', coords: [119.05, 29.48] },
  { name: '丹江口水库', location: '湖北省十堰市丹江口市', region: '华中', coords: [111.15, 32.55] },
  { name: '三峡水库', location: '湖北省宜昌市', region: '华中', coords: [110.75, 30.83] },
  { name: '小浪底水库', location: '河南省济源市', region: '华北', coords: [112.35, 34.92] },
  { name: '密云水库', location: '北京市密云区', region: '华北', coords: [116.85, 40.48] },
  { name: '千岛湖水库', location: '浙江省杭州市淳安县', region: '华东', coords: [118.88, 29.61] },
  { name: '丰满水库', location: '吉林省吉林市', region: '东北', coords: [126.55, 43.73] },
  { name: '白山水库', location: '吉林省桦甸市', region: '东北', coords: [127.28, 42.75] },
  { name: '龙羊峡水库', location: '青海省海南州共和县', region: '西北', coords: [100.95, 36.12] },
  { name: '刘家峡水库', location: '甘肃省临夏州永靖县', region: '西北', coords: [103.32, 35.95] },
  { name: '二滩水库', location: '四川省攀枝花市', region: '西南', coords: [101.65, 26.83] },
  { name: '隔河岩水库', location: '湖北省宜昌市长阳县', region: '华中', coords: [111.02, 30.47] },
  { name: '柘溪水库', location: '湖南省益阳市安化县', region: '华中', coords: [111.05, 28.35] },
  { name: '新丰江水库', location: '广东省河源市', region: '华南', coords: [114.32, 23.73] },
  { name: '枫树坝水库', location: '广东省河源市龙川县', region: '华南', coords: [115.33, 24.32] },
  { name: '岩滩水库', location: '广西河池市大化县', region: '华南', coords: [107.82, 23.85] },
  { name: '天生桥水库', location: '贵州省黔西南州', region: '西南', coords: [105.02, 24.78] },
  { name: '漫湾水库', location: '云南省临沧市', region: '西南', coords: [100.18, 24.47] },
  { name: '陈村水库', location: '安徽省宣城市泾县', region: '华东', coords: [117.85, 30.52] },
  { name: '花凉亭水库', location: '安徽省安庆市太湖县', region: '华东', coords: [116.12, 30.38] },
];

function calcStatus(currentLevel: number, warningLevel: number, guaranteeLevel: number): ReservoirStatus {
  if (currentLevel >= guaranteeLevel) return 'danger';
  if (currentLevel >= warningLevel) return 'warning';
  return 'normal';
}

export const reservoirList: Reservoir[] = reservoirNames.map((item, index) => {
  const normalLevel = 90 + Math.random() * 60;
  const warningLevel = normalLevel + 2 + Math.random() * 3;
  const guaranteeLevel = warningLevel + 1 + Math.random() * 2;
  const currentLevel = normalLevel - 5 + Math.random() * 12;
  const isOffline = Math.random() < 0.1;
  
  return {
    id: `RSV-${String(index + 1).padStart(4, '0')}`,
    name: item.name,
    location: item.location,
    region: item.region,
    type: index < 8 ? '大型水库' : index < 15 ? '中型水库' : '小型水库',
    capacity: Math.floor(10000 + Math.random() * 200000),
    deadWaterLevel: Math.floor(normalLevel - 20 - Math.random() * 10),
    normalWaterLevel: Math.round(normalLevel * 100) / 100,
    floodLimitLevel: Math.round((normalLevel - 3 - Math.random() * 5) * 100) / 100,
    warningLevel: Math.round(warningLevel * 100) / 100,
    guaranteeLevel: Math.round(guaranteeLevel * 100) / 100,
    currentWaterLevel: isOffline ? Math.round(normalLevel * 100) / 100 : Math.round(currentLevel * 100) / 100,
    currentStorage: Math.floor(5000 + Math.random() * 150000),
    inflow: Math.round((50 + Math.random() * 500) * 100) / 100,
    outflow: Math.round((30 + Math.random() * 400) * 100) / 100,
    rainfall: Math.round(Math.random() * 50 * 10) / 10,
    deviceStatus: isOffline ? 'offline' : 'online',
    status: isOffline ? 'offline' : calcStatus(currentLevel, warningLevel, guaranteeLevel),
    updateTime: new Date(Date.now() - Math.random() * 300000).toISOString(),
    coordinates: [item.coords[0] + (Math.random() - 0.5) * 0.5, item.coords[1] + (Math.random() - 0.5) * 0.3],
    responsiblePerson: ['张建国', '李志强', '王海涛', '刘建军', '陈明华', '赵伟峰'][index % 6],
    phone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
    description: `${item.name}是${item.region}地区重要的水利枢纽工程，承担着防洪、供水、发电等综合功能。`,
  };
});

// 生成告警记录
export const alertList: AlertRecord[] = (() => {
  const alerts: AlertRecord[] = [];
  const dangerReservoirs = reservoirList.filter(r => r.status === 'danger');
  const warningReservoirs = reservoirList.filter(r => r.status === 'warning');
  const offlineReservoirs = reservoirList.filter(r => r.status === 'offline');
  
  dangerReservoirs.forEach(r => {
    alerts.push({
      id: `ALT-${alerts.length + 1}`,
      reservoirId: r.id,
      reservoirName: r.name,
      type: 'water_level',
      level: 'danger',
      value: r.currentWaterLevel,
      threshold: r.guaranteeLevel,
      unit: 'm',
      message: `水位超过保证水位 ${(r.currentWaterLevel - r.guaranteeLevel).toFixed(2)}m`,
      status: 'unconfirmed',
      createTime: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    });
  });
  
  warningReservoirs.forEach(r => {
    alerts.push({
      id: `ALT-${alerts.length + 1}`,
      reservoirId: r.id,
      reservoirName: r.name,
      type: 'water_level',
      level: 'warning',
      value: r.currentWaterLevel,
      threshold: r.warningLevel,
      unit: 'm',
      message: `水位超过警戒水位 ${(r.currentWaterLevel - r.warningLevel).toFixed(2)}m`,
      status: Math.random() > 0.5 ? 'unconfirmed' : 'processing',
      createTime: new Date(Date.now() - Math.random() * 7200000).toISOString(),
    });
  });
  
  offlineReservoirs.forEach(r => {
    alerts.push({
      id: `ALT-${alerts.length + 1}`,
      reservoirId: r.id,
      reservoirName: r.name,
      type: 'device_offline',
      level: 'warning',
      value: 0,
      threshold: 1,
      unit: '',
      message: '监测设备离线，数据中断',
      status: 'unconfirmed',
      createTime: new Date(Date.now() - Math.random() * 1800000).toISOString(),
    });
  });
  
  return alerts.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
})();

// 生成历史数据（最近24小时，每小时一个点）
export function generateHistoryData(reservoir: Reservoir, hours: number = 24): HistoryDataPoint[] {
  const data: HistoryDataPoint[] = [];
  const now = Date.now();
  const baseLevel = reservoir.currentWaterLevel - 2 + Math.random() * 4;
  
  for (let i = hours; i >= 0; i--) {
    const time = new Date(now - i * 3600000);
    const wave = Math.sin(i / 4) * 1.5 + Math.random() * 0.5;
    const waterLevel = baseLevel + wave;
    
    data.push({
      time: time.toISOString(),
      waterLevel: Math.round(waterLevel * 100) / 100,
      storage: Math.round((reservoir.currentStorage + (Math.random() - 0.5) * 2000) * 100) / 100,
      inflow: Math.round((reservoir.inflow + Math.sin(i / 3) * 50 + Math.random() * 20) * 100) / 100,
      outflow: Math.round((reservoir.outflow + Math.cos(i / 3) * 30 + Math.random() * 15) * 100) / 100,
      rainfall: Math.round(Math.max(0, Math.random() * 30 - 10) * 10) / 10,
    });
  }
  
  return data;
}

// 概览统计
export function getOverviewStats() {
  const total = reservoirList.length;
  const normal = reservoirList.filter(r => r.status === 'normal').length;
  const warning = reservoirList.filter(r => r.status === 'warning').length;
  const danger = reservoirList.filter(r => r.status === 'danger').length;
  const offline = reservoirList.filter(r => r.status === 'offline').length;
  const onlineRate = Math.round((reservoirList.filter(r => r.deviceStatus === 'online').length / total) * 1000) / 10;
  
  return { total, normal, warning, danger, offline, onlineRate };
}

// 区域分组
export function getReservoirsByRegion() {
  const regions: Record<string, Reservoir[]> = {};
  reservoirList.forEach(r => {
    if (!regions[r.region]) regions[r.region] = [];
    regions[r.region].push(r);
  });
  return regions;
}
