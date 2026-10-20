"""告警模型与状态机测试。"""

import pytest
from django.utils import timezone

from apps.alerts.constants import AlertLevel, AlertType
from apps.alerts.models import AlertRecord
from apps.reservoirs.constants import ReservoirRegion, ReservoirStatus, ReservoirType
from apps.reservoirs.models import Reservoir


@pytest.fixture
def reservoir(db) -> Reservoir:
    return Reservoir.objects.create(
        code="RSV-0001",
        name="测试水库",
        region=ReservoirRegion.EAST,
        type=ReservoirType.LARGE,
        longitude=119.05,
        latitude=29.48,
        status=ReservoirStatus.DANGER,
    )


@pytest.fixture
def alert(reservoir) -> AlertRecord:
    return AlertRecord.objects.create(
        code="ALT-0001",
        reservoir=reservoir,
        type=AlertType.WATER_LEVEL,
        level=AlertLevel.DANGER,
        value=110,
        threshold=105,
        unit="m",
        message="水位超过保证水位",
        create_time=timezone.now(),
    )


@pytest.mark.django_db
def test_queryset_filters(alert, reservoir):
    assert AlertRecord.objects.unconfirmed().count() == 1
    assert AlertRecord.objects.for_reservoir(reservoir.id).count() == 1
    assert AlertRecord.objects.opened().count() == 1


@pytest.mark.django_db
def test_soft_delete_hides_record(alert):
    alert.delete()

    assert AlertRecord.objects.count() == 0
    assert AlertRecord.all_objects.count() == 1
    assert alert.is_deleted is True
