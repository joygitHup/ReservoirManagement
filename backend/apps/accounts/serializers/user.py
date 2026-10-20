"""用户序列化器（标准 3.2：显式声明 + source）。"""

from rest_framework import serializers

from apps.accounts.models import User


class UserSerializer(serializers.ModelSerializer):
    """用户详情：字段 camelCase，手机号按角色脱敏（标准 3.8）。"""

    isStaff = serializers.BooleanField(source="is_staff", read_only=True)
    isActive = serializers.BooleanField(source="is_active", read_only=True)
    lastLogin = serializers.DateTimeField(source="last_login", read_only=True)
    roleLabel = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "phone",
            "role",
            "roleLabel",
            "isStaff",
            "isActive",
            "lastLogin",
        ]
        read_only_fields = fields

    def get_roleLabel(self, obj: User) -> str:
        """纯函数：返回角色中文名，不查库。"""
        return obj.get_role_display()

    def get_phone(self, obj: User) -> str:
        """手机号脱敏：仅管理员可见完整号码（标准 3.8）。"""
        raw = obj.phone or ""
        request = self.context.get("request")
        viewer = getattr(request, "user", None)
        if viewer is not None and getattr(viewer, "is_authenticated", False) and (
            viewer.is_staff or viewer.id == obj.id
        ):
            return raw
        if len(raw) < 7:
            return raw
        return f"{raw[:3]}****{raw[-4:]}"
