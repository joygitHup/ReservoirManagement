"""生产环境配置：PostgreSQL + 安全头 + 严格来源白名单。"""

from .base import *  # noqa: F403
from .base import env

DEBUG = False

# SECRET_KEY 禁止有默认值，缺失时启动报错（标准 18.1）
SECRET_KEY = env("DJANGO_SECRET_KEY")

ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=[])

# 生产必须提供 PostgreSQL 连接串
DATABASES = {"default": env.db("DATABASE_URL")}

# 数据库连接复用（标准 20.2）
DATABASES["default"]["CONN_MAX_AGE"] = env.int("DB_CONN_MAX_AGE", default=600)

# 安全头（标准 21.2）
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = env.bool("DJANGO_SECURE_SSL_REDIRECT", default=True)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])
