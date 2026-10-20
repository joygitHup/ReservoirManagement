"""水库服务层。"""

from apps.reservoirs.services.reservoirs import (
    calculate_status,
    create_reservoir,
    delete_reservoir,
    get_history,
    get_overview_stats,
    get_region_stats,
    get_water_level_ranking,
    update_reservoir,
)

__all__ = [
    "calculate_status",
    "create_reservoir",
    "delete_reservoir",
    "get_history",
    "get_overview_stats",
    "get_region_stats",
    "get_water_level_ranking",
    "update_reservoir",
]
