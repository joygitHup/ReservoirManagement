#!/usr/bin/env python
"""Django 管理入口。"""
import os
import sys


def main() -> None:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:  # pragma: no cover - 环境缺失时提示
        raise ImportError(
            "无法导入 Django，请确认已安装依赖并激活虚拟环境："
            "pip install -r requirements/dev.txt"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
