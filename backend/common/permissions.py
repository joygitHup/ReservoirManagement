"""通用权限类：角色分级与对象级归属校验（标准 4.8）。"""

from rest_framework.permissions import BasePermission

from apps.accounts.constants import UserRole


class IsAdmin(BasePermission):
    """仅管理员（或超级用户）。"""

    message = "仅管理员可执行该操作"

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_superuser or getattr(user, "role", None) == UserRole.ADMIN)
        )


class IsAdminOrOperator(BasePermission):
    """管理员或操作员：写操作的最低门槛。"""

    message = "仅管理员或操作员可执行该操作"

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return bool(
            user.is_superuser
            or getattr(user, "role", None) in {UserRole.ADMIN, UserRole.OPERATOR}
        )


class IsOwnerOrStaff(BasePermission):
    """对象级：本人或工作人员可访问。"""

    message = "无权访问该资源"

    def has_object_permission(self, request, view, obj) -> bool:
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_staff:
            return True
        return getattr(obj, "owner_id", None) == user.id
