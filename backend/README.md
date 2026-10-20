# 智慧水库综合管理系统 — 后端（Django + DRF）

面向水利管理部门、水库运维单位、防汛指挥中心的 WebGIS 后端服务，为前端 `ReservoirManagement`（Next.js）提供水库、实时监测、告警、统计等 REST API。开发严格遵循《Django + DRF 项目编码标准 v1.0》。

## 技术栈

| 组件 | 版本策略 |
|------|----------|
| Python | 3.12+ |
| Django | 5.2 LTS |
| DRF | 3.15+ |
| 数据库 | dev: SQLite / prod: PostgreSQL 15+ |
| 认证 | djangorestframework-simplejwt（JWT） |
| 文档 | drf-spectacular（OpenAPI 3） |

## 环境要求

- Python 3.12 及以上
- 生产环境需 PostgreSQL 15+（开发环境用 SQLite，无需额外服务）

## 快速开始

```bash
cd backend

# 1. 建虚拟环境并安装依赖
python -m venv .venv
.venv\Scripts\activate            # Windows；Linux/macOS: source .venv/bin/activate
pip install -r requirements/dev.txt

# 2. 准备环境变量
copy .env.example .env            # Linux/macOS: cp .env.example .env

# 3. 初始化数据库并写入演示数据
python manage.py migrate
python manage.py seed_demo_data --flush

# 4. 启动（默认 8000）
python manage.py runserver 8000
```

打开 <http://127.0.0.1:8000/api/docs/> 查看 Swagger 交互式文档。

演示账号（由 `seed_demo_data` 创建）：

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | Admin@12345 | 管理员 |
| operator | Operator@12345 | 操作员 |
| viewer | Viewer@12345 | 只读 |

## 环境变量

| 变量 | 说明 | 默认 |
|------|------|------|
| `DJANGO_SETTINGS_MODULE` | 配置模块 | `config.settings.dev` |
| `DJANGO_SECRET_KEY` | 密钥，生产必填无默认 | dev 有不安全默认值 |
| `DJANGO_DEBUG` | 调试开关 | dev 为 true |
| `DJANGO_ALLOWED_HOSTS` | 允许主机，逗号分隔 | dev 为 `*` |
| `DATABASE_URL` | 数据库连接串 | dev 为 SQLite |
| `CORS_ALLOWED_ORIGINS` | 前端来源白名单 | `localhost:5000` |
| `CORS_ALLOW_ALL_ORIGINS` | dev 放行全部来源 | dev 为 true |

> 生产环境务必设置真实 `DJANGO_SECRET_KEY` 与 `DATABASE_URL`，并使用 `config.settings.prod`。

## 常用命令

```bash
python manage.py migrate                 # 迁移
python manage.py seed_demo_data --flush  # 种子数据（支持 --dry-run / --batch-size / --flush）
python manage.py runserver 8000          # 开发服务
pytest --cov                             # 测试 + 覆盖率
ruff check .                             # 静态检查
mypy apps common                         # 类型检查
python manage.py spectacular --file schema.yml --validate   # OpenAPI 校验
python manage.py makemigrations --check --dry-run           # 迁移一致性
```

## 持续集成

`backend/.github/workflows/ci.yml` 定义了质量门禁（迁移一致性 → ruff → mypy → pytest+覆盖率 → OpenAPI 校验），对应标准第 28.2 节的「标准条款 ↔ 强制工具」映射。

> GitHub Actions 只读取仓库根目录的 `.github/workflows/`，本仓库根目录是前端工程，因此要让流水线生效需将该文件移动到 `<repo-root>/.github/workflows/ci.yml`（内容无需改动，其中 `working-directory: backend` 已指向本工程）。

## API 一览（前缀 `/api/v1/`）

统一响应格式：`{ "code": 0, "message": "ok", "data": ... }`；分页为 `data.{list,total,page,pageSize}`；异常为 `{code, message, errors?}`。

**认证** `/api/v1/auth/`
- `POST login/` `POST refresh/` `POST logout/` `GET me/`

