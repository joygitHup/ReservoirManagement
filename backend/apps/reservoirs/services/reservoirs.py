"""水库领域服务：状态计算、历史聚合、统计与写操作审计（标准 1.1 / 5.4 / 6）。"""

from datetime import timedelta

from django.db import transaction
from django.db.models import Count, ExpressionWrapper, F, FloatField, Q
from django.db.models.functions import NullIf
from django.utils import timezone

from apps.reservoirs.constants import HISTORY_RANGE_HOURS, DeviceStatus, ReservoirStatus
from apps.reservoirs.models import Reservoir, ReservoirMeasurement
from common.audit import write_audit_log
from common.constants import AuditAction, ErrorCode
from common.exceptions import BusinessError


def calculate_status(reservoir) -> str:
    """根据设备状态与当前水位推导运行状态（与前端 calcStatus 语义一致）。"""
    if reservoir.device_status == DeviceStatus.OFFLINE:
        return ReservoirStatus.OFFLINE
    level = reservoir.current_water_level or 0
    if reservoir.guarantee_level and level >= reservoir.guarantee_level:
        return ReservoirStatus.DANGER
    if reservoir.warning_level and level >= reservoir.warning_level:
        return ReservoirStatus.WARNING
    return ReservoirStatus.NORMAL


def get_history(reservoir, range_key: str) -> list[ReservoirMeasurement]:
    """按时间范围聚合历史监测点，时间范围非法时抛业务异常。"""
    hours = HISTORY_RANGE_HOURS.get(range_key)
    if hours is None:
        raise BusinessError(
            "不支持的时间范围，可选 1h / 24h / 7d",
            error_code=ErrorCode.INVALID_PARAM,
        )
    since = timezone.now() - timedelta(hours=hours)
    return list(
        ReservoirMeasurement.objects.filter(
            reservoir=reservoir, measured_at__gte=since
        ).order_by("measured_at")
    )


def get_overview_stats() -> dict:
    """概览统计：与前端 getOverviewStats 返回结构一致（单次聚合查询）。"""
    agg = Reservoir.objects.aggregate(
        total=Count("id"),
        normal=Count("id", filter=Q(status=ReservoirStatus.NORMAL)),
        warning=Count("id", filter=Q(status=ReservoirStatus.WARNING)),
        danger=Count("id", filter=Q(status=ReservoirStatus.DANGER)),
        offline=Count("id", filter=Q(status=ReservoirStatus.OFFLINE)),
        online_devices=Count("id", filter=Q(device_status=DeviceStatus.ONLINE)),
    )
    total = agg["total"] or 0
    online_rate = round(agg["online_devices"] / total * 100, 1) if total else 0.0
    return {
        "total": total,
        "normal": agg["normal"],
        "warning": agg["warning"],
        "danger": agg["danger"],
        "offline": agg["offline"],
        "onlineRate": online_rate,
    }


def get_region_stats() -> list[dict]:
    """区域分组统计（单次分组查询）。"""
    rows = (
        Reservoir.objects.values("region")
        .annotate(
            total=Count("id"),
            normal=Count("id", filter=Q(status=ReservoirStatus.NORMAL)),
            warning=Count("id", filter=Q(status=ReservoirStatus.WARNING)),
            danger=Count("id", filter=Q(status=ReservoirStatus.DANGER)),
            offline=Count("id", filter=Q(status=ReservoirStatus.OFFLINE)),
        )
        .order_by("region")
    )
    return [dict(row) for row in rows]


def get_water_level_ranking(limit: int = 8) -> list[dict]:
    """水位占比排行：当前水位 / 警戒水位 * 100（与前端排行榜口径一致）。"""
    ratio = ExpressionWrapper(
        F("current_water_level") * 100.0 / NullIf(F("warning_level"), 0),
        output_field=FloatField(),
    )
    queryset = Reservoir.objects.annotate(ratio=ratio).order_by("-ratio", "code")[:limit]
    return [
        {
            "id": str(item.id),
            "code": item.code,
            "name": item.name,
            "region": item.region,
            "type": item.type,
            "status": item.status,
            "currentWaterLevel": float(item.current_water_level),
            "warningLevel": float(item.warning_level),
            "ratio": round(item.ratio, 1) if item.ratio is not None else 0.0,
        }
        for item in queryset
    ]


def _next_reservoir_code() -> str:
    """生成唯一水库编号（RSV-0001 形式）。"""
    seq = Reservoir.all_objects.count() + 1
    code = f"RSV-{seq:04d}"
    while Reservoir.all_objects.filter(code=code).exists():
        seq += 1
        code = f"RSV-{seq:04d}"
    return code


@transaction.atomic
def create_reservoir(*, serializer, actor, request) -> Reservoir:
    """创建水库并写审计日志；未提供编号时自动生成。"""
    if not serializer.validated_data.get("code"):
        serializer.validated_data["code"] = _next_reservoir_code()
    reservoir = serializer.save()
    write_audit_log(
        action=AuditAction.RESERVOIR_CREATE,
        target_type="reservoir",
        target_id=reservoir.id,
        actor=actor,
        after={"code": reservoir.code, "name": reservoir.name},
        request=request,
    )
    return reservoir


@transaction.atomic
def update_reservoir(*, serializer, actor, request, before: dict) -> Reservoir:
    """更新水库并写审计日志。"""
    reservoir = serializer.save()
    write_audit_log(
        action=AuditAction.RESERVOIR_UPDATE,
        target_type="reservoir",
        target_id=reservoir.id,
        actor=actor,
        before=before,
        after={"code": reservoir.code, "name": reservoir.name, "status": reservoir.status},
        request=request,
    )
    return reservoir


@transaction.atomic
def delete_reservoir(*, reservoir, actor, request) -> None:
    """软删除水库并写审计日志。"""
    write_audit_log(
        action=AuditAction.RESERVOIR_DELETE,
        target_type="reservoir",
        target_id=reservoir.id,
        actor=actor,
        before={"code": reservoir.code, "name": reservoir.name},
        request=request,
    )
    reservoir.delete()
