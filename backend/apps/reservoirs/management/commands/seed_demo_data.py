"""生成演示种子数据，复刻前端 src/data/reservoirs.ts 的演示内容。

用法：
    python manage.py seed_demo_data --flush
    python manage.py seed_demo_data --dry-run
    python manage.py seed_demo_data --batch-size 1000 --seed 20260101
"""

import math
import random
from datetime import timedelta
from decimal import Decimal
from typing import Any

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandParser
from django.db import transaction
from django.utils import timezone

from apps.accounts.constants import UserRole
from apps.alerts.constants import AlertLevel, AlertStatus, AlertType
from apps.alerts.models import AlertRecord
from apps.reservoirs.constants import (
    DeviceStatus,
    ReservoirRegion,
    ReservoirStatus,
    ReservoirType,
)
from apps.reservoirs.models import Reservoir, ReservoirMeasurement
from apps.reservoirs.services.reservoirs import calculate_status

DEMO_USERS: list[dict[str, Any]] = [
    {
        "username": "admin",
        "password": "Admin@12345",
        "role": UserRole.ADMIN,
        "phone": "13800000001",
        "is_staff": True,
        "is_superuser": True,
    },
    {
        "username": "operator",
        "password": "Operator@12345",
        "role": UserRole.OPERATOR,
        "phone": "13800000002",
        "is_staff": True,
        "is_superuser": False,
    },
    {
        "username": "viewer",
        "password": "Viewer@12345",
        "role": UserRole.VIEWER,
        "phone": "13800000003",
        "is_staff": False,
        "is_superuser": False,
    },
]

RESPONSIBLE_PERSONS = ["张建国", "李志强", "王海涛", "刘建军", "陈明华", "赵伟峰"]

# 与前端 reservoirNames 保持一致：名称 / 位置 / 区域 / 经纬度
RESERVOIR_SEEDS: list[dict[str, Any]] = [
    {"name": "新安江水库", "location": "浙江省杭州市建德市",
     "region": ReservoirRegion.EAST, "coords": (119.05, 29.48)},
    {"name": "丹江口水库", "location": "湖北省十堰市丹江口市",
     "region": ReservoirRegion.CENTRAL, "coords": (111.15, 32.55)},
    {"name": "三峡水库", "location": "湖北省宜昌市",
     "region": ReservoirRegion.CENTRAL, "coords": (110.75, 30.83)},
    {"name": "小浪底水库", "location": "河南省济源市",
     "region": ReservoirRegion.NORTH, "coords": (112.35, 34.92)},
    {"name": "密云水库", "location": "北京市密云区",
     "region": ReservoirRegion.NORTH, "coords": (116.85, 40.48)},
    {"name": "千岛湖水库", "location": "浙江省杭州市淳安县",
     "region": ReservoirRegion.EAST, "coords": (118.88, 29.61)},
    {"name": "丰满水库", "location": "吉林省吉林市",
     "region": ReservoirRegion.NORTHEAST, "coords": (126.55, 43.73)},
    {"name": "白山水库", "location": "吉林省桦甸市",
     "region": ReservoirRegion.NORTHEAST, "coords": (127.28, 42.75)},
    {"name": "龙羊峡水库", "location": "青海省海南州共和县",
     "region": ReservoirRegion.NORTHWEST, "coords": (100.95, 36.12)},
    {"name": "刘家峡水库", "location": "甘肃省临夏州永靖县",
     "region": ReservoirRegion.NORTHWEST, "coords": (103.32, 35.95)},
    {"name": "二滩水库", "location": "四川省攀枝花市",
     "region": ReservoirRegion.SOUTHWEST, "coords": (101.65, 26.83)},
    {"name": "隔河岩水库", "location": "湖北省宜昌市长阳县",
     "region": ReservoirRegion.CENTRAL, "coords": (111.02, 30.47)},
    {"name": "柘溪水库", "location": "湖南省益阳市安化县",
     "region": ReservoirRegion.CENTRAL, "coords": (111.05, 28.35)},
    {"name": "新丰江水库", "location": "广东省河源市",
     "region": ReservoirRegion.SOUTH, "coords": (114.32, 23.73)},
    {"name": "枫树坝水库", "location": "广东省河源市龙川县",
     "region": ReservoirRegion.SOUTH, "coords": (115.33, 24.32)},
    {"name": "岩滩水库", "location": "广西河池市大化县",
     "region": ReservoirRegion.SOUTH, "coords": (107.82, 23.85)},
    {"name": "天生桥水库", "location": "贵州省黔西南州",
     "region": ReservoirRegion.SOUTHWEST, "coords": (105.02, 24.78)},
    {"name": "漫湾水库", "location": "云南省临沧市",
     "region": ReservoirRegion.SOUTHWEST, "coords": (100.18, 24.47)},
    {"name": "陈村水库", "location": "安徽省宣城市泾县",
     "region": ReservoirRegion.EAST, "coords": (117.85, 30.52)},
    {"name": "花凉亭水库", "location": "安徽省安庆市太湖县",
     "region": ReservoirRegion.EAST, "coords": (116.12, 30.38)},
]

