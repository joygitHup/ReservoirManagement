"""告警路由。"""

from rest_framework.routers import DefaultRouter

from apps.alerts.views import AlertViewSet

router = DefaultRouter()
router.register("alerts", AlertViewSet, basename="alert")

urlpatterns = router.urls
