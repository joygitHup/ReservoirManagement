"""横切关注点中间件：仅生成/透传 request_id，不做业务逻辑（标准 12.3 / 18.4）。"""

import logging
import threading
import uuid

_local = threading.local()


def get_request_id() -> str:
    """返回当前线程的 request_id，供日志过滤器使用。"""
    return getattr(_local, "request_id", "-")


class RequestIDMiddleware:
    """为每个请求生成或透传 request_id，并写入响应头 X-Request-Id。"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.id = request.headers.get("X-Request-Id") or uuid.uuid4().hex
        _local.request_id = request.id
        response = self.get_response(request)
        response["X-Request-Id"] = request.id
        return response


class RequestIDLogFilter(logging.Filter):
    """把 request_id 注入日志记录，保证结构化日志可串联（标准 12.1）。"""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_request_id()
        return True
