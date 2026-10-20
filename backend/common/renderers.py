"""统一响应信封渲染器（标准 8.1）。"""

from typing import Any

from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response


class EnvelopeResponse(Response):
    """已按统一信封 `{code, message, data}` 组织好的响应，渲染器原样输出。

    通过类本身（而非载荷里的键名）区分，避免与业务字段
    （如告警的 `code` / `message`）产生歧义。
    """


class StandardJSONRenderer(JSONRenderer):
    """把普通载荷包装为 `{code, message, data}`。

    仅 `EnvelopeResponse` / 异常处理器产出的信封会被原样透传，
    其余一律包裹，保证前端拿到稳定结构。
    """

    def render(
        self,
        data: Any,
        accepted_media_type: str | None = None,
        renderer_context: dict | None = None,
    ) -> bytes:
        context = renderer_context or {}
        if isinstance(context.get("response"), EnvelopeResponse):
            payload = data
        else:
            payload = {"code": 0, "message": "ok", "data": data}
        return super().render(payload, accepted_media_type, renderer_context)
