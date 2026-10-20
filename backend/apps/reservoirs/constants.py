"""水库常量：状态、类型、区域、设备状态与历史时间范围（标准 7.1）。

枚举取值与前端 `src/data/reservoirs.ts` 保持一致：
- status / deviceStatus 使用英文代码
- type / region 直接使用中文，便于前端按中文过滤
"""

from django.db import models


class ReservoirStatus(models.TextChoices):
    NORMAL = "normal", "正常"
    WARNING = "warning", "预警"
    DANGER = "danger", "告警"
    OFFLINE = "offline", "离线"


class ReservoirType(models.TextChoices):
    LARGE = "大型水库", "大型水库"
    MEDIUM = "中型水库", "中型水库"
    SMALL = "小型水库", "小型水库"


class ReservoirRegion(models.TextChoices):
    EAST = "华东", "华东"
    CENTRAL = "华中", "华中"
    NORTH = "华北", "华北"
    NORTHEAST = "东北", "东北"
    NORTHWEST = "西北", "西北"
    SOUTHWEST = "西南", "西南"
    SOUTH = "华南", "华南"


class DeviceStatus(models.TextChoices):
    ONLINE = "online", "在线"
    OFFLINE = "offline", "离线"


class HistoryRange(models.TextChoices):
    HOUR_1 = "1h", "近 1 小时"
    HOUR_24 = "24h", "近 24 小时"
    DAY_7 = "7d", "近 7 天"


# 时间范围 -> 小时数（与前端 timeRange 语义一致：1h / 24h / 168h）
HISTORY_RANGE_HOURS = {
    HistoryRange.HOUR_1.value: 1,
    HistoryRange.HOUR_24.value: 24,
    HistoryRange.DAY_7.value: 24 * 7,
}
