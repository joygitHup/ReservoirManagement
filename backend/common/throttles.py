"""限流档位（标准 19.3）。"""

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class WriteRateThrottle(UserRateThrottle):
    """写操作档位：登录用户按 scope=write 计数。"""

    scope = "write"


class SensitiveRateThrottle(AnonRateThrottle):
    """敏感接口档位：登录等按 scope=sensitive 计数。"""

    scope = "sensitive"


class ExportRateThrottle(UserRateThrottle):
    """导出接口档位：按 scope=export 计数。"""

    scope = "export"
