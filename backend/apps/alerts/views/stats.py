"""告警统计视图 Mixin。"""

from drf_spectacular.utils import extend_schema
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.alerts.services.alerts import get_alert_trend
from common.utils.params import parse_positive_int


class AlertStatsMixin:
    """挂载到告警 ViewSet 上的统计端点。"""

    @extend_schema(summary="告警趋势", responses={200: dict}, tags=["alerts"])
    @action(detail=False, methods=["get"], url_path="trend")
    def trend(self, request):
        days = parse_positive_int(request.query_params.get("days"), default=7, maximum=30)
        return Response({"days": days, "points": get_alert_trend(days)})
