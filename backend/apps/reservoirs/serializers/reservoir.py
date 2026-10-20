"""水库序列化器：List / Detail / Write 三件套（标准 3.1 / 3.2）。"""

from rest_framework import serializers

from apps.reservoirs.constants import DeviceStatus, ReservoirStatus
from apps.reservoirs.models import Reservoir


class ReservoirListSerializer(serializers.ModelSerializer):
    """列表场景：只暴露列表渲染所需字段。"""

    coordinates = serializers.SerializerMethodField()
    currentWaterLevel = serializers.DecimalField(
        source="current_water_level", max_digits=8, decimal_places=2, read_only=True
    )
    warningLevel = serializers.DecimalField(
        source="warning_level", max_digits=8, decimal_places=2, read_only=True
    )
    deviceStatus = serializers.CharField(source="device_status", read_only=True)
    deviceStatusLabel = serializers.SerializerMethodField()
    statusLabel = serializers.SerializerMethodField()
    updateTime = serializers.DateTimeField(source="update_time", read_only=True)

    class Meta:
        model = Reservoir
        fields = [
            "id",
            "code",
            "name",
            "location",
            "region",
            "type",
            "capacity",
            "currentWaterLevel",
            "warningLevel",
            "status",
            "statusLabel",
            "deviceStatus",
            "deviceStatusLabel",
            "updateTime",
            "coordinates",
        ]

    def get_coordinates(self, obj: Reservoir) -> list[float]:
        """纯函数：返回 [经度, 纬度]，不查库（标准 3.3）。"""
        return [float(obj.longitude), float(obj.latitude)]

    def get_statusLabel(self, obj: Reservoir) -> str:
        return ReservoirStatus(obj.status).label

    def get_deviceStatusLabel(self, obj: Reservoir) -> str:
        return DeviceStatus(obj.device_status).label


class ReservoirDetailSerializer(ReservoirListSerializer):
    """详情场景：追加水位参数、流量与联系人（手机号脱敏，标准 3.8）。"""

    deadWaterLevel = serializers.DecimalField(
        source="dead_water_level", max_digits=8, decimal_places=2, read_only=True
    )
    normalWaterLevel = serializers.DecimalField(
        source="normal_water_level", max_digits=8, decimal_places=2, read_only=True
    )
    floodLimitLevel = serializers.DecimalField(
        source="flood_limit_level", max_digits=8, decimal_places=2, read_only=True
    )
    guaranteeLevel = serializers.DecimalField(
        source="guarantee_level", max_digits=8, decimal_places=2, read_only=True
    )
    currentStorage = serializers.DecimalField(
        source="current_storage", max_digits=12, decimal_places=2, read_only=True
    )
    responsiblePerson = serializers.CharField(source="responsible_person", read_only=True)
    phone = serializers.SerializerMethodField()

    class Meta(ReservoirListSerializer.Meta):
        fields = ReservoirListSerializer.Meta.fields + [
            "deadWaterLevel",
            "normalWaterLevel",
            "floodLimitLevel",
            "guaranteeLevel",
            "currentStorage",
            "inflow",
            "outflow",
            "rainfall",
            "responsiblePerson",
            "phone",
            "description",
        ]

    def get_phone(self, obj: Reservoir) -> str:
        """责任人电话脱敏（标准 3.8）。"""
        raw = obj.phone or ""
        if len(raw) < 7:
            return raw
        return f"{raw[:3]}****{raw[-4:]}"


class ReservoirWriteSerializer(serializers.ModelSerializer):
    """写入场景：接受前端 camelCase 字段，支持 coordinates 数组。"""

    code = serializers.CharField(required=False, allow_blank=True, max_length=32)
    deadWaterLevel = serializers.DecimalField(
        source="dead_water_level", max_digits=8, decimal_places=2, required=False
    )
    normalWaterLevel = serializers.DecimalField(
        source="normal_water_level", max_digits=8, decimal_places=2, required=False
    )
    floodLimitLevel = serializers.DecimalField(
        source="flood_limit_level", max_digits=8, decimal_places=2, required=False
    )
    warningLevel = serializers.DecimalField(
        source="warning_level", max_digits=8, decimal_places=2, required=False
    )
    guaranteeLevel = serializers.DecimalField(
        source="guarantee_level", max_digits=8, decimal_places=2, required=False
    )
    currentWaterLevel = serializers.DecimalField(
        source="current_water_level", max_digits=8, decimal_places=2, required=False
    )
    currentStorage = serializers.DecimalField(
        source="current_storage", max_digits=12, decimal_places=2, required=False
    )
    inflow = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    outflow = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    rainfall = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    deviceStatus = serializers.ChoiceField(
        source="device_status", choices=DeviceStatus.choices, required=False
    )
    status = serializers.ChoiceField(choices=ReservoirStatus.choices, required=False)
    responsiblePerson = serializers.CharField(
        source="responsible_person", required=False, allow_blank=True
    )
    longitude = serializers.DecimalField(max_digits=10, decimal_places=6, required=False)
    latitude = serializers.DecimalField(max_digits=10, decimal_places=6, required=False)
    coordinates = serializers.ListField(
        child=serializers.DecimalField(max_digits=10, decimal_places=6),
        min_length=2,
        max_length=2,
        required=False,
        write_only=True,
    )

    class Meta:
        model = Reservoir
        fields = [
            "id",
            "code",
            "name",
            "location",
            "region",
            "type",
            "capacity",
            "deadWaterLevel",
            "normalWaterLevel",
            "floodLimitLevel",
            "warningLevel",
            "guaranteeLevel",
            "currentWaterLevel",
            "currentStorage",
            "inflow",
            "outflow",
            "rainfall",
            "status",
            "deviceStatus",
            "longitude",
            "latitude",
            "coordinates",
            "responsiblePerson",
            "phone",
            "description",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs: dict) -> dict:
        coords = attrs.pop("coordinates", None)
        if coords:
            attrs["longitude"], attrs["latitude"] = coords[0], coords[1]
        if self.instance is None:
            missing = [name for name in ("longitude", "latitude") if name not in attrs]
            if missing:
                raise serializers.ValidationError(
                    {"coordinates": "创建水库需提供 longitude/latitude 或 coordinates"}
                )
        return attrs
