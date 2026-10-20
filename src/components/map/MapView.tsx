import 'ol/ol.css';
import { useEffect, useRef, useState, useCallback } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Style from 'ol/style/Style';
import Circle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Text from 'ol/style/Text';
import { fromLonLat, toLonLat } from 'ol/proj';
import Overlay from 'ol/Overlay';
import Draw from 'ol/interaction/Draw';
import GeoJSON from 'ol/format/GeoJSON';
import { getArea, getLength } from 'ol/sphere';
import { unByKey } from 'ol/Observable';
import ScaleLine from 'ol/control/ScaleLine';
import MousePosition from 'ol/control/MousePosition';
import { createStringXY } from 'ol/coordinate';
import type Geometry from 'ol/geom/Geometry';
import type { StyleFunction } from 'ol/style/Style';
import type { Reservoir, AlertRecord } from '@/data/reservoirs';
import type { FloodBoundary } from '@/lib/flood';
import { MeasurePanel } from '@/components/map/MeasurePanel';
import {
  formatLength,
  formatArea,
  type MeasureResult,
  type MeasureTool,
} from '@/lib/measure';

interface MapViewProps {
  reservoirs: Reservoir[];
  alerts: AlertRecord[];
  selectedReservoir: Reservoir | null;
  onSelectReservoir: (reservoir: Reservoir) => void;
  baseMapType: string;
  showReservoirLayer: boolean;
  showAlertLayer: boolean;
  showBasinLayer: boolean;
  selectedTime: Date;
  showScaleLine: boolean;
  showCoordinates: boolean;
  mapAnimation: boolean;
  alertBlink: boolean;
  /** 当前激活的地图工具：measure（测距）/ area（测面）/ flood（淹没分析） */
  activeTool: string | null;
  onToolChange: (tool: string | null) => void;
  /** 淹没分析范围（GeoJSON，WGS84） */
  floodBoundary: FloodBoundary | null;
}

// 天地图 Key
const TIANDITU_KEY = 'd3b535fd697948afbe2e01f7a526b080';

// 底图配置
const baseMapConfigs: Record<string, { label: string; urls: string[]; needLabel?: boolean }> = {
  tianditu_vec: {
    label: '天地图矢量',
    urls: ['0', '1', '2', '3', '4', '5', '6', '7'].map(
      (n) =>
        `https://t${n}.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=${TIANDITU_KEY}`
    ),
  },
  tianditu_img: {
    label: '天地图影像',
    urls: ['0', '1', '2', '3', '4', '5', '6', '7'].map(
      (n) =>
        `https://t${n}.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=${TIANDITU_KEY}`
    ),
    needLabel: true,
  },
  tianditu_ter: {
    label: '天地图地形',
    urls: ['0', '1', '2', '3', '4', '5', '6', '7'].map(
      (n) =>
        `https://t${n}.tianditu.gov.cn/DataServer?T=ter_w&x={x}&y={y}&l={z}&tk=${TIANDITU_KEY}`
    ),
    needLabel: true,
  },
  tianditu_cva: {
    label: '天地图注记',
    urls: ['0', '1', '2', '3', '4', '5', '6', '7'].map(
      (n) =>
        `https://t${n}.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${TIANDITU_KEY}`
    ),
  },
  tianditu_cia: {
    label: '天地图影像注记',
    urls: ['0', '1', '2', '3', '4', '5', '6', '7'].map(
      (n) =>
        `https://t${n}.tianditu.gov.cn/DataServer?T=cia_w&x={x}&y={y}&l={z}&tk=${TIANDITU_KEY}`
    ),
  },
  gaode: {
    label: '高德地图',
    urls: ['1', '2', '3', '4'].map(
      (n) =>
        `https://webrd0${n}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}`
    ),
  },
  gaode_sat: {
    label: '高德卫星',
    urls: ['1', '2', '3', '4'].map(
      (n) =>
        `https://webst0${n}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}`
    ),
  },
};

function getStatusColor(status: string) {
  switch (status) {
    case 'normal': return '#10b981';
    case 'warning': return '#f59e0b';
    case 'danger': return '#ef4444';
    case 'offline': return '#6b7280';
    default: return '#3b82f6';
  }
}

