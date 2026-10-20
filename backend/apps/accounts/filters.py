"""账号过滤集。"""

import django_filters

from apps.accounts.models import User


class UserFilter(django_filters.FilterSet):
    """用户列表过滤：角色与启用状态。"""

    role = django_filters.CharFilter(field_name="role", lookup_expr="exact")
    isActive = django_filters.BooleanFilter(field_name="is_active")

    class Meta:
        model = User
        fields = ["role", "isActive"]
