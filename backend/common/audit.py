"""审计日志写入入口（补充文档第 12 条）。"""

from typing import Any

from common.models import AuditLog


def get_client_ip(request) -> str | None:
    """从请求中解析客户端 IP（兼容反向代理）。"""
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def write_audit_log(
    *,
    action: str,
    target_type: str,
    target_id: Any,
    actor=None,
    before: dict | None = None,
    after: dict | None = None,
    request=None,
) -> AuditLog:
    """写入一条审计日志。

    敏感操作必须审计：登录、权限变更、数据导出、删除（补充文档第 12 条）。
    """
    user = actor
    if user is not None and not getattr(user, "is_authenticated", False):
        user = None
    ip = get_client_ip(request) if request is not None else None
    request_id = getattr(request, "id", "") if request is not None else ""
    return AuditLog.objects.create(
        actor=user,
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        before=before,
        after=after,
        ip=ip,
        request_id=request_id,
    )
