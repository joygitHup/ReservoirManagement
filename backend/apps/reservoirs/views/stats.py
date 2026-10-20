"""水库统计视图 Mixin：自定义端点用 @action 暴露（标准 4.6）。"""

from drf_spectacular.utils import extend_schema
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.reservoirs.services.reservoirs import (
    get_overview_stats,
    get_region_stats,
    get_water_level_ranking,
)
from common.utils.params import parse_positive_int


class ReservoirStatsMixin:
    """挂载到水库 ViewSet 上的统计端点集合。"""

    @extend_schema(summary="水库概览统计", responses={200: dict}, tags=["reservoirs"])
    @action(detail=False, methods=["get"], url_path="overview")
    def overview(self, request):
        return Response(get_overview_stats())

    @extend_schema(summary="水库区域分组", responses={200: dict}, tags=["reservoirs"])
    @action(detail=False, methods=["get"], url_path="by-region")
    def by_region(self, request):
        return Response({"regions": get_region_stats()})

    @extend_schema(summary="水位占比排行", responses={200: dict}, tags=["reservoirs"])
    @action(detail=False, methods=["get"], url_path="water-level-ranking")
    def water_level_ranking(self, request):
        limit = parse_positive_int(request.query_params.get("limit"), default=8, maximum=50)
        return Response({"list": get_water_level_ranking(limit)})
