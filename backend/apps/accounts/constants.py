"""账号常量：角色枚举（标准 7.1）。"""

from django.db import models


class UserRole(models.TextChoices):
    """系统角色：管理员 / 操作员 / 只读用户。"""

    ADMIN = "admin", "管理员"
    OPERATOR = "operator", "操作员"
    VIEWER = "viewer", "只读用户"
