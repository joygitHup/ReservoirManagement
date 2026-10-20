# 后端实现方案：Django + DRF（backend/）

## 一、Context（背景与目标）

前端 `ReservoirManagement` 目前是纯前端应用，数据来自 [reservoirs.ts](file:///e:/pythonDev/reserManger/ReservoirManagement/src/data/reservoirs.ts) 的运行时随机模拟（20 座水库、告警、历史序列、概览统计）。本任务在 `e:\pythonDev\reserManger\ReservoirManagement\backend` 下新建后端工程，用 **Django 5 + DRF** 提供与前端功能一一对应的 REST API，并严格遵循两份文档：

- 主标准：《Django + DRF 项目编码标准 v1.0》（分层、契约、性能、安全基线）
- 补充要求：MUST/SHOULD/MAY 分级、工具链映射、脚手架、状态机、审计日志、数据治理、前后端契约等

**已确认决策：** dev 用 SQLite、prod 用 PostgreSQL（`DATABASE_URL` 切换）；包含完整 JWT 认证与权限分级；交付深度为「核心 API + 标准工程化」（不含 Celery/Redis/Sentry/Prometheus/Docker）；生成种子数据复刻前端演示内容。

**最终产出：** 一个可 `python manage.py runserver` 直接启动、含 20 座水库演示数据、带 OpenAPI 文档与 pytest 测试的后端服务，前端无需改动即可对接。

---

## 二、目录结构

```
backend/
├── manage.py
├── pyproject.toml                 # ruff / mypy / pytest 配置
├── .env.example  .gitignore  README.md  Makefile
├── requirements/{base,dev,prod}.txt
├── config/                        # 工程配置（标准 18.1）
│   ├── settings/{__init__,base,dev,prod,test}.py
│   ├── urls.py  wsgi.py  asgi.py
│   └── middleware.py              # RequestIDMiddleware（18.4）
├── common/                        # 跨 app 共享层
│   ├── models.py                  # BaseModel（软删除 + 时间戳，2.3/10.2）
│   ├── constants.py               # ErrorCode（7.2）
│   ├── exceptions.py              # BusinessError + exception_handler（8.1）
│   ├── pagination.py              # StandardPagination（8.1/19.2）
│   ├── renderers.py               # 统一响应封装（8.1）
│   ├── permissions.py             # IsAdminOrOperator / IsAdmin / IsOwnerOrStaff（4.8）
│   ├── throttles.py               # 各档限流（19.3）
│   ├── health.py                  # /health /health/ready /health/live（22.3）
│   ├── utils/timeutils.py         # 纯函数时间工具（6.2）
│   └── tests/{__init__,test_health}.py
└── apps/
    ├── accounts/                  # 用户与认证
    │   ├── models.py              # User(AbstractUser) + role
    │   ├── constants.py  permissions.py  filters.py
    │   ├── serializers/{__init__,user,auth}.py
    │   ├── views/{__init__,auth,user}.py
    │   ├── services/auth.py       # 登出/黑名单
    │   ├── urls.py  migrations/  tests/
    ├── reservoirs/                # 水库领域
    │   ├── models.py              # Reservoir + ReservoirMeasurement + QuerySet
    │   ├── constants.py           # 状态/类型/区域枚举（7.1）
    │   ├── filters.py             # ReservoirFilter
    │   ├── serializers/{__init__,reservoir,measurement}.py
    │   ├── views/{__init__,reservoir,stats}.py
    │   ├── services/reservoirs.py # 状态计算、历史聚合
    │   ├── management/commands/seed_demo_data.py  # 种子数据（支持 --dry-run/--batch-size/--flush）
    │   ├── urls.py  migrations/  tests/
    └── alerts/                     # 告警领域
        ├── models.py              # AlertRecord + QuerySet（含状态字段）
        ├── constants.py           # 告警类型/等级/状态枚举
        ├── filters.py             # AlertFilter
        ├── serializers/{__init__,alert}.py
        ├── views/{__init__,alert,stats}.py
        ├── services/alerts.py     # 状态流转 + 审计日志（5.1/11.2 补充）
        ├── urls.py  migrations/  tests/
```

> 遵循 14.1：`serializers/`、`views/` 一律拆包；命名严格按 14.2（`XxxListSerializer`/`XxxWriteSerializer`/`XxxViewSet`/`XxxFilter`）。

---

## 三、数据模型

**common.BaseModel**：`created_at`、`updated_at`、`is_deleted`、`deleted_at`；`SoftDeleteQuerySet.as_manager()` 默认过滤已删除；`delete()` 重写为软删除（2.3）。

**accounts.User**：继承 `AbstractUser`，新增 `role`（`TextChoices`：`admin/operator/viewer`）、`phone`。开局即设 `AUTH_USER_MODEL`（Django 最佳实践）。

**reservoirs.Reservoir**（字段对齐前端 `Reservoir` 接口）：`code`(唯一,如 `RSV-0001`)、`name`、`location`、`region`、`type`、`capacity`、死/正常/汛限/警戒/保证水位、`current_water_level`、`current_storage`、`inflow`、`outflow`、`rainfall`、`device_status`、`status`、`update_time`、`longitude`/`latitude`、责任人/电话、`description`。`Meta.indexes`：`region/type/status/device_status`；(2.4)。`clean()` 校验水位关系（2.2）。

**reservoirs.ReservoirMeasurement**：`reservoir` FK、`measured_at`、`water_level`、`storage`、`inflow`、`outflow`、`rainfall`；索引 `(reservoir, -measured_at)`。承载历史趋势序列。

**alerts.AlertRecord**：`code`、`reservoir` FK、`type`、`level`、`value`、`threshold`、`unit`、`message`、`status`、`create_time`、`confirm_time`、`resolve_time`、`handler` FK(User, null)。查询方法 `for_reservoir()`、`unconfirmed()`（2.1）。

**common（审计）**：`AuditLog`（actor/action/target_type/target_id/before/after/ip/created_at），告警状态流转与登录时写入，不可改删（补充文档第 12 条）。

**状态机**：`status` 用 `TextChoices`；流转在 `alerts/services/alerts.py` 中以 `@transaction.atomic` 实现 `confirm_alert()` / `resolve_alert()`，非法流转抛 `BusinessError`，并写审计（补充文档第 11 条）。

---

## 四、API 端点（对齐前端功能）

统一前缀 `/api/v1/`，`DefaultRouter` 自动生成（18.2）。

**Reservoirs** `reservoirs/`
- `GET /` 列表：过滤 `region/type/status/deviceStatus`、搜索 `name/location`、排序 `currentWaterLevel/-updateTime`、分页 `page/pageSize` → 对应左侧列表
- `GET /{id}/` 详情
- `POST|PUT|PATCH|DELETE` 增删改（需 `admin/operator`）
- `GET /{id}/history/?range=1h|24h|7d` → 对应历史趋势图（`generateHistoryData`）
- `GET /overview/` → 概览统计（total/normal/warning/danger/offline/onlineRate）
- `GET /by-region/` → 区域分组
- `GET /water-level-ranking/?limit=8` → 水位占比排行（Dashboard）

**Alerts** `alerts/`
- `GET /` 列表：过滤 `level/status/type/reservoir`、搜索 `reservoirName/message`、排序 `-createTime` → 告警中心
- `GET /{id}/` · `POST /` · `PATCH /{id}/`
- `POST /{id}/confirm/`（unconfirmed→processing）、`POST /{id}/resolve/`（→resolved）
- `GET /trend/?days=7` → 告警趋势图

**Auth** `auth/`
- `POST /login/`（返回 access/refresh）、`POST /refresh/`、`POST /logout/`（refresh 入黑名单）、`GET /me/`

**System**
- `/health/`、`/health/ready/`、`/health/live/`（免认证，22.3）
- `/api/schema/`、`/api/docs/`（drf-spectacular）

**统一响应**：`{code, message, data}`；分页 `data:{list,total,page,pageSize}`；异常 `{code, message, errors}`（8.1）。

---

## 五、标准落地要点（回应两份文档）

| 条款 | 落地 |
|------|------|
| 分层原则（§1） | View 只编排；业务在 Service；纯函数在 Utils；枚举文案在 Constants；Serializer 不查库 |
| Serializer 拆场景（3.1） | 每模型 `List/Detail/Write` 三件套，`get_serializer_class` 按 action 切换（4.3） |
| 预加载（4.2/15.1） | `get_queryset` 内 `select_related`；按 `self.action` 分支 |
| 查询数上限（15.3） | 用 `assertNumQueries` 在测试卡住（列表 ≤3、详情 ≤5） |
| 事务（5.4/10.1） | `@transaction.atomic` 装饰 Service，不装饰 View |
| 并发写（5.2） | `get_or_create` + `UniqueConstraint` |
| 时间（6.2） | 统一 `timezone.now()`、`timezone.localtime` |
| 错误码（7.2） | `common/constants.py` 集中 `ErrorCode` + `BusinessError` |
| 限流（19.3） | `common/throttles.py` 各档位，全局配默认 |
| 认证安全（§9/21） | simplejwt（access 15min/refresh 7d）、CORS 白名单、安全头、脱敏手机号 |
| Settings 分层（18.1） | `base/dev/prod/test`，`SECRET_KEY` 无默认值，全部走 env |
| 中间件（18.4） | `RequestIDMiddleware` 生成 `X-Request-Id` |
| OpenAPI（8.3） | 每个 ViewSet `@extend_schema_view`，CI `spectacular --validate` |
| 测试（§13/23） | Model/Serializer/View/Service 四层 + 覆盖率门槛 |
| 工具链映射 | `pyproject.toml` 配 ruff(T201/E722)+mypy；`Makefile` 汇总；CI 校验 `makemigrations --check`、schema、pytest-cov |
| 依赖策略 | `requirements/{base,dev,prod}.txt` 分层；`psycopg[binary]` 仅 prod |
| 脚手架/示例 | 目录即脚手架；README 含 onboarding 步骤 |

---

## 六、依赖与运行

- `base`：`Django>=5.0,<5.2`、`djangorestframework`、`djangorestframework-simplejwt`、`django-cors-headers`、`django-filter`、`drf-spectacular`、`django-environ`
- `dev`：`ruff`、`mypy`、`django-stubs`、`pytest`、`pytest-django`、`factory_boy`、`coverage`、`django-debug-toolbar`
- `prod`：`gunicorn`、`psycopg[binary]`

启动：`pip install -r requirements/dev.txt` → `python manage.py migrate` → `python manage.py seed_demo_data` → `python manage.py runserver 8000`。

---

## 七、实施步骤

1. 建工程骨架：`manage.py`、`config/settings/{base,dev,prod,test}.py`、`urls/wsgi/asgi`、`middleware.py`、`requirements`、`pyproject.toml`、`.env.example`、`.gitignore`、`Makefile`、`README.md`
2. `common` 共享层：`BaseModel`、`ErrorCode/BusinessError`、`StandardPagination`、统一 renderer、`exception_handler`、`permissions`、`throttles`、`health`、`timeutils`、`AuditLog`
3. `apps/accounts`：自定义 User、JWT 登录/刷新/登出/me、角色权限
4. `apps/reservoirs`：模型 + QuerySet + 过滤 + Serializer 三件套 + ViewSet + 统计 views + history
5. `apps/alerts`：模型 + QuerySet + 过滤 + Serializer + ViewSet + 状态流转 Service + trend
6. 迁移 + `seed_demo_data` 命令（20 座水库/告警/历史点，`--dry-run/--batch-size/--flush`）
7. 测试：models/serializers/views/services + `assertNumQueries`；`Makefile`/CI 配置
8. 自检：`ruff check`、`mypy`、`pytest`、`spectacular --validate`、`makemigrations --check`

---

## 八、验证方式

1. 安装依赖 → `migrate` → `seed_demo_data` 无错；`sqlite3` 确认 20 行水库。
2. `python manage.py test` / `pytest` 全绿（含查询数断言与权限用例 401/403/404/400）。
3. `runserver` 后逐一验证：
   - `curl /api/v1/reservoirs/?region=华东&pageSize=5` → 统一信封 + 分页结构
   - `curl /api/v1/reservoirs/overview/` → 统计字段齐全
   - `curl /api/v1/reservoirs/{id}/history/?range=24h` → 时间序列
   - `curl /api/v1/reservoirs/water-level-ranking/` → 排行数据
   - `curl /api/v1/alerts/`、`/alerts/trend/`
   - `POST /api/v1/auth/login/` 取 token → 带 token 对写接口 `POST` 成功 201，无 token 401
   - `POST /api/v1/alerts/{id}/confirm/` → 状态流转并写审计
   - `/api/docs/` 可打开、`/health/ready/` 返回依赖状态
4. 浏览器打开 `/api/docs/`（Swagger）核对契约与前端字段命名一致。
