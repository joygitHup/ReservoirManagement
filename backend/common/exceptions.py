"""统一异常：业务异常与全局异常处理器（标准 8.1 / 7.2）。"""

from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    NotAuthenticated,
    PermissionDenied,
    Throttled,
    ValidationError,
)
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from common.constants import STATUS_TO_ERROR_CODE, ErrorCode
from common.renderers import EnvelopeResponse


class BusinessError(APIException):
    """业务异常：携带集中定义的业务错误码，供前端差异化处理。"""

    status_code = 400

    def __init__(self, message: str, error_code: int | None = None, status_code: int | None = None):
        self.error_code = error_code if error_code is not None else ErrorCode.INVALID_PARAM
        self.error_message = message
        if status_code is not None:
            self.status_code = status_code
        super().__init__(detail=message)


def _detail_text(exc, default: str) -> str:
    detail = getattr(exc, "detail", None)
    if detail is None:
        return default
    if isinstance(detail, list | tuple) and detail:
        return str(detail[0])
    return str(detail)


def _as_envelope(response: Response, payload: dict) -> EnvelopeResponse:
    """把 DRF 默认响应转成信封响应，保留状态码与响应头（如 Retry-After）。"""
    return EnvelopeResponse(
        payload, status=response.status_code, headers=dict(response.headers)
    )


def exception_handler(exc, context) -> Response | None:
    """统一异常响应格式：{code, message, errors?}。"""
    response = drf_exception_handler(exc, context)
    if response is None:
        # 非 API 异常，交给 Django 处理（500）
        return None

    if isinstance(exc, BusinessError):
        return _as_envelope(response, {"code": exc.error_code, "message": exc.error_message})

    if isinstance(exc, ValidationError):
        return _as_envelope(
            response,
            {
                "code": ErrorCode.INVALID_PARAM,
                "message": "参数错误",
                "errors": response.data,
            },
        )

    if isinstance(exc, NotAuthenticated | AuthenticationFailed):
        return _as_envelope(
            response,
            {
                "code": ErrorCode.UNAUTHORIZED,
                "message": _detail_text(exc, "未认证或凭证无效"),
            },
        )

    if isinstance(exc, PermissionDenied):
        return _as_envelope(
            response,
            {
                "code": ErrorCode.FORBIDDEN,
                "message": _detail_text(exc, "无权限执行该操作"),
            },
        )

    if isinstance(exc, Throttled):
        return _as_envelope(
            response,
            {
                "code": ErrorCode.RATE_LIMITED,
                "message": _detail_text(exc, "请求过于频繁，请稍后重试"),
            },
        )

    status_code = response.status_code
    default_code = ErrorCode.SERVER_ERROR if status_code >= 500 else ErrorCode.INVALID_PARAM
    return _as_envelope(
        response,
        {
            "code": STATUS_TO_ERROR_CODE.get(status_code, default_code),
            "message": _detail_text(exc, "请求失败"),
        },
    )
