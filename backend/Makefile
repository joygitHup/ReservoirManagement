.PHONY: help install migrate seed run test lint fmt typecheck schema check clean

PY ?= python
SETTINGS ?= config.settings.dev

help:
	@echo "install     安装开发依赖"
	@echo "migrate     执行数据库迁移"
	@echo "seed        生成演示种子数据"
	@echo "run         启动开发服务器 (8000)"
	@echo "test        运行 pytest（含覆盖率）"
	@echo "lint        ruff 静态检查"
	@echo "fmt         ruff 格式化"
	@echo "typecheck   mypy 类型检查"
	@echo "schema      导出并校验 OpenAPI schema"
	@echo "check       迁移一致性 + Django 系统检查"

install:
	$(PY) -m pip install -r requirements/dev.txt

migrate:
	DJANGO_SETTINGS_MODULE=$(SETTINGS) $(PY) manage.py migrate

seed:
	DJANGO_SETTINGS_MODULE=$(SETTINGS) $(PY) manage.py seed_demo_data --flush

run:
	DJANGO_SETTINGS_MODULE=$(SETTINGS) $(PY) manage.py runserver 8000

test:
	pytest --cov --cov-report=term-missing

lint:
	ruff check .

fmt:
	ruff format .

typecheck:
	mypy apps common

schema:
	DJANGO_SETTINGS_MODULE=$(SETTINGS) $(PY) manage.py spectacular --file schema.yml --validate

check:
	DJANGO_SETTINGS_MODULE=$(SETTINGS) $(PY) manage.py makemigrations --check --dry-run
	DJANGO_SETTINGS_MODULE=$(SETTINGS) $(PY) manage.py check

clean:
	rm -rf .pytest_cache .mypy_cache .ruff_cache htmlcov .coverage
