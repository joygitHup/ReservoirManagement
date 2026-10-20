"""水库视图。"""

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.reservoirs.constants import HistoryRange
from apps.reservoirs.filters import ReservoirFilter
from apps.reservoirs.models import Reservoir
from apps.reservoirs.serializers import (
    MeasurementSerializer,
    ReservoirDetailSerializer,
    ReservoirListSerializer,
    ReservoirWriteSerializer,
)
from apps.reservoirs.services.reservoirs import (
    create_reservoir,
    delete_reservoir,
    get_history,
    update_reservoir,
)
from apps.reservoirs.views.stats import ReservoirStatsMixin
from common.permissions import IsAdminOrOperator
from common.throttles import WriteRateThrottle


@extend_schema_view(
    list=extend_schema(summary="水库列表", tags=["reservoirs"]),
    retrieve=extend_schema(summary="水库详情", tags=["reservoirs"]),
    create=extend_schema(summary="新建水库", tags=["reservoirs"]),
    update=extend_schema(summary="更新水库", tags=["reservoirs"]),
    partial_update=extend_schema(summary="局部更新水库", tags=["reservoirs"]),
    destroy=extend_schema(summary="删除水库", tags=["reservoirs"]),
)
class ReservoirViewSet(ReservoirStatsMixin, ModelViewSet):
    """水库 CRUD 与统计端点：读开放、写严格（标准 4.4 / 4.6）。"""

    permission_classes = [IsAuthenticatedOrReadOnly]
    filterset_class = ReservoirFilter
    search_fields = ["name", "location", "code"]
    ordering_fields = ["current_water_level", "update_time", "name", "code", "capacity"]
    ordering = ["code"]

    def get_queryset(self):
        return Reservoir.objects.all()

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return ReservoirWriteSerializer
        if self.action == "retrieve":
            return ReservoirDetailSerializer
        return ReservoirListSerializer

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsAuthenticated(), IsAdminOrOperator()]
        return super().get_permissions()

    def get_throttles(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [WriteRateThrottle()]
        return super().get_throttles()

    def perform_create(self, serializer):
        create_reservoir(serializer=serializer, actor=self.request.user, request=self.request)

    def perform_update(self, serializer):
        before = {"code": serializer.instance.code, "name": serializer.instance.name}
        update_reservoir(
            serializer=serializer,
            actor=self.request.user,
            request=self.request,
            before=before,
        )

    def perform_destroy(self, instance):
        delete_reservoir(reservoir=instance, actor=self.request.user, request=self.request)

    @extend_schema(summary="水库历史监测数据", responses={200: dict}, tags=["reservoirs"])
    @action(detail=True, methods=["get"], url_path="history")
    def history(self, request, pk=None):
        """历史趋势：按 range=1h|24h|7d 返回时间序列。"""
        reservoir = self.get_object()
        range_key = request.query_params.get("range", HistoryRange.HOUR_24.value)
        points = get_history(reservoir, range_key)
        return Response(
            {
                "range": range_key,
                "total": len(points),
                "points": MeasurementSerializer(points, many=True).data,
            }
        )
