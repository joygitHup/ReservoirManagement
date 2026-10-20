"""水库后台管理。"""

from django.contrib import admin

from apps.reservoirs.models import Reservoir, ReservoirMeasurement


@admin.register(Reservoir)
class ReservoirAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "region", "type", "status", "device_status", "update_time")
    list_filter = ("region", "type", "status", "device_status")
    search_fields = ("code", "name", "location")
    readonly_fields = ("created_at", "updated_at")


@admin.register(ReservoirMeasurement)
class ReservoirMeasurementAdmin(admin.ModelAdmin):
    list_display = ("reservoir", "measured_at", "water_level", "inflow", "outflow", "rainfall")
    list_filter = ("measured_at",)
    search_fields = ("reservoir__code", "reservoir__name")