function createReservoirFeature(reservoir: Reservoir, isSelected: boolean, hasAlert: boolean) {
  const feature = new Feature({
    geometry: new Point(fromLonLat(reservoir.coordinates)),
    reservoir,
  });
  feature.setId(reservoir.id);
  
  const color = getStatusColor(reservoir.status);
  const radius = isSelected ? 14 : hasAlert ? 11 : 9;
  
  feature.setStyle(
    new Style({
      image: new Circle({
        radius,
        fill: new Fill({ color }),
        stroke: new Stroke({
          color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.8)',
          width: isSelected ? 3 : 2,
        }),
      }),
      text: new Text({
        text: reservoir.name,
        font: '12px Inter, sans-serif',
        offsetY: -20,
        fill: new Fill({ color: '#e2e8f0' }),
        stroke: new Stroke({ color: 'rgba(10,22,40,0.9)', width: 3 }),
        padding: [2, 4, 2, 4],
      }),
    })
  );
  
  return feature;
}

const MEASURE_COLOR = '#06b6d4';

// 测量图层样式：按几何类型区分线 / 面 / 节点
const measureStyleFunction: StyleFunction = (feature) => {
  const geometry = feature.getGeometry();
  const type = geometry?.getType();
  if (type === 'Polygon' || type === 'MultiPolygon') {
    return new Style({
      stroke: new Stroke({ color: MEASURE_COLOR, width: 2, lineDash: [6, 4] }),
      fill: new Fill({ color: 'rgba(6, 182, 212, 0.16)' }),
    });
  }
  if (type === 'LineString' || type === 'MultiLineString') {
    return new Style({
      stroke: new Stroke({ color: MEASURE_COLOR, width: 2, lineDash: [6, 4] }),
    });
  }
  return new Style({
    image: new Circle({
      radius: 4,
      fill: new Fill({ color: '#ffffff' }),
      stroke: new Stroke({ color: MEASURE_COLOR, width: 2 }),
    }),
  });
};

// 绘制完成后带结果标注的样式
function createMeasuredStyle(label: string) {
  return new Style({
    stroke: new Stroke({ color: MEASURE_COLOR, width: 2, lineDash: [6, 4] }),
    fill: new Fill({ color: 'rgba(6, 182, 212, 0.16)' }),
    image: new Circle({
      radius: 4,
      fill: new Fill({ color: '#ffffff' }),
      stroke: new Stroke({ color: MEASURE_COLOR, width: 2 }),
    }),
    text: new Text({
      text: label,
      font: '12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fill: new Fill({ color: '#e2e8f0' }),
      stroke: new Stroke({ color: 'rgba(10,22,40,0.9)', width: 3 }),
      padding: [2, 4, 2, 4],
    }),
  });
}

// 淹没范围样式
const floodStyle = new Style({
  stroke: new Stroke({ color: '#ef4444', width: 2, lineDash: [8, 5] }),
  fill: new Fill({ color: 'rgba(239, 68, 68, 0.28)' }),
});

