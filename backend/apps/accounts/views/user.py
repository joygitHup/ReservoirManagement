"""用户视图：只读，仅管理员可访问。"""

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.viewsets import ReadOnlyModelViewSet

from apps.accounts.filters import UserFilter
from apps.accounts.models import User
from apps.accounts.serializers.user import UserSerializer
from common.permissions import IsAdmin


@extend_schema_view(
    list=extend_schema(summary="用户列表", tags=["accounts"]),
    retrieve=extend_schema(summary="用户详情", tags=["accounts"]),
)
class UserViewSet(ReadOnlyModelViewSet):
    """用户查询接口（管理端）。"""

    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    filterset_class = UserFilter
    search_fields = ["username", "email", "phone"]
    ordering_fields = ["date_joined", "username"]
    ordering = ["-date_joined"]

    def get_queryset(self):
        return User.objects.all().order_by("-date_joined")