**水库** `/api/v1/reservoirs/`
- `GET /`（过滤 `region/type/status/deviceStatus`、搜索 `name/location`、排序 `currentWaterLevel/-updateTime`、分页 `page/pageSize`）
- `GET|PUT|PATCH|DELETE /{id}/`
- `GET /{id}/history/?range=1h|24h|7d`（历史趋势）
- `GET /overview/`（概览统计） `GET /by-region/`（区域分组） `GET /water-level-ranking/`（水位占比排行）

**告警** `/api/v1/alerts/`
- `GET /`（过滤 `level/status/type/reservoir`、搜索 `reservoirName/message`）
- `GET|PATCH /{id}/` `POST /`
- `POST /{id}/confirm/`（未确认→处理中） `POST /{id}/resolve/`（→已解决）
- `GET /trend/?days=7`（告警趋势）

**系统**：`/health/` `/health/live/` `/health/ready/`、`/api/schema/`、`/api/docs/`

## 权限模型

- 读操作开放（匿名可读，符合标准 19.3「匿名读」档位）
- 写操作需 JWT 认证 + 角色：`admin` / `operator` 可写，`viewer` 只读

## 目录结构

```
backend/
├── config/            # 工程配置：settings 分层、urls、wsgi/asgi、middleware
├── common/            # 共享层：BaseModel、错误码、分页、渲染器、异常、权限、限流、健康检查、审计
├── apps/
│   ├── accounts/      # 用户与 JWT 认证
│   ├── reservoirs/    # 水库 + 监测数据 + 统计 + 种子命令
│   └── alerts/        # 告警 + 状态流转
├── requirements/      # base / dev / prod 分层依赖
├── manage.py  pyproject.toml  Makefile  .env.example
```

分层遵循标准第 1 条：Model 管数据、Serializer 管塑形校验、View 管编排权限、Service 管副作用、Utils 管纯计算、Constants 管枚举文案。

## 部署（生产）

```bash
pip install -r requirements/prod.txt
export DJANGO_SETTINGS_MODULE=config.settings.prod
export DJANGO_SECRET_KEY=<随机 64 位>
export DATABASE_URL=postgres://user:password@host:5432/reservoir
python manage.py migrate
python manage.py collectstatic --noinput
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

## 前端对接

前端当前使用 `src/data/reservoirs.ts` 的本地模拟数据。切换到后端只需将数据读取替换为 `fetch`，字段命名为 camelCase，与前端 `Reservoir` / `AlertRecord` 接口对齐（见上述 API 一览）。

对接要点：

1. **ID 映射**：接口每次返回 `id`（UUID，主键，用于所有 URL 路径）与 `code`（业务编号，如 `RSV-0001` / `ALT-0001`，用于界面展示）。前端 mock 中的 `RSV-0001` 对应本服务的 `code`，**请求路径必须用 `id`**。
2. **枚举取值**：`status` / `deviceStatus` / `level` / `alert.type` 用英文代码；`region` / `type`（水库类型）直接用中文（如 `?region=华东`），与前端筛选一致。中英文对照由各 Serializer 的 `statusLabel` / `levelLabel` 等字段提供。
3. **统计口径**：`/overview/` 返回 `{total, normal, warning, danger, offline, onlineRate}`；`/water-level-ranking/` 的 `ratio = currentWaterLevel / warningLevel × 100`（占警戒水位百分比），与前端 `DashboardStats` 完全一致。
4. **认证**：读接口匿名可用；写接口需在 `Authorization: Bearer <access>` 中携带 JWT（`POST /auth/login/` 获取，access 15 分钟、refresh 7 天）。
5. **跨域**：dev 已放开全部来源；生产需把前端域名加入 `CORS_ALLOWED_ORIGINS`。
6. **类型生成**（标准 33.1）：可用 `npx openapi-typescript http://127.0.0.1:8000/api/schema/ -o src/types/api.ts` 由 OpenAPI 契约自动生成前端类型。

