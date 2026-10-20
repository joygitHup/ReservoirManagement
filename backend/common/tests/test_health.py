"""健康检查接口测试。"""

import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_liveness_returns_ok():
    response = APIClient().get("/health/live/")

    assert response.status_code == 200
    body = response.json()
    assert body["code"] == 0
    assert body["data"]["status"] == "ok"


@pytest.mark.django_db
def test_readiness_returns_ready():
    response = APIClient().get("/health/ready/")

    assert response.status_code == 200
    assert response.json()["data"]["status"] == "ready"


@pytest.mark.django_db
def test_health_reports_checks():
    response = APIClient().get("/health/")

    assert response.status_code == 200
    checks = response.json()["data"]["checks"]
    assert checks["database"] is True
    assert checks["cache"] is True
