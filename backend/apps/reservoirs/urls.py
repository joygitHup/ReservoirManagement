"""水库路由。"""

from rest_framework.routers import DefaultRouter

from apps.reservoirs.views import ReservoirViewSet

router = DefaultRouter()
router.register("reservoirs", ReservoirViewSet, basename="reservoir")

urlpatterns = router.urls
