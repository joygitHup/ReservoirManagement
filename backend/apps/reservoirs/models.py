"""水库模型与历史监测数据模型（标准 2.1 / 2.2 / 2.3 / 2.4）。"""

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.reservoirs.constants import (
    DeviceStatus,
    ReservoirRegion,
    ReservoirStatus,
    ReservoirType,
)
from common.models import BaseModel, SoftDeleteQuerySet


class ReservoirQuerySet(SoftDeleteQuerySet):
    """水库查询集：把常用过滤沉淀为链式方法（标准 2.1）。"""

    def by_region(self, region: str) -> "ReservoirQuerySet":
        return self.filter(region=region)

    def by_status(self, status: str) -> "ReservoirQuerySet":
        return self.filter(status=status)

    def online_devices(self) -> "ReservoirQuerySet":
        return self.filter(device_status=DeviceStatus.ONLINE)


class ReservoirManager(models.Manager.from_queryset(ReservoirQuerySet)):  # type: ignore[misc]
    """默认管理器：自动过滤软删除记录（标准 2.3）。"""

    def get_queryset(self) -> ReservoirQuerySet:
        return super().get_queryset().filter(is_deleted=False)


class Reservoir(BaseModel):
    """水库聚合根：基本信息、水位参数、实时数据与空间位置。"""

    code = models.CharField("水库编号", max_length=32, unique=True)
    name = models.CharField("水库名称", max_length=128, db_index=True)
    location = models.CharField("所在位置", max_length=255, blank=True, default="")
    region = models.CharField(
        "所在区域", max_length=32, choices=ReservoirRegion.choices, db_index=True
    )
    type = models.CharField(
        "水库类型", max_length=32, choices=ReservoirType.choices, db_index=True
    )
    capacity = models.DecimalField("总库容(万m³)", max_digits=12, decimal_places=2, default=0)

    # 水位参数
    dead_water_level = models.DecimalField("死水位(m)", max_digits=8, decimal_places=2, default=0)
    normal_water_level = models.DecimalField(
        "正常蓄水位(m)", max_digits=8, decimal_places=2, default=0
    )
    flood_limit_level = models.DecimalField(
        "汛限水位(m)", max_digits=8, decimal_places=2, default=0
    )
    warning_level = models.DecimalField("警戒水位(m)", max_digits=8, decimal_places=2, default=0)
    guarantee_level = models.DecimalField("保证水位(m)", max_digits=8, decimal_places=2, default=0)

    # 实时数据
    current_water_level = models.DecimalField(
        "当前水位(m)", max_digits=8, decimal_places=2, default=0
    )
    current_storage = models.DecimalField(
        "当前蓄水量(万m³)", max_digits=12, decimal_places=2, default=0
    )
    inflow = models.DecimalField("入库流量(m³/s)", max_digits=10, decimal_places=2, default=0)
    outflow = models.DecimalField("出库流量(m³/s)", max_digits=10, decimal_places=2, default=0)
    rainfall = models.DecimalField("降雨量(mm)", max_digits=8, decimal_places=2, default=0)

    status = models.CharField(
        "运行状态",
        max_length=16,
        choices=ReservoirStatus.choices,
        default=ReservoirStatus.NORMAL,
        db_index=True,
    )
    device_status = models.CharField(
        "设备状态",
        max_length=16,
        choices=DeviceStatus.choices,
        default=DeviceStatus.ONLINE,
        db_index=True,
    )
    update_time = models.DateTimeField("数据更新时间", default=timezone.now, db_index=True)

    # 空间位置（WGS84 经纬度）
    longitude = models.DecimalField("经度", max_digits=10, decimal_places=6)
    latitude = models.DecimalField("纬度", max_digits=10, decimal_places=6)

    responsible_person = models.CharField("责任人", max_length=64, blank=True, default="")
    phone = models.CharField("联系电话", max_length=20, blank=True, default="")
    description = models.TextField("备注", blank=True, default="")

    objects = ReservoirManager()
    all_objects = ReservoirQuerySet.as_manager()

    class Meta:
        db_table = "reservoirs_reservoir"
        ordering = ["code"]
        verbose_name = "水库"
        verbose_name_plural = "水库"
        indexes = [
            models.Index(fields=["region", "status"], name="idx_reservoir_region_status"),
            models.Index(fields=["device_status"], name="idx_reservoir_device"),
        ]

    def __str__(self) -> str:
        return f"{self.code} {self.name}"

    def clean(self) -> None:
        """业务校验（标准 2.2）：水位参数关系合法性。"""
        if self.dead_water_level and self.normal_water_level and (
            self.dead_water_level > self.normal_water_level
        ):
            raise ValidationError({"dead_water_level": "死水位不能高于正常蓄水位"})
        if self.warning_level and self.guarantee_level and (
            self.warning_level > self.guarantee_level
        ):
            raise ValidationError({"warning_level": "警戒水位不能高于保证水位"})


class MeasurementQuerySet(SoftDeleteQuerySet):
    """历史监测数据查询集。"""

    def for_reservoir(self, reservoir_id) -> "MeasurementQuerySet":
        return self.filter(reservoir_id=reservoir_id)

    def since(self, moment) -> "MeasurementQuerySet":
        return self.filter(measured_at__gte=moment)


class MeasurementManager(models.Manager.from_queryset(MeasurementQuerySet)):  # type: ignore[misc]
    """默认管理器：自动过滤软删除记录。"""

    def get_queryset(self) -> MeasurementQuerySet:
        return super().get_queryset().filter(is_deleted=False)


class ReservoirMeasurement(BaseModel):
    """水库历史监测数据点：承载水位/蓄水量/流量/降雨趋势。"""

    reservoir = models.ForeignKey(
        Reservoir,
        on_delete=models.CASCADE,
        related_name="measurements",
        verbose_name="水库",
    )
    measured_at = models.DateTimeField("监测时间", db_index=True)
    water_level = models.DecimalField("水位(m)", max_digits=8, decimal_places=2, default=0)
    storage = models.DecimalField("蓄水量(万m³)", max_digits=12, decimal_places=2, default=0)
    inflow = models.DecimalField("入库流量(m³/s)", max_digits=10, decimal_places=2, default=0)
    outflow = models.DecimalField("出库流量(m³/s)", max_digits=10, decimal_places=2, default=0)
    rainfall = models.DecimalField("降雨量(mm)", max_digits=8, decimal_places=2, default=0)

    objects = MeasurementManager()
    all_objects = MeasurementQuerySet.as_manager()

    class Meta:
        db_table = "reservoirs_measurement"
        ordering = ["-measured_at"]
        verbose_name = "水库监测数据"
        verbose_name_plural = "水库监测数据"
        indexes = [
            models.Index(fields=["reservoir", "-measured_at"], name="idx_measurement_res_time"),
        ]

    def __str__(self) -> str:
        return f"{self.reservoir_id} @ {self.measured_at:%Y-%m-%d %H:%M}"
