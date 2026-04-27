from __future__ import annotations

from decimal import Decimal, InvalidOperation


def to_decimal(value: object) -> Decimal:
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal("0")


def to_canton_string(value: Decimal | str | float | int) -> str:
    return str(Decimal(str(value)))


def safe_subtract(a: object, b: object) -> Decimal:
    return max(Decimal("0"), to_decimal(a) - to_decimal(b))
