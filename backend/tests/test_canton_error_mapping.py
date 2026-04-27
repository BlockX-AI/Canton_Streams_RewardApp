"""Tests for Canton error → HTTP status mapping."""
from __future__ import annotations

import pytest

from app.utils.errors import CantonError, CantonUnavailableError, ContractNotFoundError


def test_canton_unavailable_is_503():
    err = CantonUnavailableError("connection refused")
    assert err.http_status() == 503


def test_not_found_is_404():
    err = CantonError(404, "CONTRACT_NOT_FOUND", "not found")
    assert err.http_status() == 404


def test_invalid_argument_is_422():
    err = CantonError(400, "INVALID_ARGUMENT", "bad arg")
    assert err.http_status() == 422


def test_daml_rejection_is_422():
    err = CantonError(422, "DAML_INTERPRETATION_ERROR", "assertMsg failed")
    assert err.http_status() == 422


def test_duplicate_command_is_409():
    err = CantonError(409, "DUPLICATE_COMMAND", "already submitted")
    assert err.http_status() == 409


def test_permission_denied_is_403():
    err = CantonError(403, "PERMISSION_DENIED", "not authorized")
    assert err.http_status() == 403


def test_canton_500_becomes_502():
    err = CantonError(500, "INTERNAL", "canton crashed")
    assert err.http_status() == 502


def test_user_message_contract_not_found():
    err = CantonError(404, "CONTRACT_NOT_FOUND", "raw msg")
    assert "archived" in err.user_message() or "not found" in err.user_message().lower()


def test_user_message_daml_rejection():
    err = CantonError(422, "DAML_INTERPRETATION_ERROR", "assertMsg: Nothing to withdraw")
    assert "Daml contract rejected" in err.user_message()


def test_contract_not_found_error():
    err = ContractNotFoundError("00aabb")
    assert "00aabb" in str(err)
