"""告警序列化器：List / Detail / Write 三件套（标准 3.1 / 3.2）。"""

from rest_framework import serializers

from apps.alerts.constants import AlertLevel, AlertStatus, AlertType
from apps.alerts.models import AlertRecord
from apps.reservoirs.models import Reservoir


class AlertListSerializer(serializers.ModelSerializer):
    """告警列表：字段与前端 AlertRecord 对齐。"""

    reservoirId = serializers.UUIDField(source="reservoir_id", read_only=True)
    reservoirName = serializers.CharField(source="reservoir.name", read_only=True)
    createTime = serializers.DateTimeField(source="create_time", read_only=True)
    levelLabel = serializers.SerializerMethodField()
    statusLabel = serializers.SerializerMethodField()
    typeLabel = serializers.SerializerMethodField()

    class Meta:
        model = AlertRecord
        fields = [
            "id",
            "code",
            "reservoirId",
            "reservoirName",
            "type",
            "typeLabel",
            "level",
            "levelLabel",
            "value",
            "threshold",
            "unit",
            "message",
            "status",
            "statusLabel",
            "createTime",
        ]

    def get_levelLabel(self, obj: AlertRecord) -> str:
        return AlertLevel(obj.level).label

    def get_statusLabel(self, obj: AlertRecord) -> str:
        return AlertStatus(obj.status).label

    def get_typeLabel(self, obj: AlertRecord) -> str:
        return AlertType(obj.type).label


class AlertDetailSerializer(AlertListSerializer):
    """告警详情：追加确认/解决时间与处理人。"""

    confirmTime = serializers.DateTimeField(source="confirmed_at", read_only=True)
    resolveTime = serializers.DateTimeField(source="resolved_at", read_only=True)
    handler = serializers.CharField(source="handler.username", read_only=True, default="")

    class Meta(AlertListSerializer.Meta):
        fields = AlertListSerializer.Meta.fields + ["confirmTime", "resolveTime", "handler"]


class AlertWriteSerializer(serializers.ModelSerializer):
    """告警写入：状态变更走 confirm/resolve 端点，不在此处开放。"""

    reservoir = serializers.PrimaryKeyRelatedField(queryset=Reservoir.objects.all())

    class Meta:
        model = AlertRecord
        fields = ["id", "reservoir", "type", "level", "value", "threshold", "unit", "message"]
        read_only_fields = ["id"]
