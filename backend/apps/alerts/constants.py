"""告警常量：类型 / 等级 / 状态枚举（标准 7.1；取值与前端 AlertRecord 一致）。"""

from django.db import models


class AlertType(models.TextChoices):
    WATER_LEVEL = "water_level", "水位超限"
    DEVICE_OFFLINE = "device_offline", "设备离线"
    DATA_ABNORMAL = "data_abnormal", "数据异常"
    RAINFALL = "rainfall", "强降雨"


class AlertLevel(models.TextChoices):
    WARNING = "warning", "预警"
    DANGER = "danger", "告警"


class AlertStatus(models.TextChoices):
    """告警状态机：未确认 -> 处理中 -> 已解决（补充文档第 11 条）。"""

    UNCONFIRMED = "unconfirmed", "未确认"
    PROCESSING = "processing", "处理中"
    RESOLVED = "resolved", "已解决"
