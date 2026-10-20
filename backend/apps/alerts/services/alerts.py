"""告警领域服务：状态机流转 + 审计日志 + 趋势统计（补充文档第 11 / 12 条）。"""

from datetime import datetime, time, timedelta

from django.db import transaction
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone

from apps.alerts.constants import AlertLevel, AlertStatus
from apps.alerts.models import AlertRecord
from common.audit import write_audit_log
from common.constants import AuditAction, ErrorCode
from common.exceptions import BusinessError


def _handler_for(actor):
    """仅登录用户可作为处理人。"""
    if actor is not None and getattr(actor, "is_authenticated", False):
        return actor
    return None


def _next_alert_code() -> str:
    """生成唯一告警编号（ALT-0001 形式）。"""
    seq = AlertRecord.all_objects.count() + 1
    code = f"ALT-{seq:04d}"
    while AlertRecord.all_objects.filter(code=code).exists():
        seq += 1
        code = f"ALT-{seq:04d}"
    return code


@transaction.atomic
def create_alert(*, serializer, actor, request) -> AlertRecord:
    """创建告警并写审计日志；告警编号由服务生成。"""
    serializer.validated_data["code"] = _next_alert_code()
    alert = serializer.save()
    write_audit_log(
        action=AuditAction.ALERT_CREATE,
        target_type="alert",
        target_id=alert.id,
        actor=actor,
        after={"code": alert.code, "level": alert.level, "type": alert.type},
        request=request,
    )
    return alert


@transaction.atomic
def confirm_alert(*, alert: AlertRecord, actor, request) -> AlertRecord:
    """确认告警：未确认 -> 处理中。非法流转抛业务异常。"""
    if alert.status != AlertStatus.UNCONFIRMED:
        raise BusinessError(
            "仅未确认的告警可执行确认",
            error_code=ErrorCode.CONFLICT,
            status_code=409,
        )
    before = {"status": alert.status}
    alert.status = AlertStatus.PROCESSING
    alert.confirmed_at = timezone.now()
    alert.handler = _handler_for(actor) or alert.handler
    alert.save(update_fields=["status", "confirmed_at", "handler", "updated_at"])
    write_audit_log(
        action=AuditAction.ALERT_CONFIRM,
        target_type="alert",
        target_id=alert.id,
        actor=actor,
        before=before,
        after={"status": alert.status},
        request=request,
    )
    return alert


@transaction.atomic
def resolve_alert(*, alert: AlertRecord, actor, request) -> AlertRecord:
    """解决告警：处理中 -> 已解决。非法流转抛业务异常。"""
    if alert.status != AlertStatus.PROCESSING:
        raise BusinessError(
            "仅处理中的告警可执行解决",
            error_code=ErrorCode.CONFLICT,
            status_code=409,
        )
    before = {"status": alert.status}
    alert.status = AlertStatus.RESOLVED
    alert.resolved_at = timezone.now()
    alert.handler = _handler_for(actor) or alert.handler
    alert.save(update_fields=["status", "resolved_at", "handler", "updated_at"])
    write_audit_log(
        action=AuditAction.ALERT_RESOLVE,
        target_type="alert",
        target_id=alert.id,
        actor=actor,
        before=before,
        after={"status": alert.status},
        request=request,
    )
    return alert


def get_alert_trend(days: int = 7) -> list[dict]:
    """近 N 天告警趋势：按天分组统计 warning / danger 数量（单次查询）。"""
    today = timezone.localtime(timezone.now()).date()
    start_date = today - timedelta(days=days - 1)
    start_dt = timezone.make_aware(
        datetime.combine(start_date, time.min), timezone.get_current_timezone()
    )
    rows = (
        AlertRecord.objects.filter(create_time__gte=start_dt)
        .annotate(day=TruncDate("create_time"))
        .values("day")
        .annotate(
            warning=Count("id", filter=Q(level=AlertLevel.WARNING)),
            danger=Count("id", filter=Q(level=AlertLevel.DANGER)),
        )
        .order_by("day")
    )
    by_day = {row["day"]: row for row in rows}
    points = []
    for offset in range(days):
        day = start_date + timedelta(days=offset)
        row = by_day.get(day)
        points.append(
            {
                "date": day.isoformat(),
                "warning": row["warning"] if row else 0,
                "danger": row["danger"] if row else 0,
            }
        )
    return points
