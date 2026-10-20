"""测试环境配置：内存数据库 + 快哈希 + 关闭限流。"""

from .base import *  # noqa: F403
from .base import REST_FRAMEWORK

DEBUG = False
# ≥32 字节，避免 simplejwt 的 InsecureKeyLengthWarning（标准 9.1）
SECRET_KEY = "test-only-secret-key-with-enough-length-for-hs256"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

CACHES = {
    "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"},
}

# 测试中放宽限流，避免用例被 429 干扰
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_THROTTLE_RATES": {
        "anon": "10000/hour",
        "user": "10000/hour",
        "write": "10000/hour",
        "sensitive": "10000/hour",
        "export": "10000/hour",
    },
}
