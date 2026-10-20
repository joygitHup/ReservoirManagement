"""认证相关序列化器。"""

from django.contrib.auth import authenticate
from rest_framework import serializers

from apps.accounts.serializers.user import UserSerializer
from common.constants import ErrorCode
from common.exceptions import BusinessError


class LoginSerializer(serializers.Serializer):
    """登录入参：校验并把 user 注入 validated_data。"""

    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs: dict) -> dict:
        user = authenticate(
            request=self.context.get("request"),
            username=attrs["username"],
            password=attrs["password"],
        )
        if user is None:
            raise BusinessError(
                "用户名或密码错误",
                error_code=ErrorCode.UNAUTHORIZED,
                status_code=401,
            )
        if not user.is_active:
            raise BusinessError(
                "账号已被禁用",
                error_code=ErrorCode.FORBIDDEN,
                status_code=403,
            )
        attrs["user"] = user
        return attrs


class TokenPairSerializer(serializers.Serializer):
    """登录出参：访问令牌 + 刷新令牌 + 当前用户。"""

    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)
    user = UserSerializer(read_only=True)


class LogoutSerializer(serializers.Serializer):
    """登出入参：可选携带 refresh token 以加入黑名单。"""

    refresh = serializers.CharField(required=False, allow_blank=True)
