"""Tests for CommandBuilder — verifies exact Canton JSON API v2 payload shape."""
from __future__ import annotations

from decimal import Decimal

import pytest

from app.services.command_builder import CommandBuilder

PKG = "ede21c7dd468efab3df48ff5638d165bd6a82f551f608ae19dbfecd21c3c6d84"
ALICE = "Alice::1220ns"
BOB = "Bob::1220ns"
ADMIN = "Admin::1220ns"
ALL_PARTIES = [ADMIN, ALICE, BOB, "Carol::1220ns"]
CID = "00aabbcc001122"


def make_cmd() -> CommandBuilder:
    return CommandBuilder(PKG, "participant_admin", ALL_PARTIES)


def _exercise_cmd(payload: dict) -> dict:
    cmds = payload["commands"]
    assert len(cmds) == 1
    return cmds[0]["ExerciseCommand"]


class TestPayloadShape:
    def test_top_level_keys(self):
        cmd = make_cmd()
        p = cmd.stream_withdraw(CID, BOB)
        assert set(p.keys()) == {"commands", "commandId", "userId", "actAs", "readAs"}

    def test_no_applicationId(self):
        cmd = make_cmd()
        p = cmd.stream_withdraw(CID, BOB)
        assert "applicationId" not in p
        assert "applicationId" not in p.get("commands", [{}])[0].get("ExerciseCommand", {})

    def test_commands_is_list_not_dict(self):
        cmd = make_cmd()
        p = cmd.stream_withdraw(CID, BOB)
        assert isinstance(p["commands"], list)

    def test_act_as_is_single_party(self):
        cmd = make_cmd()
        p = cmd.stream_withdraw(CID, BOB)
        assert p["actAs"] == [BOB]

    def test_read_as_contains_all_parties(self):
        cmd = make_cmd()
        p = cmd.stream_withdraw(CID, BOB)
        assert set(p["readAs"]) == set(ALL_PARTIES)

    def test_user_id(self):
        cmd = make_cmd()
        p = cmd.stream_withdraw(CID, BOB)
        assert p["userId"] == "participant_admin"

    def test_command_id_is_string(self):
        cmd = make_cmd()
        p = cmd.stream_withdraw(CID, BOB)
        assert isinstance(p["commandId"], str)
        assert len(p["commandId"]) > 5


class TestExerciseCommands:
    def test_stream_withdraw(self):
        cmd = make_cmd()
        ex = _exercise_cmd(cmd.stream_withdraw(CID, BOB))
        assert ex["choice"] == "Withdraw"
        assert ex["choiceArgument"] == {}
        assert ex["contractId"] == CID
        assert ex["templateId"] == f"{PKG}:StreamCore:StreamAgreement"

    def test_stream_pause(self):
        cmd = make_cmd()
        ex = _exercise_cmd(cmd.stream_pause(CID, ALICE))
        assert ex["choice"] == "Pause"
        assert ex["choiceArgument"] == {}

    def test_stream_resume(self):
        cmd = make_cmd()
        ex = _exercise_cmd(cmd.stream_resume(CID, ALICE))
        assert ex["choice"] == "Resume"

    def test_stream_stop(self):
        cmd = make_cmd()
        ex = _exercise_cmd(cmd.stream_stop(CID, ALICE))
        assert ex["choice"] == "Stop"

    def test_stream_top_up_amount_is_string(self):
        cmd = make_cmd()
        ex = _exercise_cmd(cmd.stream_top_up(CID, Decimal("500.25"), ALICE))
        assert ex["choice"] == "TopUp"
        arg = ex["choiceArgument"]
        assert "additionalDeposit" in arg
        assert isinstance(arg["additionalDeposit"], str)
        assert arg["additionalDeposit"] == "500.25"

    def test_pool_withdraw_member_party_id(self):
        cmd = make_cmd()
        ex = _exercise_cmd(cmd.pool_withdraw_member(CID, ALICE))
        assert ex["choice"] == "WithdrawMember"
        assert ex["choiceArgument"] == {"member": ALICE}
        assert ex["templateId"] == f"{PKG}:StreamPool:StreamPool"

    def test_vesting_withdraw_choice_name(self):
        cmd = make_cmd()
        ex = _exercise_cmd(cmd.vesting_withdraw(CID, BOB))
        assert ex["choice"] == "VestingWithdraw"
        assert ex["templateId"] == f"{PKG}:VestingStream:VestingStream"

    def test_milestone_confirm_takes_name_not_index(self):
        cmd = make_cmd()
        ex = _exercise_cmd(cmd.milestone_confirm(CID, "Design", ADMIN))
        assert ex["choice"] == "ConfirmMilestone"
        assert ex["choiceArgument"] == {"milestoneName": "Design"}
        assert ex["templateId"] == f"{PKG}:MilestoneStream:MilestoneStream"

    def test_milestone_no_milestone_index_arg(self):
        cmd = make_cmd()
        ex = _exercise_cmd(cmd.milestone_confirm(CID, "Build", ADMIN))
        assert "milestoneIndex" not in ex["choiceArgument"]

    def test_choice_whitelist_blocks_invalid(self):
        cmd = make_cmd()
        with pytest.raises(ValueError, match="not whitelisted"):
            cmd.exercise_payload(
                "StreamCore:StreamAgreement", CID, "HackChoice", {}, ALICE
            )


class TestDecimalHandling:
    def test_top_up_decimal_precision(self):
        cmd = make_cmd()
        ex = _exercise_cmd(cmd.stream_top_up(CID, Decimal("1234.567890"), ALICE))
        assert ex["choiceArgument"]["additionalDeposit"] == "1234.567890"

    def test_pool_top_up_decimal(self):
        cmd = make_cmd()
        ex = _exercise_cmd(cmd.pool_top_up(CID, Decimal("10000.0"), ADMIN))
        assert isinstance(ex["choiceArgument"]["additionalDeposit"], str)
