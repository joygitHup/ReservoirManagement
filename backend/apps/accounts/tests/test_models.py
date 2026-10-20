"""用户模型测试。"""

import pytest

from apps.accounts.constants import UserRole
from apps.accounts.models import User


@pytest.mark.django_db
def test_default_role_is_viewer():
    user = User.objects.create_user(username="u1", password="pass-123456")

    assert user.role == UserRole.VIEWER
    assert user.is_admin is False


@pytest.mark.django_db
def test_superuser_is_admin():
    user = User.objects.create_superuser(username="root", password="pass-123456", email="a@b.com")

    assert user.is_admin is True
