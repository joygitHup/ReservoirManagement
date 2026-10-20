"""水库领域服务测试：状态推导、历史聚合、统计与编号生成（标准 13.2）。"""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.reservoirs.constants import (
    DeviceStatus,
    ReservoirRegion,
    ReservoirStatus,
    ReservoirType,
)
from apps.reservoirs.models import Reservoir, ReservoirMeasurement
from apps.reservoirs.services.reservoirs import (
    _next_reservoir_code,
    calculate_status,
    get_history,
    get_overview_stats,
    get_region_stats,
    get_water_level_ranking,
)
from common.exceptions import BusinessError

pytestmark = pytest.mark.django_db


def make_reservoir(**overrides) -> Reservoir:
    data = {
        "code": "RSV-0001",
        "name": "测试水库",
        "region": ReservoirRegion.EAST,
        "type": ReservoirType.LARGE,
        "longitude": 119.05,
        "latitude": 29.48,
        "warning_level": 100,
        "guarantee_level": 105,
        "current_water_level": 95,
    }
    data.update(overrides)
    return Reservoir.objects.create(**data)


# ---------------------------------------------------------------- 状态推导


def test_calculate_status_normal():
    assert calculate_status(make_reservoir(current_water_level=95)) == ReservoirStatus.NORMAL


def test_calculate_status_warning():
    assert calculate_status(make_reservoir(current_water_level=101)) == ReservoirStatus.WARNING


def test_calculate_status_danger():
    assert calculate_status(make_reservoir(current_water_level=106)) == ReservoirStatus.DANGER


def test_calculate_status_offline_wins_over_level():
    reservoir = make_reservoir(
        current_water_level=110, device_status=DeviceStatus.OFFLINE
    )

    assert calculate_status(reservoir) == ReservoirStatus.OFFLINE


# ---------------------------------------------------------------- 历史数据


def test_get_history_filters_by_range():
    reservoir = make_reservoir()
    now = timezone.now()
    ReservoirMeasurement.objects.create(reservoir=reservoir, measured_at=now, water_level=95)
    ReservoirMeasurement.objects.create(
        reservoir=reservoir, measured_at=now - timedelta(hours=5), water_level=94
    )
    ReservoirMeasurement.objects.create(
        reservoir=reservoir, measured_at=now - timedelta(hours=48), water_level=93
    )
    ReservoirMeasurement.objects.create(
        reservoir=reservoir, measured_at=now - timedelta(hours=200), water_level=92
    )

    points_1h = get_history(reservoir, "1h")
    points_7d = get_history(reservoir, "7d")

    assert len(points_1h) == 1
    # 7d=168h：包含 0/5/48 小时三个点，排除 200 小时前的点
    assert len(points_7d) == 3
    # 结果按时间升序，供前端直接连线
    assert [p.measured_at for p in points_7d] == sorted(p.measured_at for p in points_7d)


def test_get_history_rejects_invalid_range():
    reservoir = make_reservoir()

    with pytest.raises(BusinessError) as exc:
        get_history(reservoir, "30d")

    assert exc.value.error_code == 40001


# ---------------------------------------------------------------- 统计


def test_overview_stats_matches_frontend_shape():
    make_reservoir(code="RSV-0001", status=ReservoirStatus.NORMAL)
    make_reservoir(code="RSV-0002", status=ReservoirStatus.WARNING)
    make_reservoir(
        code="RSV-0003",
        status=ReservoirStatus.OFFLINE,
        device_status=DeviceStatus.OFFLINE,
    )

    stats = get_overview_stats()

    assert stats == {
        "total": 3,
        "normal": 1,
        "warning": 1,
        "danger": 0,
        "offline": 1,
        "onlineRate": 66.7,
    }


def test_region_stats_groups_by_region():
    make_reservoir(code="RSV-0001", region=ReservoirRegion.EAST)
    make_reservoir(
        code="RSV-0002", region=ReservoirRegion.EAST, status=ReservoirStatus.DANGER
    )

    rows = {row["region"]: row for row in get_region_stats()}

    assert rows[ReservoirRegion.EAST]["total"] == 2
    assert rows[ReservoirRegion.EAST]["danger"] == 1


def test_water_level_ranking_orders_by_ratio_and_limits():
    make_reservoir(code="RSV-0001", current_water_level=80, warning_level=100)
    make_reservoir(code="RSV-0002", current_water_level=120, warning_level=100)
    make_reservoir(code="RSV-0003", current_water_level=100, warning_level=100)

    ranking = get_water_level_ranking(limit=2)

    assert [item["code"] for item in ranking] == ["RSV-0002", "RSV-0003"]
    assert ranking[0]["ratio"] == 120.0


def test_ranking_handles_zero_warning_level():
    make_reservoir(code="RSV-0001", warning_level=0)

    ranking = get_water_level_ranking()

    assert ranking[0]["ratio"] == 0.0


# ---------------------------------------------------------------- 编号生成


def test_next_reservoir_code_is_unique_and_skips_deleted():
    make_reservoir(code="RSV-0001")
    deleted = make_reservoir(code="RSV-0002")
    deleted.delete()

    assert _next_reservoir_code() == "RSV-0003"
