"""健康检查：进程存活与依赖就绪（标准 22.3）。"""

from django.core.cache import cache
from django.db import connections
from django.db.utils import OperationalError
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from config.settings.base import APP_VERSION


def _check_database() -> bool:
    try:
        connections["default"].cursor()
        return True
    except OperationalError:
        return False


def _check_cache() -> bool:
    try:
        cache.set("health:ping", "pong", timeout=5)
        return cache.get("health:ping") == "pong"
    except Exception:  # noqa: BLE001 - 健康检查需吞掉所有依赖异常
        return False


class _BaseHealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_classes: list = []


@extend_schema(summary="综合健康检查", responses={200: dict, 503: dict}, tags=["system"])
class HealthView(_BaseHealthView):
    """综合健康检查：返回数据库与缓存状态。"""

    def get(self, request):
        db_ok = _check_database()
        cache_ok = _check_cache()
        healthy = db_ok and cache_ok
        payload = {
            "status": "ok" if healthy else "degraded",
            "version": APP_VERSION,
            "checks": {"database": db_ok, "cache": cache_ok},
        }
        return Response(
            payload,
            status=status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE,
        )


@extend_schema(summary="存活探针", responses={200: dict}, tags=["system"])
class LivenessView(_BaseHealthView):
    """存活探针：进程可响应即 200，不检查依赖。"""

    def get(self, request):
        return Response({"status": "ok", "version": APP_VERSION})


@extend_schema(summary="就绪探针", responses={200: dict, 503: dict}, tags=["system"])
class ReadinessView(_BaseHealthView):
    """就绪探针：依赖可用方可接流量。"""

    def get(self, request):
        ready = _check_database() and _check_cache()
        return Response(
            {"status": "ready" if ready else "not_ready"},
            status=status.HTTP_200_OK if ready else status.HTTP_503_SERVICE_UNAVAILABLE,
        )