export function MapView({
  reservoirs,
  alerts,
  selectedReservoir,
  onSelectReservoir,
  baseMapType,
  showReservoirLayer,
  showAlertLayer,
  showBasinLayer,
  showScaleLine,
  showCoordinates,
  mapAnimation,
  alertBlink,
  activeTool,
  onToolChange,
  floodBoundary,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const measureTipRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const baseLayerRef = useRef<TileLayer<XYZ> | null>(null);
  const labelLayerRef = useRef<TileLayer<XYZ> | null>(null);
  const reservoirLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const floodLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const measureSourceRef = useRef<VectorSource | null>(null);
  const measureTipOverlayRef = useRef<Overlay | null>(null);
  const drawRef = useRef<Draw | null>(null);
  const measureIdRef = useRef(0);
  const alertOverlayRef = useRef<Overlay | null>(null);
  const mapAnimationRef = useRef(mapAnimation);
  const activeToolRef = useRef(activeTool);
  const [hoveredReservoir, setHoveredReservoir] = useState<Reservoir | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [measurements, setMeasurements] = useState<MeasureResult[]>([]);

  const isDrawingTool = activeTool === 'measure' || activeTool === 'area';

  // 初始化地图
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const baseConfig = baseMapConfigs[baseMapType] || baseMapConfigs.tianditu_vec;
    const baseLayer = new TileLayer({
      source: new XYZ({
        urls: baseConfig.urls,
      }),
    });
    baseLayerRef.current = baseLayer;

    // 影像/地形图需要叠加注记层
    const layers: (TileLayer<XYZ> | VectorLayer<VectorSource>)[] = [baseLayer];
    if (baseConfig.needLabel) {
      const labelConfig = baseMapConfigs.tianditu_cva;
      const labelLayer = new TileLayer({
        source: new XYZ({
          urls: labelConfig.urls,
        }),
        zIndex: 1,
      });
      labelLayerRef.current = labelLayer;
      layers.push(labelLayer);
    }

    const reservoirSource = new VectorSource();
    const reservoirLayer = new VectorLayer({
      source: reservoirSource,
      zIndex: 10,
    });
    reservoirLayerRef.current = reservoirLayer;

    // 淹没范围图层（位于水库点位下方）
    const floodLayer = new VectorLayer({
      source: new VectorSource(),
      zIndex: 5,
      style: floodStyle,
    });
    floodLayerRef.current = floodLayer;

    // 测量图层（位于所有业务图层之上）
    const measureSource = new VectorSource();
    measureSourceRef.current = measureSource;
    const measureLayer = new VectorLayer({
      source: measureSource,
      zIndex: 30,
      style: measureStyleFunction,
    });

    const map = new Map({
      target: mapContainerRef.current,
      layers: [...layers, floodLayer, reservoirLayer, measureLayer],
      view: new View({
        center: fromLonLat([108, 32]),
        zoom: 4.5,
        minZoom: 3,
        maxZoom: 18,
      }),
    });
    mapRef.current = map;

    // 弹窗 overlay
    const popupOverlay = new Overlay({
      element: popupRef.current!,
      autoPan: false,
      positioning: 'bottom-center',
      offset: [0, -10],
    });
    map.addOverlay(popupOverlay);
    alertOverlayRef.current = popupOverlay;

    // 测量实时提示 overlay
    const measureTipOverlay = new Overlay({
      element: measureTipRef.current!,
      positioning: 'top-left',
      offset: [14, 14],
      stopEvent: false,
    });
    map.addOverlay(measureTipOverlay);
    measureTipOverlayRef.current = measureTipOverlay;

    // 点击事件（绘制工具激活时交由 Draw 处理）
    map.on('singleclick', (evt) => {
      if (activeToolRef.current === 'measure' || activeToolRef.current === 'area') return;
      const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f, {
        layerFilter: (l) => l === reservoirLayer,
      });
      if (feature) {
        const reservoir = feature.get('reservoir') as Reservoir;
        onSelectReservoir(reservoir);
      }
    });

    // hover 事件
    map.on('pointermove', (evt) => {
      if (evt.dragging) return;
      if (activeToolRef.current) return;
      const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f, {
        layerFilter: (l) => l === reservoirLayer,
      });
      if (feature) {
        const reservoir = feature.get('reservoir') as Reservoir;
        setHoveredReservoir(reservoir);
        setPopupPosition({ x: evt.pixel[0], y: evt.pixel[1] });
        popupOverlay.setPosition(evt.coordinate);
        map.getViewport().style.cursor = 'pointer';
      } else {
        setHoveredReservoir(null);
        setPopupPosition(null);
        popupOverlay.setPosition(undefined);
        map.getViewport().style.cursor = 'grab';
      }
    });

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 同步定位动画开关
  useEffect(() => {
    mapAnimationRef.current = mapAnimation;
  }, [mapAnimation]);

  // 比例尺控件（按设置动态挂载/卸载）
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showScaleLine) return;
    const control = new ScaleLine({ units: 'metric', className: 'ol-scale-line-custom' });
    map.addControl(control);
    return () => {
      map.removeControl(control);
    };
  }, [showScaleLine]);

  // 鼠标坐标控件（按设置动态挂载/卸载）
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showCoordinates) return;
    const control = new MousePosition({
      coordinateFormat: createStringXY(4),
      projection: 'EPSG:4326',
      className: 'ol-mouse-position-custom',
      placeholder: '&nbsp;',
    });
    map.addControl(control);
    return () => {
      map.removeControl(control);
    };
  }, [showCoordinates]);

  // 切换底图
  useEffect(() => {
    if (!baseLayerRef.current || !mapRef.current) return;
    const baseConfig = baseMapConfigs[baseMapType] || baseMapConfigs.tianditu_vec;
    baseLayerRef.current.setSource(new XYZ({
      urls: baseConfig.urls,
    }));

    // 影像/地形图需要注记层
    const needLabel = !!baseConfig.needLabel;
    if (needLabel && labelLayerRef.current) {
      const labelConfig = baseMapConfigs.tianditu_cva;
      labelLayerRef.current.setSource(new XYZ({
        urls: labelConfig.urls,
      }));
      labelLayerRef.current.setVisible(true);
    } else if (labelLayerRef.current) {
      labelLayerRef.current.setVisible(false);
    }
  }, [baseMapType]);

  // 更新水库图层
  useEffect(() => {
    if (!reservoirLayerRef.current) return;
    const source = reservoirLayerRef.current.getSource();
    if (!source) return;
    
    source.clear();
    
    if (!showReservoirLayer) return;
    
    const alertReservoirIds = new Set(alerts.map(a => a.reservoirId));
    
    reservoirs.forEach((reservoir) => {
      const hasAlert = showAlertLayer && alertReservoirIds.has(reservoir.id);
      const isSelected = selectedReservoir?.id === reservoir.id;
      const feature = createReservoirFeature(reservoir, isSelected, hasAlert);
      source.addFeature(feature);
    });
  }, [reservoirs, selectedReservoir, showReservoirLayer, showAlertLayer, alerts]);

  // 选中水库时定位
  useEffect(() => {
    if (!selectedReservoir || !mapRef.current) return;
    const view = mapRef.current.getView();
    view.animate({
      center: fromLonLat(selectedReservoir.coordinates),
      zoom: 10,
      duration: mapAnimationRef.current ? 800 : 0,
    });
  }, [selectedReservoir]);

  // 告警闪烁动画
  useEffect(() => {
    if (!reservoirLayerRef.current || !showAlertLayer || !alertBlink) return;
    
    let flashState = 0;
    const alertReservoirIds = new Set(alerts.map(a => a.reservoirId));
    
    const animate = () => {
      flashState = (flashState + 1) % 20;
      const source = reservoirLayerRef.current?.getSource();
      if (!source) return;
      
      source.getFeatures().forEach((feature) => {
        const reservoir = feature.get('reservoir') as Reservoir;
        if (!alertReservoirIds.has(reservoir.id)) return;
        
        const isSelected = selectedReservoir?.id === reservoir.id;
        const baseRadius = isSelected ? 14 : 11;
        const pulseRadius = baseRadius + Math.sin(flashState * 0.6) * 3;
        const color = getStatusColor(reservoir.status);
        
        feature.setStyle(
          new Style({
            image: new Circle({
              radius: pulseRadius,
              fill: new Fill({ color }),
              stroke: new Stroke({
                color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.8)',
                width: isSelected ? 3 : 2,
              }),
            }),
            text: new Text({
              text: reservoir.name,
              font: '12px Inter, sans-serif',
              offsetY: -20,
              fill: new Fill({ color: '#e2e8f0' }),
              stroke: new Stroke({ color: 'rgba(10,22,40,0.9)', width: 3 }),
            }),
          })
        );
      });
    };
    
    const interval = setInterval(animate, 100);
    return () => clearInterval(interval);
  }, [alerts, showAlertLayer, selectedReservoir, alertBlink]);

  // 同步当前工具，供地图事件回调判断是否需要拦截
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  // 测距 / 测面：按工具切换 Draw 交互
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (drawRef.current) {
      map.removeInteraction(drawRef.current);
      drawRef.current = null;
    }

    const source = measureSourceRef.current;
    const tipOverlay = measureTipOverlayRef.current;
    const tipElement = measureTipRef.current;
    if (!source || !tipOverlay || !tipElement) return;

    const tool: MeasureTool | null =
      activeTool === 'measure' || activeTool === 'area' ? activeTool : null;

    if (!tool) {
      tipOverlay.setPosition(undefined);
      map.getViewport().style.cursor = '';
      return;
    }

    let sketchGeometry: Geometry | null = null;

    const draw = new Draw({
      source,
      type: tool === 'measure' ? 'LineString' : 'Polygon',
      style: measureStyleFunction,
    });
    drawRef.current = draw;
    map.addInteraction(draw);
    map.getViewport().style.cursor = 'crosshair';

    const pointerKey = map.on('pointermove', (evt) => {
      if (!sketchGeometry) {
        tipOverlay.setPosition(undefined);
        return;
      }
      const value = tool === 'measure' ? getLength(sketchGeometry) : getArea(sketchGeometry);
      tipElement.textContent =
        tool === 'measure' ? `总长 ${formatLength(value)}` : `面积 ${formatArea(value)}`;
      tipOverlay.setPosition(evt.coordinate);
    });

    draw.on('drawstart', (event) => {
      sketchGeometry = event.feature.getGeometry() ?? null;
    });

    draw.on('drawend', (event) => {
      const geometry = event.feature.getGeometry();
      sketchGeometry = null;
      tipOverlay.setPosition(undefined);
      if (!geometry) return;

      const value = tool === 'measure' ? getLength(geometry) : getArea(geometry);
      event.feature.setStyle(
        createMeasuredStyle(tool === 'measure' ? formatLength(value) : formatArea(value))
      );

      measureIdRef.current += 1;
      const id = measureIdRef.current;
      setMeasurements((prev) => [...prev, { id, tool, value }]);
    });

    return () => {
      unByKey(pointerKey);
      map.removeInteraction(draw);
      if (drawRef.current === draw) drawRef.current = null;
      tipOverlay.setPosition(undefined);
      map.getViewport().style.cursor = '';
    };
  }, [activeTool]);

  // 渲染淹没分析范围
  useEffect(() => {
    const layer = floodLayerRef.current;
    const source = layer?.getSource();
    if (!source) return;
    source.clear();
    if (!floodBoundary) return;

    const geometry = new GeoJSON().readGeometry(floodBoundary.geometry, {
      featureProjection: 'EPSG:3857',
    });
    source.addFeature(new Feature({ geometry }));
  }, [floodBoundary]);

  // 清除测量结果
  const handleClearMeasurements = useCallback(() => {
    measureSourceRef.current?.clear();
    setMeasurements([]);
  }, []);

  const flyTo = useCallback((lon: number, lat: number, zoom: number = 10) => {
    if (!mapRef.current) return;
    mapRef.current.getView().animate({
      center: fromLonLat([lon, lat]),
      zoom,
      duration: 800,
    });
  }, []);

  // 暴露方法到 window（供外部调用）
  useEffect(() => {
    (window as unknown as { mapFlyTo?: (lon: number, lat: number, zoom?: number) => void }).mapFlyTo = flyTo;
  }, [flyTo]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* 信息弹窗 */}
      <div
        ref={popupRef}
        className="pointer-events-none opacity-0 transition-opacity"
      >
        {hoveredReservoir && popupPosition && (
          <div className="bg-[rgba(15,29,50,0.95)] border border-blue-500/30 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm min-w-[200px]">
            <div className="text-sm font-semibold text-white mb-1">{hoveredReservoir.name}</div>
            <div className="text-xs text-slate-400 space-y-0.5">
              <div className="flex justify-between gap-4">
                <span>当前水位</span>
                <span className={`font-mono ${hoveredReservoir.status === 'danger' ? 'text-red-400' : hoveredReservoir.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {hoveredReservoir.currentWaterLevel.toFixed(2)} m
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>警戒水位</span>
                <span className="font-mono text-slate-300">{hoveredReservoir.warningLevel.toFixed(2)} m</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>状态</span>
                <span className={`font-medium ${
                  hoveredReservoir.status === 'normal' ? 'text-emerald-400' :
                  hoveredReservoir.status === 'warning' ? 'text-amber-400' :
                  hoveredReservoir.status === 'danger' ? 'text-red-400' :
                  'text-slate-400'
                }`}>
                  {hoveredReservoir.status === 'normal' ? '正常' :
                   hoveredReservoir.status === 'warning' ? '预警' :
                   hoveredReservoir.status === 'danger' ? '告警' : '离线'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 测量实时提示（跟随光标） */}
      <div
        ref={measureTipRef}
        className="bg-[rgba(15,29,50,0.95)] border border-cyan-500/40 rounded px-2 py-1 text-xs font-mono text-cyan-300 shadow-lg backdrop-blur-sm whitespace-nowrap"
      />

      {/* 测量结果面板 */}
      {(isDrawingTool || measurements.length > 0) && (
        <MeasurePanel
          activeTool={isDrawingTool ? (activeTool as MeasureTool) : null}
          items={measurements}
          onClear={handleClearMeasurements}
          onExit={() => onToolChange(null)}
        />
      )}
    </div>
  );
}

export { baseMapConfigs };
