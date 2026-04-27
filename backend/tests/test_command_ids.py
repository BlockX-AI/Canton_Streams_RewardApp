"""Tests for deterministic commandId generation."""
from __future__ import annotations

from app.utils.command_ids import deterministic_command_id, idempotent_command_id


def test_deterministic_same_inputs():
    id1 = deterministic_command_id("cid-abc", "Withdraw", {}, "req-1")
    id2 = deterministic_command_id("cid-abc", "Withdraw", {}, "req-1")
    assert id1 == id2


def test_deterministic_different_contracts():
    id1 = deterministic_command_id("cid-abc", "Withdraw", {}, "req-1")
    id2 = deterministic_command_id("cid-xyz", "Withdraw", {}, "req-1")
    assert id1 != id2


def test_deterministic_different_choices():
    id1 = deterministic_command_id("cid-abc", "Withdraw", {}, "req-1")
    id2 = deterministic_command_id("cid-abc", "Pause", {}, "req-1")
    assert id1 != id2


def test_deterministic_different_request_ids():
    id1 = deterministic_command_id("cid-abc", "Withdraw", {}, "req-1")
    id2 = deterministic_command_id("cid-abc", "Withdraw", {}, "req-2")
    assert id1 != id2


def test_deterministic_different_args():
    id1 = deterministic_command_id("cid-abc", "TopUp", {"additionalDeposit": "100"}, "req-1")
    id2 = deterministic_command_id("cid-abc", "TopUp", {"additionalDeposit": "200"}, "req-1")
    assert id1 != id2


def test_command_id_format():
    cid = deterministic_command_id("abc", "Withdraw", {}, "rid")
    assert cid.startswith("gs-")
    assert len(cid) > 10
    assert " " not in cid


def test_idempotent_command_id():
    id1 = idempotent_command_id("StreamCore:StreamAgreement", "Withdraw", "req-1")
    id2 = idempotent_command_id("StreamCore:StreamAgreement", "Withdraw", "req-1")
    assert id1 == id2


def test_idempotent_different_templates():
    id1 = idempotent_command_id("StreamCore:StreamAgreement", "Withdraw", "req-1")
    id2 = idempotent_command_id("StreamPool:StreamPool", "Withdraw", "req-1")
    assert id1 != id2
