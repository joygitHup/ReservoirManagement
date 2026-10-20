"""告警视图。"""

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.alerts.filters import AlertFilter
from apps.alerts.models import AlertRecord
from apps.alerts.serializers import (
    AlertDetailSerializer,
    AlertListSerializer,
    AlertWriteSerializer,
)
from apps.alerts.services.alerts import confirm_alert, create_alert, resolve_alert
from apps.alerts.views.stats import AlertStatsMixin
from common.permissions import IsAdminOrOperator
from common.throttles import WriteRateThrottle

# 写动作集合：写操作需认证 + 角色（读开放、写严格，标准 4.4）
WRITE_ACTIONS = {"create", "partial_update", "confirm", "resolve"}


@extend_schema_view(
    list=extend_schema(summary="告警列表", tags=["alerts"]),
    retrieve=extend_schema(summary="告警详情", tags=["alerts"]),
    create=extend_schema(summary="新建告警", tags=["alerts"]),
    partial_update=extend_schema(summary="更新告警", tags=["alerts"]),
)
class AlertViewSet(AlertStatsMixin, ModelViewSet):
    """告警查询与状态流转端点。"""

    permission_classes = [IsAuthenticatedOrReadOnly]
    filterset_class = AlertFilter
    search_fields = ["reservoir__name", "message", "code"]
    ordering_fields = ["create_time", "level", "status"]
    ordering = ["-create_time"]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        return AlertRecord.objects.select_related("reservoir", "handler")

    def get_serializer_class(self):
        if self.action in {"create", "partial_update"}:
            return AlertWriteSerializer
        if self.action == "retrieve":
            return AlertDetailSerializer
        return AlertListSerializer

    def get_permissions(self):
        if self.action in WRITE_ACTIONS:
            return [IsAuthenticated(), IsAdminOrOperator()]
        return super().get_permissions()

    def get_throttles(self):
        if self.action in WRITE_ACTIONS:
            return [WriteRateThrottle()]
        return super().get_throttles()

    def perform_create(self, serializer):
        create_alert(serializer=serializer, actor=self.request.user, request=self.request)

    @extend_schema(
        summary="确认告警", request=None, responses={200: AlertDetailSerializer}, tags=["alerts"]
    )
    @action(detail=True, methods=["post"], url_path="confirm")
    def confirm(self, request, pk=None):
        """未确认 -> 处理中。"""
        alert = self.get_object()
        updated = confirm_alert(alert=alert, actor=request.user, request=request)
        return Response(AlertDetailSerializer(updated).data)

    @extend_schema(
        summary="解决告警", request=None, responses={200: AlertDetailSerializer}, tags=["alerts"]
    )
    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        """处理中 -> 已解决。"""
        alert = self.get_object()
        updated = resolve_alert(alert=alert, actor=request.user, request=request)
        return Response(AlertDetailSerializer(updated).data)