HISTORY_HOURS = 24 * 7
MEASUREMENT_TYPES = (ReservoirType.LARGE, ReservoirType.MEDIUM, ReservoirType.SMALL)


def _dec(value: float) -> Decimal:
    """四舍五入到两位小数并转为 Decimal。"""
    return Decimal(str(round(value, 2)))


def _reservoir_type(index: int) -> str:
    """与前端一致：前 8 座大型、第 9-15 座中型、其余小型。"""
    if index < 8:
        return MEASUREMENT_TYPES[0]
    if index < 15:
        return MEASUREMENT_TYPES[1]
    return MEASUREMENT_TYPES[2]


def _build_reservoirs(rng: random.Random, now) -> list[Reservoir]:
    reservoirs: list[Reservoir] = []
    for index, seed in enumerate(RESERVOIR_SEEDS):
        normal = 90 + rng.random() * 60
        warning = normal + 2 + rng.random() * 3
        guarantee = warning + 1 + rng.random() * 2
        current = normal - 5 + rng.random() * 12
        offline = rng.random() < 0.1

        reservoir = Reservoir(
            code=f"RSV-{index + 1:04d}",
            name=seed["name"],
            location=seed["location"],
            region=seed["region"],
            type=_reservoir_type(index),
            capacity=_dec(10000 + rng.random() * 200000),
            dead_water_level=_dec(normal - 20 - rng.random() * 10),
            normal_water_level=_dec(normal),
            flood_limit_level=_dec(normal - 3 - rng.random() * 5),
            warning_level=_dec(warning),
            guarantee_level=_dec(guarantee),
            current_water_level=_dec(normal if offline else current),
            current_storage=_dec(5000 + rng.random() * 150000),
            inflow=_dec(50 + rng.random() * 500),
            outflow=_dec(30 + rng.random() * 400),
            rainfall=_dec(rng.random() * 50),
            device_status=DeviceStatus.OFFLINE if offline else DeviceStatus.ONLINE,
            update_time=now - timedelta(milliseconds=rng.random() * 300000),
            longitude=_dec(seed["coords"][0] + (rng.random() - 0.5) * 0.5),
            latitude=_dec(seed["coords"][1] + (rng.random() - 0.5) * 0.3),
            responsible_person=RESPONSIBLE_PERSONS[index % len(RESPONSIBLE_PERSONS)],
            phone=f"138{rng.randrange(0, 100000000):08d}",
            description=f"{seed['name']}是{seed['region']}地区重要的水利枢纽工程，承担着防洪、供水、发电等综合功能。",
        )
        reservoir.status = ReservoirStatus.OFFLINE if offline else calculate_status(reservoir)
        reservoirs.append(reservoir)
    return reservoirs


def _build_alerts(reservoirs: list[Reservoir], rng: random.Random, now) -> list[AlertRecord]:
    alerts: list[AlertRecord] = []
    for reservoir in reservoirs:
        if reservoir.status == ReservoirStatus.DANGER:
            alerts.append(
                AlertRecord(
                    code=f"ALT-{len(alerts) + 1:04d}",
                    reservoir=reservoir,
                    type=AlertType.WATER_LEVEL,
                    level=AlertLevel.DANGER,
                    value=reservoir.current_water_level,
                    threshold=reservoir.guarantee_level,
                    unit="m",
                    message=(
                        "水位超过保证水位 "
                        f"{_dec(float(reservoir.current_water_level - reservoir.guarantee_level))}m"
                    ),
                    status=AlertStatus.UNCONFIRMED,
                    create_time=now - timedelta(seconds=rng.random() * 3600),
                )
            )
        elif reservoir.status == ReservoirStatus.WARNING:
            alerts.append(
                AlertRecord(
                    code=f"ALT-{len(alerts) + 1:04d}",
                    reservoir=reservoir,
                    type=AlertType.WATER_LEVEL,
                    level=AlertLevel.WARNING,
                    value=reservoir.current_water_level,
                    threshold=reservoir.warning_level,
                    unit="m",
                    message=(
                        "水位超过警戒水位 "
                        f"{_dec(float(reservoir.current_water_level - reservoir.warning_level))}m"
                    ),
                    status=(
                        AlertStatus.UNCONFIRMED
                        if rng.random() > 0.5
                        else AlertStatus.PROCESSING
                    ),
                    create_time=now - timedelta(seconds=rng.random() * 7200),
                )
            )
        elif reservoir.status == ReservoirStatus.OFFLINE:
            alerts.append(
                AlertRecord(
                    code=f"ALT-{len(alerts) + 1:04d}",
                    reservoir=reservoir,
                    type=AlertType.DEVICE_OFFLINE,
                    level=AlertLevel.WARNING,
                    value=Decimal("0"),
                    threshold=Decimal("1"),
                    unit="",
                    message="监测设备离线，数据中断",
                    status=AlertStatus.UNCONFIRMED,
                    create_time=now - timedelta(seconds=rng.random() * 1800),
                )
            )

    for alert in alerts:
        if alert.status == AlertStatus.PROCESSING:
            alert.confirmed_at = alert.create_time + timedelta(minutes=10)
    return alerts


