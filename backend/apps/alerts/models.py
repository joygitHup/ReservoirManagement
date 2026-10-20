"""告警模型（标准 2.1 / 2.3 / 2.4）。"""

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.alerts.constants import AlertLevel, AlertStatus, AlertType
from common.models import BaseModel, SoftDeleteQuerySet


class AlertQuerySet(SoftDeleteQuerySet):
    """告警查询集：常用过滤沉淀为链式方法。"""

    def for_reservoir(self, reservoir_id) -> "AlertQuerySet":
        return self.filter(reservoir_id=reservoir_id)

    def unconfirmed(self) -> "AlertQuerySet":
        return self.filter(status=AlertStatus.UNCONFIRMED)

    def opened(self) -> "AlertQuerySet":
        """未解决的告警（未确认 + 处理中）。"""
        return self.exclude(status=AlertStatus.RESOLVED)


class AlertManager(models.Manager.from_queryset(AlertQuerySet)):  # type: ignore[misc]
    """默认管理器：自动过滤软删除记录。"""

    def get_queryset(self) -> AlertQuerySet:
        return super().get_queryset().filter(is_deleted=False)


class AlertRecord(BaseModel):
    """告警记录：谁在何时对哪座水库因何触发告警，及其处理状态。"""

    code = models.CharField("告警编号", max_length=32, unique=True)
    reservoir = models.ForeignKey(
        "reservoirs.Reservoir",
        on_delete=models.CASCADE,
        related_name="alerts",
        verbose_name="关联水库",
    )
    type = models.CharField("告警类型", max_length=32, choices=AlertType.choices, db_index=True)
    level = models.CharField("告警等级", max_length=16, choices=AlertLevel.choices, db_index=True)
    value = models.DecimalField("监测值", max_digits=10, decimal_places=2, default=0)
    threshold = models.DecimalField("阈值", max_digits=10, decimal_places=2, default=0)
    unit = models.CharField("单位", max_length=16, blank=True, default="")
    message = models.CharField("告警描述", max_length=255, blank=True, default="")
    status = models.CharField(
        "处理状态",
        max_length=16,
        choices=AlertStatus.choices,
        default=AlertStatus.UNCONFIRMED,
        db_index=True,
    )
    create_time = models.DateTimeField("告警时间", default=timezone.now, db_index=True)
    confirmed_at = models.DateTimeField("确认时间", null=True, blank=True)
    resolved_at = models.DateTimeField("解决时间", null=True, blank=True)
    handler = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="handled_alerts",
        verbose_name="处理人",
    )

    objects = AlertManager()
    all_objects = AlertQuerySet.as_manager()

    class Meta:
        db_table = "alerts_alert"
        ordering = ["-create_time"]
        verbose_name = "告警记录"
        verbose_name_plural = "告警记录"
        indexes = [
            models.Index(fields=["reservoir", "-create_time"], name="idx_alert_res_time"),
            models.Index(fields=["status", "level"], name="idx_alert_status_level"),
        ]

    def __str__(self) -> str:
        return f"{self.code} {self.get_level_display()} {self.reservoir_id}"
