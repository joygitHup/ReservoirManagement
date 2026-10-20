"""共享常量：错误码与审计动作（标准 7.2）。"""


class ErrorCode:
    """错误码集中定义：4xxxx 客户端错误，5xxxx 服务端错误。"""

    OK = 0
    INVALID_PARAM = 40001
    UNAUTHORIZED = 40101
    FORBIDDEN = 40301
    NOT_FOUND = 40401
    CONFLICT = 40901
    RATE_LIMITED = 42901
    SERVER_ERROR = 50001


STATUS_TO_ERROR_CODE = {
    400: ErrorCode.INVALID_PARAM,
    401: ErrorCode.UNAUTHORIZED,
    403: ErrorCode.FORBIDDEN,
    404: ErrorCode.NOT_FOUND,
    405: ErrorCode.INVALID_PARAM,
    409: ErrorCode.CONFLICT,
    429: ErrorCode.RATE_LIMITED,
    500: ErrorCode.SERVER_ERROR,
}


class AuditAction:
    """审计动作枚举。"""

    ALERT_CREATE = "alert.create"
    ALERT_CONFIRM = "alert.confirm"
    ALERT_RESOLVE = "alert.resolve"
    RESERVOIR_CREATE = "reservoir.create"
    RESERVOIR_UPDATE = "reservoir.update"
    RESERVOIR_DELETE = "reservoir.delete"
    USER_LOGIN = "user.login"
    USER_LOGOUT = "user.logout"
