"""告警后台管理。"""

from django.contrib import admin

from apps.alerts.models import AlertRecord


@admin.register(AlertRecord)
class AlertRecordAdmin(admin.ModelAdmin):
    list_display = ("code", "reservoir", "type", "level", "status", "create_time")
    list_filter = ("type", "level", "status")
    search_fields = ("code", "reservoir__name", "message")
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "create_time"
