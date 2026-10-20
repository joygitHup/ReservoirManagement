"""认证视图：只做编排，令牌签发/注销委托给服务层（标准 1.1 / 5.4）。"""

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.serializers.auth import LoginSerializer, LogoutSerializer, TokenPairSerializer
from apps.accounts.serializers.user import UserSerializer
from apps.accounts.services.auth import blacklist_refresh_token, issue_token_pair
from common.audit import write_audit_log
from common.constants import AuditAction
from common.throttles import SensitiveRateThrottle


@extend_schema(tags=["auth"])
class LoginView(APIView):
    """账号密码登录，返回 JWT 令牌对。"""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_classes = [SensitiveRateThrottle]

    @extend_schema(
        summary="登录",
        request=LoginSerializer,
        responses={200: TokenPairSerializer},
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        tokens = issue_token_pair(user)
        write_audit_log(
            action=AuditAction.USER_LOGIN,
            target_type="user",
            target_id=user.id,
            actor=user,
            request=request,
        )
        return Response({**tokens, "user": UserSerializer(user, context={"request": request}).data})


@extend_schema(tags=["auth"])
class RefreshView(TokenRefreshView):
    """用 refresh token 换取新的 access token。"""

    @extend_schema(summary="刷新令牌", responses={200: dict})
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


@extend_schema(tags=["auth"])
class LogoutView(APIView):
    """登出：把 refresh token 加入黑名单。"""

    permission_classes = [IsAuthenticated]

    @extend_schema(summary="登出", request=LogoutSerializer, responses={200: dict})
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        blacklist_refresh_token(serializer.validated_data.get("refresh", ""))
        write_audit_log(
            action=AuditAction.USER_LOGOUT,
            target_type="user",
            target_id=request.user.id,
            actor=request.user,
            request=request,
        )
        return Response({"detail": "已登出"})


@extend_schema(tags=["auth"])
class MeView(APIView):
    """当前登录用户信息。"""

    permission_classes = [IsAuthenticated]

    @extend_schema(summary="当前用户", responses={200: UserSerializer})
    def get(self, request):
        return Response(UserSerializer(request.user, context={"request": request}).data)
