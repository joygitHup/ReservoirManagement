"""共享模型：软删除基类与审计日志（标准 2.3 / 10.2；补充文档第 12 条）。"""

import uuid

from django.db import models
from django.utils import timezone


class SoftDeleteQuerySet(models.QuerySet):
    """支持软删除的 QuerySet。"""

    def delete(self):
        """批量软删除。"""
        return super().update(is_deleted=True, deleted_at=timezone.now())

    def hard_delete(self):
        """物理删除（谨慎使用）。"""
        return super().delete()

    def alive(self):
        return self.filter(is_deleted=False)

    def dead(self):
        return self.filter(is_deleted=True)


class BaseModel(models.Model):
    """抽象基类：UUID 主键 + 时间戳 + 软删除。

    - `objects` 默认过滤已删除记录
    - `delete()` 重写为软删除
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]

    def delete(self, using=None, keep_parents=False):  # noqa: DJ012
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at", "updated_at"])

    def hard_delete(self, using=None, keep_parents=False):
        super().delete(using=using, keep_parents=keep_parents)


class AuditLog(models.Model):
    """审计日志：谁、何时、对什么、做了什么、结果如何。

    审计日志不可修改、不可删除（补充文档第 12 条）。
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="audit_logs",
        verbose_name="操作人",
    )
    action = models.CharField("动作", max_length=64, db_index=True)
    target_type = models.CharField("目标类型", max_length=64)
    target_id = models.CharField("目标标识", max_length=64)
    before = models.JSONField("变更前", null=True, blank=True)
    after = models.JSONField("变更后", null=True, blank=True)
    ip = models.GenericIPAddressField("来源 IP", null=True, blank=True)
    request_id = models.CharField("请求 ID", max_length=64, blank=True, default="")
    created_at = models.DateTimeField("发生时间", auto_now_add=True, db_index=True)

    class Meta:
        db_table = "common_audit_log"
        ordering = ["-created_at"]
        verbose_name = "审计日志"
        verbose_name_plural = "审计日志"
        indexes = [models.Index(fields=["target_type", "target_id"])]

    def __str__(self) -> str:
        return f"{self.action} -> {self.target_type}:{self.target_id}"

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise RuntimeError("审计日志不可修改")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise RuntimeError("审计日志不可删除")
