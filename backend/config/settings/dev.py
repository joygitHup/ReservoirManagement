"""开发环境配置：SQLite + 宽松跨域 + 调试工具。"""

from .base import *  # noqa: F403
from .base import BASE_DIR, env

DEBUG = env.bool("DJANGO_DEBUG", default=True)

# 开发环境允许不显式提供密钥；生产环境（prod.py）禁止默认值（标准 18.1）
SECRET_KEY = env("DJANGO_SECRET_KEY", default="dev-insecure-secret-key-do-not-use-in-prod")

ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["*"])

# 开发默认使用 SQLite（已确认决策：dev=SQLite / prod=PostgreSQL）
DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default=f"sqlite:///{(BASE_DIR / 'db.sqlite3').as_posix()}",
    ),
}

# 开发环境放行前端调试来源（标准 21.1 生产环境仍走白名单）
CORS_ALLOW_ALL_ORIGINS = env.bool("CORS_ALLOW_ALL_ORIGINS", default=True)

INTERNAL_IPS = ["127.0.0.1"]

INSTALLED_APPS += ["django.contrib.admindocs"]  # noqa: F405

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
