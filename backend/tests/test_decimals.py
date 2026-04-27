"""Tests verifying money is always Decimal, never float."""
from __future__ import annotations

from decimal import Decimal

import pytest

from app.utils.decimals import safe_subtract, to_canton_string, to_decimal


def test_to_decimal_from_string():
    assert to_decimal("1234.5678") == Decimal("1234.5678")


def test_to_decimal_from_int():
    assert to_decimal(100) == Decimal("100")


def test_to_decimal_from_decimal():
    d = Decimal("42.0")
    assert to_decimal(d) is d


def test_to_decimal_bad_value_returns_zero():
    assert to_decimal("not_a_number") == Decimal("0")
    assert to_decimal(None) == Decimal("0")


def test_to_canton_string():
    assert to_canton_string(Decimal("1000.5")) == "1000.5"
    assert to_canton_string("500.25") == "500.25"


def test_safe_subtract_positive():
    result = safe_subtract("1000.0", "300.0")
    assert result == Decimal("700.0")


def test_safe_subtract_floors_at_zero():
    result = safe_subtract("100.0", "500.0")
    assert result == Decimal("0")


def test_no_float_in_token_amounts():
    from app.models.tokens import TokenBalance
    token = TokenBalance(
        contract_id="cid",
        owner="Alice::NS",
        issuer="Admin::NS",
        amount=Decimal("1234.5"),
        symbol="GROW",
    )
    assert isinstance(token.amount, Decimal)
    assert not isinstance(token.amount, float)
