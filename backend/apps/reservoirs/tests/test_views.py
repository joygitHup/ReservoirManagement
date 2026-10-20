"""水库接口测试：权限分级、统一信封、分页、过滤与查询数断言（标准 13.2 / 15.1）。"""

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.constants import UserRole
from apps.accounts.models import User
from apps.reservoirs.constants import (
    DeviceStatus,
    ReservoirRegion,
    ReservoirStatus,
    ReservoirType,
)
from apps.reservoirs.models import Reservoir, ReservoirMeasurement
from common.constants import AuditAction, ErrorCode
from common.models import AuditLog

pytestmark = pytest.mark.django_db


@pytest.fixture
def reservoir() -> Reservoir:
    return Reservoir.objects.create(
        code="RSV-0001",
        name="新安江水库",
        location="浙江省杭州市建德市",
        region=ReservoirRegion.EAST,
        type=ReservoirType.LARGE,
        longitude=119.05,
        latitude=29.48,
        capacity=100000,
        warning_level=100,
        guarantee_level=105,
        current_water_level=101,
        responsible_person="张建国",
        phone="13800001234",
        status=ReservoirStatus.WARNING,
    )


def _auth_client(username: str, password: str, role: str) -> APIClient:
    User.objects.create_user(username=username, password=password, role=role)
    client = APIClient()
    tokens = client.post(
        "/api/v1/auth/login/", {"username": username, "password": password}, format="json"
    ).json()["data"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    return client


@pytest.fixture
def operator_client() -> APIClient:
    return _auth_client("operator", "Operator@12345", UserRole.OPERATOR)


@pytest.fixture
def viewer_client() -> APIClient:
    return _auth_client("viewer", "Viewer@12345", UserRole.VIEWER)


# ---------------------------------------------------------------- 读接口


def test_list_is_public_and_uses_envelope(reservoir):
    response = APIClient().get("/api/v1/reservoirs/")

    assert response.status_code == 200
    body = response.json()
    assert body["code"] == 0
    assert body["data"]["total"] == 1
    # 列表项字段对齐前端 Reservoir 契约
    item = body["data"]["list"][0]
    assert item["name"] == "新安江水库"
    assert item["coordinates"] == [119.05, 29.48]
    assert item["currentWaterLevel"] == 101.0
    assert item["deviceStatus"] == "online"
    assert item["statusLabel"] == "预警"


def test_list_supports_region_filter_and_pagination(reservoir):
    Reservoir.objects.create(
        code="RSV-0002",
        name="密云水库",
        region=ReservoirRegion.NORTH,
        type=ReservoirType.LARGE,
        longitude=116.85,
        latitude=40.48,
    )

    response = APIClient().get(
        "/api/v1/reservoirs/", {"region": ReservoirRegion.EAST, "pageSize": 1}
    )

    body = response.json()["data"]
    assert body["total"] == 1
    assert body["pageSize"] == 1
    assert body["list"][0]["code"] == "RSV-0001"


def test_retrieve_masks_phone(reservoir):
    response = APIClient().get(f"/api/v1/reservoirs/{reservoir.id}/")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["responsiblePerson"] == "张建国"
    assert data["phone"] == "138****1234"
    assert data["guaranteeLevel"] == 105.0


def test_retrieve_missing_returns_404():
    response = APIClient().get("/api/v1/reservoirs/00000000-0000-0000-0000-000000000000/")

    assert response.status_code == 404
    assert response.json()["code"] == ErrorCode.NOT_FOUND


# ---------------------------------------------------------------- 统计端点


def test_overview_is_public_and_single_query(reservoir, django_assert_num_queries):
    with django_assert_num_queries(1):
        response = APIClient().get("/api/v1/reservoirs/overview/")

    assert response.status_code == 200
    assert response.json()["data"] == {
        "total": 1,
        "normal": 0,
        "warning": 1,
        "danger": 0,
        "offline": 0,
        "onlineRate": 100.0,
    }


def test_by_region_endpoint(reservoir):
    response = APIClient().get("/api/v1/reservoirs/by-region/")

    regions = response.json()["data"]["regions"]
    assert regions[0]["region"] == ReservoirRegion.EAST
    assert regions[0]["total"] == 1


def test_water_level_ranking_limit_and_query_count(reservoir, django_assert_num_queries):
    with django_assert_num_queries(1):
        response = APIClient().get("/api/v1/reservoirs/water-level-ranking/", {"limit": 5})

    assert response.status_code == 200
    assert response.json()["data"]["list"][0]["ratio"] == 101.0


def test_water_level_ranking_rejects_invalid_limit(reservoir):
    response = APIClient().get("/api/v1/reservoirs/water-level-ranking/", {"limit": "abc"})

    # 非法参数回落为默认值，不报错
    assert response.status_code == 200


# ---------------------------------------------------------------- 历史数据


def test_history_returns_ordered_points(reservoir):
    now = timezone.now()
    ReservoirMeasurement.objects.create(reservoir=reservoir, measured_at=now - timedelta(hours=20))
    ReservoirMeasurement.objects.create(reservoir=reservoir, measured_at=now - timedelta(hours=2))
    ReservoirMeasurement.objects.create(reservoir=reservoir, measured_at=now - timedelta(days=3))

    response = APIClient().get(f"/api/v1/reservoirs/{reservoir.id}/history/", {"range": "24h"})

    data = response.json()["data"]
    assert data["range"] == "24h"
    assert data["total"] == 2
    # 时间升序，便于前端直接连线
    assert data["points"][0]["time"] < data["points"][1]["time"]


def test_history_rejects_invalid_range(reservoir):
    response = APIClient().get(f"/api/v1/reservoirs/{reservoir.id}/history/", {"range": "30d"})

    assert response.status_code == 400
    assert response.json()["code"] == ErrorCode.INVALID_PARAM


# ---------------------------------------------------------------- 写接口权限


def test_create_requires_authentication():
    payload = _payload()

    response = APIClient().post("/api/v1/reservoirs/", payload, format="json")

    assert response.status_code == 401


def test_create_forbidden_for_viewer(viewer_client):
    response = viewer_client.post("/api/v1/reservoirs/", _payload(), format="json")

    assert response.status_code == 403
    assert response.json()["code"] == ErrorCode.FORBIDDEN


def test_create_as_operator_generates_code_and_audit(operator_client):
    response = operator_client.post("/api/v1/reservoirs/", _payload(), format="json")

    assert response.status_code == 201
    created = Reservoir.objects.get(code="RSV-0001")
    assert created.name == "新建水库"
    assert created.longitude == 119.0
    log = AuditLog.objects.get(action=AuditAction.RESERVOIR_CREATE)
    assert log.target_id == str(created.id)
    assert (log.after or {})["code"] == "RSV-0001"


def test_create_requires_coordinates(operator_client):
    payload = _payload()
    payload.pop("coordinates")

    response = operator_client.post("/api/v1/reservoirs/", payload, format="json")

    assert response.status_code == 400


def test_update_as_operator_writes_audit(operator_client, reservoir):
    response = operator_client.patch(
        f"/api/v1/reservoirs/{reservoir.id}/", {"name": "新安江水库(改)"}, format="json"
    )

    reservoir.refresh_from_db()
    assert response.status_code == 200
    assert reservoir.name == "新安江水库(改)"
    assert AuditLog.objects.filter(action=AuditAction.RESERVOIR_UPDATE).count() == 1


def test_destroy_soft_deletes(operator_client, reservoir):
    response = operator_client.delete(f"/api/v1/reservoirs/{reservoir.id}/")

    assert response.status_code == 204
    assert Reservoir.objects.count() == 0
    assert Reservoir.all_objects.count() == 1


def _payload() -> dict:
    return {
        "name": "新建水库",
        "location": "测试位置",
        "region": ReservoirRegion.EAST,
        "type": ReservoirType.MEDIUM,
        "capacity": 50000,
        "warningLevel": 120,
        "guaranteeLevel": 125,
        "currentWaterLevel": 118,
        "coordinates": [119.0, 29.0],
        "deviceStatus": DeviceStatus.ONLINE,
    }
