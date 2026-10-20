"""告警状态流转与接口测试。"""

import pytest
from rest_framework.test import APIClient

from apps.accounts.constants import UserRole
from apps.accounts.models import User
from apps.alerts.constants import AlertLevel, AlertStatus, AlertType
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
    )


@pytest.fixture
def operator_client(db) -> APIClient:
    User.objects.create_user(
        username="operator", password="Operator@12345", role=UserRole.OPERATOR
    )
    client = APIClient()
    tokens = client.post(
        "/api/v1/auth/login/",
        {"username": "operator", "password": "Operator@12345"},
        format="json",
    ).json()["data"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    return client


@pytest.mark.django_db
def test_list_alerts_is_public(alert):
    response = APIClient().get("/api/v1/alerts/")

    assert response.status_code == 200
    body = response.json()["data"]
    assert body["total"] == 1
    assert body["list"][0]["reservoirName"] == "测试水库"


@pytest.mark.django_db
def test_filter_alerts_by_status(alert):
    AlertRecord.objects.create(
        code="ALT-0002",
        reservoir=alert.reservoir,
        type=AlertType.DEVICE_OFFLINE,
        level=AlertLevel.WARNING,
        status=AlertStatus.RESOLVED,
        message="设备离线",
    )

    response = APIClient().get("/api/v1/alerts/", {"status": "resolved"})

    assert response.json()["data"]["total"] == 1
    assert response.json()["data"]["list"][0]["code"] == "ALT-0002"


@pytest.mark.django_db
def test_confirm_requires_authentication(alert):
    response = APIClient().post(f"/api/v1/alerts/{alert.id}/confirm/")

    assert response.status_code == 401


@pytest.mark.django_db
def test_detail_is_public_and_enveloped(alert):
    """告警自带 code/message 字段，响应仍必须是外层信封（回归用例）。"""
    response = APIClient().get(f"/api/v1/alerts/{alert.id}/")

    assert response.status_code == 200
    body = response.json()
    assert body["code"] == 0
    assert body["message"] == "ok"
    assert body["data"]["code"] == "ALT-0001"
    assert body["data"]["message"] == "水位超过保证水位"


@pytest.mark.django_db
def test_confirm_transitions_to_processing(operator_client, alert):
    response = operator_client.post(f"/api/v1/alerts/{alert.id}/confirm/")

    alert.refresh_from_db()
    assert response.status_code == 200
    assert alert.status == AlertStatus.PROCESSING
    assert alert.confirmed_at is not None
    assert alert.handler is not None
    body = response.json()
    assert body["code"] == 0
    assert body["data"]["status"] == AlertStatus.PROCESSING
    assert body["data"]["statusLabel"] == "处理中"


@pytest.mark.django_db
def test_confirm_twice_returns_conflict(operator_client, alert):
    operator_client.post(f"/api/v1/alerts/{alert.id}/confirm/")

    response = operator_client.post(f"/api/v1/alerts/{alert.id}/confirm/")

    assert response.status_code == 409
    assert response.json()["code"] == 40901


@pytest.mark.django_db
def test_resolve_from_unconfirmed_returns_conflict(operator_client, alert):
    response = operator_client.post(f"/api/v1/alerts/{alert.id}/resolve/")

    assert response.status_code == 409


@pytest.mark.django_db
def test_confirm_then_resolve(operator_client, alert):
    operator_client.post(f"/api/v1/alerts/{alert.id}/confirm/")

    response = operator_client.post(f"/api/v1/alerts/{alert.id}/resolve/")

    alert.refresh_from_db()
    assert response.status_code == 200
    assert alert.status == AlertStatus.RESOLVED
    assert alert.resolved_at is not None


@pytest.mark.django_db
def test_trend_returns_seven_days(alert):
    response = APIClient().get("/api/v1/alerts/trend/")

    assert response.status_code == 200
    points = response.json()["data"]["points"]
    assert len(points) == 7
    assert points[-1]["danger"] == 1


@pytest.mark.django_db
def test_write_actions_forbidden_for_viewer(alert):
    User.objects.create_user(username="viewer2", password="Viewer@12345", role=UserRole.VIEWER)
    client = APIClient()
    tokens = client.post(
        "/api/v1/auth/login/",
        {"username": "viewer2", "password": "Viewer@12345"},
        format="json",
    ).json()["data"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    response = client.post(f"/api/v1/alerts/{alert.id}/confirm/")

    assert response.status_code == 403
