"""公共配置：不含任何环境相关密钥值（标准 18.1）。"""

from datetime import timedelta
from pathlib import Path

import environ
from corsheaders.defaults import default_headers

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")

APP_NAME = "智慧水库综合管理系统"
APP_VERSION = "1.0.0"

# ---------------------------------------------------------------- 应用
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # 三方
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    # 共享层与业务领域
    "common",
    "apps.accounts",
    "apps.reservoirs",
    "apps.alerts",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # 自定义横切关注点（标准 18.4）：仅生成 request_id，不做业务逻辑
    "config.middleware.RequestIDMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ---------------------------------------------------------------- 数据库
DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default=f"sqlite:///{(BASE_DIR / 'db.sqlite3').as_posix()}",
    ),
}

# ---------------------------------------------------------------- 认证
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------- 国际化
LANGUAGE_CODE = "zh-hans"
TIME_ZONE = "Asia/Shanghai"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------- 静态/媒体
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------- DRF
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    # 读开放、写严格（标准 4.4）；写操作在各 ViewSet 的 get_permissions 中收紧
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    "DEFAULT_PAGINATION_CLASS": "common.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    # 前端期望数值型，Decimal 统一序列化为 float
    "COERCE_DECIMAL_TO_STRING": False,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "common.renderers.StandardJSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
    "EXCEPTION_HANDLER": "common.exceptions.exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    # 速率档位（标准 19.3）
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/hour",
        "user": "1000/hour",
        "write": "100/hour",
        "sensitive": "10/hour",
        "export": "5/hour",
    },
}

# ---------------------------------------------------------------- JWT（标准 9.1 / 21.3）
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# ---------------------------------------------------------------- CORS（标准 21.1）
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:5000", "http://127.0.0.1:5000"],
)
CORS_ALLOW_HEADERS = (*default_headers, "idempotency-key")

# ---------------------------------------------------------------- OpenAPI（标准 8.3）
SPECTACULAR_SETTINGS = {
    "TITLE": f"{APP_NAME} API",
    "DESCRIPTION": "面向水利管理部门、水库运维单位、防汛指挥中心的 WebGIS 后端 API。",
    "VERSION": APP_VERSION,
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "SCHEMA_PATH_PREFIX": "/api/v1",
    "SORT_OPERATION_PARAMETERS": False,
    # 消除同名 choices 的枚举命名冲突（标准 8.3：契约组件名稳定可预测）
    "ENUM_NAME_OVERRIDES": {
        "ReservoirTypeEnum": "apps.reservoirs.constants.ReservoirType.choices",
        "ReservoirRegionEnum": "apps.reservoirs.constants.ReservoirRegion.choices",
        "ReservoirStatusEnum": "apps.reservoirs.constants.ReservoirStatus.choices",
        "DeviceStatusEnum": "apps.reservoirs.constants.DeviceStatus.choices",
        "HistoryRangeEnum": "apps.reservoirs.constants.HistoryRange.choices",
        "AlertTypeEnum": "apps.alerts.constants.AlertType.choices",
        "AlertLevelEnum": "apps.alerts.constants.AlertLevel.choices",
        "AlertStatusEnum": "apps.alerts.constants.AlertStatus.choices",
        "UserRoleEnum": "apps.accounts.constants.UserRole.choices",
    },
}

# ---------------------------------------------------------------- 缓存（标准 20.3）
CACHES = {
    "default": {
        "BACKEND": env(
            "CACHE_BACKEND", default="django.core.cache.backends.locmem.LocMemCache"
        ),
        "LOCATION": env("CACHE_LOCATION", default="reservoir-default"),
    }
}

# ---------------------------------------------------------------- 日志（标准 12.1）
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "request_id": {"()": "config.middleware.RequestIDLogFilter"},
    },
    "formatters": {
        "verbose": {
            "format": "%(asctime)s %(levelname)s %(name)s [rid=%(request_id)s] %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "filters": ["request_id"],
            "formatter": "verbose",
        },
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django.request": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        "apps": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}
