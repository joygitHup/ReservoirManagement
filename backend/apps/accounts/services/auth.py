"""认证服务：签发与注销令牌（标准 5.4：事务仅包 DB 写操作）。"""

from django.db import transaction
from django.utils import timezone
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from common.constants import ErrorCode
from common.exceptions import BusinessError


def issue_token_pair(user) -> dict:
    """为用户签发 access / refresh 令牌，并刷新 last_login。"""
    refresh = RefreshToken.for_user(user)
    user.last_login = timezone.now()
    user.save(update_fields=["last_login"])
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


@transaction.atomic
def blacklist_refresh_token(raw_token: str) -> None:
    """把 refresh token 加入黑名单（登出）。空令牌视为幂等成功。"""
    if not raw_token:
        return
    try:
        RefreshToken(raw_token).blacklist()  # type: ignore[arg-type]
    except TokenError as exc:
        raise BusinessError(
            "无效的 refresh token",
            error_code=ErrorCode.INVALID_PARAM,
            status_code=400,
        ) from exc
