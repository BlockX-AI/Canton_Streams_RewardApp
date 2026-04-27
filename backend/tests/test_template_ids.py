"""Tests for TemplateIdResolver and choice whitelist."""
from __future__ import annotations

import pytest

from app.utils.template_ids import TemplateIds, ALLOWED_CHOICES

PKG = "ede21c7dd468efab3df48ff5638d165bd6a82f551f608ae19dbfecd21c3c6d84"


def make_tpl() -> TemplateIds:
    return TemplateIds(PKG)


def test_stream_agreement_id():
    tpl = make_tpl()
    assert tpl.stream_agreement() == f"{PKG}:StreamCore:StreamAgreement"


def test_pool_id():
    tpl = make_tpl()
    assert tpl.stream_pool() == f"{PKG}:StreamPool:StreamPool"


def test_vesting_id():
    tpl = make_tpl()
    assert tpl.vesting_stream() == f"{PKG}:VestingStream:VestingStream"


def test_milestone_id():
    tpl = make_tpl()
    assert tpl.milestone_stream() == f"{PKG}:MilestoneStream:MilestoneStream"


def test_grow_token_id():
    tpl = make_tpl()
    assert tpl.grow_token() == f"{PKG}:GrowToken:GrowToken"


def test_short_name():
    tpl = make_tpl()
    assert tpl.short_name(f"{PKG}:StreamCore:StreamAgreement") == "StreamAgreement"
    assert tpl.short_name(f"{PKG}:GrowToken:GrowToken") == "GrowToken"


def test_no_applicationId_in_template_ids():
    tpl = make_tpl()
    for attr in dir(tpl):
        val = getattr(tpl, attr)
        if callable(val) and not attr.startswith("_"):
            try:
                result = val()
                assert "applicationId" not in str(result)
            except TypeError:
                pass


def test_allowed_choices_stream_agreement():
    allowed = ALLOWED_CHOICES["StreamCore:StreamAgreement"]
    assert "Withdraw" in allowed
    assert "Pause" in allowed
    assert "Resume" in allowed
    assert "Stop" in allowed
    assert "TopUp" in allowed
    assert "ClaimVested" not in allowed
    assert "ReleaseMilestone" not in allowed


def test_allowed_choices_vesting():
    allowed = ALLOWED_CHOICES["VestingStream:VestingStream"]
    assert "VestingWithdraw" in allowed
    assert "ClaimVested" not in allowed


def test_allowed_choices_milestone():
    allowed = ALLOWED_CHOICES["MilestoneStream:MilestoneStream"]
    assert "ConfirmMilestone" in allowed
    assert "ReleaseMilestone" not in allowed
    assert "ClaimMilestone" not in allowed


def test_allowed_choices_pool():
    allowed = ALLOWED_CHOICES["StreamPool:StreamPool"]
    assert "WithdrawMember" in allowed
    assert "TopUpPool" in allowed


def test_choice_allowed():
    tpl = make_tpl()
    assert tpl.is_choice_allowed("StreamCore:StreamAgreement", "Withdraw") is True
    assert tpl.is_choice_allowed("StreamCore:StreamAgreement", "FakeChoice") is False
    assert tpl.is_choice_allowed("VestingStream:VestingStream", "VestingWithdraw") is True
    assert tpl.is_choice_allowed("MilestoneStream:MilestoneStream", "ConfirmMilestone") is True