def _build_measurements(
    reservoir: Reservoir, rng: random.Random, now
) -> list[ReservoirMeasurement]:
    points: list[ReservoirMeasurement] = []
    base_level = float(reservoir.current_water_level) - 2 + rng.random() * 4
    for step in range(HISTORY_HOURS, -1, -1):
        wave = math.sin(step / 4) * 1.5 + rng.random() * 0.5
        points.append(
            ReservoirMeasurement(
                reservoir=reservoir,
                measured_at=now - timedelta(hours=step),
                water_level=_dec(base_level + wave),
                storage=_dec(float(reservoir.current_storage) + (rng.random() - 0.5) * 2000),
                inflow=_dec(float(reservoir.inflow) + math.sin(step / 3) * 50 + rng.random() * 20),
                outflow=_dec(
                    float(reservoir.outflow) + math.cos(step / 3) * 30 + rng.random() * 15
                ),
                rainfall=_dec(max(0.0, rng.random() * 30 - 10)),
            )
        )
    return points


class Command(BaseCommand):
    help = "生成演示种子数据（水库 / 告警 / 历史监测 / 演示账号）"

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--flush", action="store_true", help="生成前清空既有业务数据")
        parser.add_argument("--dry-run", action="store_true", help="只统计不写库")
        parser.add_argument("--batch-size", type=int, default=500, help="批量写入大小")
        parser.add_argument("--seed", type=int, default=20260101, help="随机种子，保证可复现")

    def handle(self, *args, **options) -> None:
        rng = random.Random(options["seed"])
        now = timezone.now()
        dry_run = options["dry_run"]
        batch_size = options["batch_size"]

        reservoirs = _build_reservoirs(rng, now)
        alerts = _build_alerts(reservoirs, rng, now)
        measurements = [
            point for reservoir in reservoirs for point in _build_measurements(reservoir, rng, now)
        ]

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"[dry-run] 将写入 水库 {len(reservoirs)} / 告警 {len(alerts)} / "
                    f"监测点 {len(measurements)} / 账号 {len(DEMO_USERS)}"
                )
            )
            return

        with transaction.atomic():
            if options["flush"]:
                AlertRecord.all_objects.all().hard_delete()
                ReservoirMeasurement.all_objects.all().hard_delete()
                Reservoir.all_objects.all().hard_delete()
                self.stdout.write(self.style.WARNING("已清空既有业务数据"))

            self._seed_users()
            Reservoir.objects.bulk_create(reservoirs, batch_size=batch_size)
            AlertRecord.objects.bulk_create(alerts, batch_size=batch_size)
            ReservoirMeasurement.objects.bulk_create(measurements, batch_size=batch_size)

        self.stdout.write(
            self.style.SUCCESS(
                f"种子数据完成：水库 {len(reservoirs)} / 告警 {len(alerts)} / "
                f"监测点 {len(measurements)} / 账号 {len(DEMO_USERS)}"
            )
        )

    def _seed_users(self) -> None:
        user_model = get_user_model()
        for item in DEMO_USERS:
            user, created = user_model.objects.get_or_create(
                username=item["username"],
                defaults={
                    "role": item["role"],
                    "phone": item["phone"],
                    "is_staff": item["is_staff"],
                    "is_superuser": item["is_superuser"],
                },
            )
            user.role = item["role"]
            user.phone = item["phone"]
            user.is_staff = item["is_staff"]
            user.is_superuser = item["is_superuser"]
            user.set_password(item["password"])
            user.save()
            if created:
                self.stdout.write(f"  新建账号 {item['username']} / {item['password']}")
