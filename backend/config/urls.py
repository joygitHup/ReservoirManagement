"""URL 入口：统一路由装配（标准 18.2）。"""

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from common.health import HealthView, LivenessView, ReadinessView

urlpatterns = [
    path("admin/", admin.site.urls),
    # 业务 API（v1）
    path("api/v1/", include("apps.accounts.urls")),
    path("api/v1/", include("apps.reservoirs.urls")),
    path("api/v1/", include("apps.alerts.urls")),
    # OpenAPI 契约（标准 8.3）
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
    # 健康检查（标准 22.3，免认证）
    path("health/", HealthView.as_view(), name="health"),
    path("health/live/", LivenessView.as_view(), name="health-live"),
    path("health/ready/", ReadinessView.as_view(), name="health-ready"),
]
