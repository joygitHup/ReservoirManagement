"""水库过滤集：查询参数与前端筛选字段对齐（camelCase）。"""

import django_filters

from apps.reservoirs.constants import DeviceStatus, ReservoirStatus
from apps.reservoirs.models import Reservoir


class ReservoirFilter(django_filters.FilterSet):
    """支持 region / type / status / deviceStatus 及水位区间过滤。"""

    region = django_filters.CharFilter(field_name="region", lookup_expr="exact")
    type = django_filters.CharFilter(field_name="type", lookup_expr="exact")
    status = django_filters.ChoiceFilter(field_name="status", choices=ReservoirStatus.choices)
    deviceStatus = django_filters.ChoiceFilter(
        field_name="device_status", choices=DeviceStatus.choices
    )
    minWaterLevel = django_filters.NumberFilter(
        field_name="current_water_level", lookup_expr="gte"
    )
    maxWaterLevel = django_filters.NumberFilter(
        field_name="current_water_level", lookup_expr="lte"
    )

    class Meta:
        model = Reservoir
        fields = ["region", "type", "status", "deviceStatus", "minWaterLevel", "maxWaterLevel"]
