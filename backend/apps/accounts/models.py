"""用户模型：沿用 AbstractUser，扩展角色与联系方式。"""

from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.accounts.constants import UserRole


class User(AbstractUser):
    phone = models.CharField("联系电话", max_length=20, blank=True, default="")
    role = models.CharField(
        "角色",
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.VIEWER,
        db_index=True,
    )

    class Meta:
        db_table = "accounts_user"
        verbose_name = "用户"
        verbose_name_plural = "用户"

    def __str__(self) -> str:
        return self.username

    @property
    def is_admin(self) -> bool:
        return self.is_superuser or self.role == UserRole.ADMIN
