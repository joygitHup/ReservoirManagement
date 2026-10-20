"""告警过滤集：查询参数与前端字段对齐。"""

import django_filters

from apps.alerts.constants import AlertLevel, AlertStatus, AlertType
from apps.alerts.models import AlertRecord


class AlertFilter(django_filters.FilterSet):
    """支持 level / status / type / reservoir 过滤。"""

    level = django_filters.ChoiceFilter(field_name="level", choices=AlertLevel.choices)
    status = django_filters.ChoiceFilter(field_name="status", choices=AlertStatus.choices)
    type = django_filters.ChoiceFilter(field_name="type", choices=AlertType.choices)
    reservoir = django_filters.UUIDFilter(field_name="reservoir_id")
    reservoirCode = django_filters.CharFilter(field_name="reservoir__code")

    class Meta:
        model = AlertRecord
        fields = ["level", "status", "type", "reservoir", "reservoirCode"]
