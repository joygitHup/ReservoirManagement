"""水库模型测试。"""

import pytest
from django.core.exceptions import ValidationError

from apps.reservoirs.constants import ReservoirRegion, ReservoirType
from apps.reservoirs.models import Reservoir


def _make(**overrides) -> Reservoir:
    data = {
        "code": "RSV-0001",
        "name": "测试水库",
        "region": ReservoirRegion.EAST,
        "type": ReservoirType.LARGE,
        "longitude": 119.05,
        "latitude": 29.48,
    }
    data.update(overrides)
    return Reservoir(**data)


@pytest.mark.django_db
def test_soft_delete_hides_from_default_manager():
    reservoir = _make()
    reservoir.save()

    reservoir.delete()

    assert Reservoir.objects.count() == 0
    assert Reservoir.all_objects.count() == 1
    assert reservoir.is_deleted is True
    assert reservoir.deleted_at is not None


def test_clean_rejects_invalid_water_levels():
    reservoir = _make(dead_water_level=100, normal_water_level=90)

    with pytest.raises(ValidationError) as exc:
        reservoir.clean()

    assert "dead_water_level" in exc.value.message_dict


def test_clean_rejects_warning_above_guarantee():
    reservoir = _make(warning_level=110, guarantee_level=105)

    with pytest.raises(ValidationError) as exc:
        reservoir.clean()

    assert "warning_level" in exc.value.message_dict


@pytest.mark.django_db
def test_queryset_helpers():
    _make(code="RSV-0001", region=ReservoirRegion.EAST).save()
    _make(code="RSV-0002", region=ReservoirRegion.NORTH).save()

    assert Reservoir.objects.by_region(ReservoirRegion.EAST).count() == 1
    assert Reservoir.objects.online_devices().count() == 2
