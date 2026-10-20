"""查询参数解析工具（纯函数，标准 6）。"""


def parse_positive_int(raw, default: int, minimum: int = 1, maximum: int = 100) -> int:
    """把查询参数解析为区间内的正整数，非法输入回退默认值。"""
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return default
    return max(minimum, min(value, maximum))
