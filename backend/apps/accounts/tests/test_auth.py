"""认证接口测试（标准 13：含正常/异常/权限分支）。"""

import pytest
from rest_framework.response import Response
from rest_framework.test import APIClient

from apps.accounts.constants import UserRole
from apps.accounts.models import User

LOGIN_URL = "/api/v1/auth/login/"


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def admin_user(db) -> User:
    return User.objects.create_user(
        username="admin", password="Admin@12345", role=UserRole.ADMIN
    )


def _login(api_client: APIClient, username: str, password: str) -> Response:
    response = api_client.post(
        LOGIN_URL, {"username": username, "password": password}, format="json"
    )
    return response


@pytest.mark.django_db
def test_login_returns_token_pair(api_client, admin_user):
    response = _login(api_client, "admin", "Admin@12345")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["access"]
    assert data["refresh"]
    assert data["user"]["role"] == UserRole.ADMIN


@pytest.mark.django_db
def test_login_with_wrong_password_returns_401(api_client, admin_user):
    response = _login(api_client, "admin", "wrong-password")

    assert response.status_code == 401
    assert response.json()["code"] == 40101


@pytest.mark.django_db
def test_login_with_missing_field_returns_400(api_client):
    response = api_client.post(LOGIN_URL, {"username": "admin"}, format="json")

    assert response.status_code == 400
    assert response.json()["code"] == 40001
    assert "password" in response.json()["errors"]


@pytest.mark.django_db
def test_me_requires_authentication(api_client):
    response = api_client.get("/api/v1/auth/me/")

    assert response.status_code == 401


@pytest.mark.django_db
def test_me_returns_current_user(api_client, admin_user):
    tokens = _login(api_client, "admin", "Admin@12345").json()["data"]
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    response = api_client.get("/api/v1/auth/me/")

    assert response.status_code == 200
    assert response.json()["data"]["username"] == "admin"


@pytest.mark.django_db
def test_logout_blacklists_refresh_token(api_client, admin_user):
    tokens = _login(api_client, "admin", "Admin@12345").json()["data"]
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    response = api_client.post(
        "/api/v1/auth/logout/", {"refresh": tokens["refresh"]}, format="json"
    )

    assert response.status_code == 200

    api_client.credentials()
    reused = api_client.post(
        "/api/v1/auth/refresh/", {"refresh": tokens["refresh"]}, format="json"
    )
    assert reused.status_code == 401


@pytest.mark.django_db
def test_users_endpoint_forbidden_for_viewer(api_client):
    User.objects.create_user(username="viewer", password="Viewer@12345", role=UserRole.VIEWER)
    tokens = _login(api_client, "viewer", "Viewer@12345").json()["data"]
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    response = api_client.get("/api/v1/users/")

    assert response.status_code == 403
    assert response.json()["code"] == 40301
