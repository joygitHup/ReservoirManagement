"""水库序列化器。"""

from apps.reservoirs.serializers.measurement import MeasurementSerializer
from apps.reservoirs.serializers.reservoir import (
    ReservoirDetailSerializer,
    ReservoirListSerializer,
    ReservoirWriteSerializer,
)

__all__ = [
    "MeasurementSerializer",
    "ReservoirDetailSerializer",
    "ReservoirListSerializer",
    "ReservoirWriteSerializer",
]
