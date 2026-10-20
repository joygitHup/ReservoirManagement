"""账号后台管理。"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from apps.accounts.constants import UserRole
from apps.accounts.models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "role", "phone", "is_staff", "is_active")
    list_filter = ("role", "is_staff", "is_active")
    search_fields = ("username", "email", "phone")
    # 显式声明 fieldsets，避免依赖 django-stubs 对 BaseUserAdmin.fieldsets 的宽松类型
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("个人信息", {"fields": ("first_name", "last_name", "email", "phone")}),
        ("角色与权限", {"fields": ("role", "is_active", "is_staff", "is_superuser")}),
        ("重要日期", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("username", "password1", "password2", "role", "phone"),
            },
        ),
    )

    @admin.display(description="角色")
    def role_display(self, obj: User) -> str:
        return UserRole(obj.role).label if obj.role else ""
