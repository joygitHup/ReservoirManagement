"""统一分页（标准 8.1 / 19.2）。"""

from rest_framework.pagination import PageNumberPagination

from common.renderers import EnvelopeResponse


class StandardPagination(PageNumberPagination):
    """页码分页：参数 `page` / `pageSize`，强制 `max_page_size` 防大页攻击。"""

    page_size = 20
    page_size_query_param = "pageSize"
    max_page_size = 100
    page_query_param = "page"

    def get_paginated_response(self, data):
        return EnvelopeResponse(
            {
                "code": 0,
                "message": "ok",
                "data": {
                    "list": data,
                    "total": self.page.paginator.count,
                    "page": self.page.number,
                    "pageSize": self.get_page_size(self.request),
                },
            }
        )

    def get_paginated_response_schema(self, schema):
        """让 OpenAPI 契约与信封分页结构保持一致（标准 8.3）。"""
        return {
            "type": "object",
            "properties": {
                "code": {"type": "integer"},
                "message": {"type": "string"},
                "data": {
                    "type": "object",
                    "properties": {
                        "list": schema,
                        "total": {"type": "integer"},
                        "page": {"type": "integer"},
                        "pageSize": {"type": "integer"},
                    },
                },
            },
        }
