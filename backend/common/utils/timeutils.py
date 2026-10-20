"""时间工具：统一时区与序列化口径（标准 6.2 / 6.3）。"""

from datetime import datetime, timedelta

from django.utils import timezone


def iso(value: datetime | None) -> str | None:
    """把 datetime 统一序列化为本地时区 ISO 字符串。"""
    if value is None:
        return None
    if timezone.is_naive(value):
        value = timezone.make_aware(value, timezone.get_current_timezone())
    return timezone.localtime(value).isoformat()


def now_iso() -> str:
    """当前本地时区 ISO 字符串。"""
    return iso(timezone.now())  # type: ignore[return-value]


def days_ago(days: int) -> datetime:
    """返回 N 天前的当前时区时间。"""
    return timezone.now() - timedelta(days=days)


def hours_ago(hours: int) -> datetime:
    """返回 N 小时前的当前时区时间。"""
    return timezone.now() - timedelta(hours=hours)
