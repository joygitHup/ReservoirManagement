"""水库历史监测数据序列化器。"""

from rest_framework import serializers

from apps.reservoirs.models import ReservoirMeasurement


class MeasurementSerializer(serializers.ModelSerializer):
    """历史数据点：与前端 HistoryDataPoint 字段对齐。"""

    time = serializers.DateTimeField(source="measured_at", read_only=True)
    waterLevel = serializers.DecimalField(
        source="water_level", max_digits=8, decimal_places=2, read_only=True
    )

    class Meta:
        model = ReservoirMeasurement
        fields = ["id", "time", "waterLevel", "storage", "inflow", "outflow", "rainfall"]
        read_only_fields = fields
