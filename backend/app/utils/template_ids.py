from __future__ import annotations

ALLOWED_CHOICES: dict[str, set[str]] = {
    "StreamCore:StreamAgreement": {
        "Withdraw", "TopUp", "Pause", "Resume", "Stop", "UpdateRate",
        "ObligationView", "GetWithdrawable", "GetStreamInfo", "RecordActivity",
    },
    "StreamPool:StreamPool": {
        "WithdrawMember", "TopUpPool", "PausePool", "ResumePool",
        "AddMember", "UpdateMemberUnits", "GetMemberAccrued",
    },
    "StreamPool:PoolFactory": {"CreatePool"},
    "StreamCore:StreamFactory": {"CreateStream"},
    "VestingStream:VestingStream": {"VestingWithdraw", "VestingStop", "VestedBalance"},
    "VestingStream:VestingFactory": {"CreateVesting"},
    "MilestoneStream:MilestoneStream": {
        "ConfirmMilestone", "RefundRemaining", "ForceRefund",
        "GetPendingMilestones", "GetTotalPending",
    },
    "MilestoneStream:MilestoneFactory": {"CreateMilestoneStream"},
    "GrowToken:GrowToken": {"Transfer", "Split", "Merge", "Burn", "Approve"},
    "GrowToken:Faucet": {"Mint", "MintBatch"},
}


class TemplateIds:
    def __init__(self, package_id: str) -> None:
        self._pkg = package_id

    def _full(self, module_template: str) -> str:
        return f"{self._pkg}:{module_template}"

    def stream_agreement(self) -> str:
        return self._full("StreamCore:StreamAgreement")

    def stream_factory(self) -> str:
        return self._full("StreamCore:StreamFactory")

    def stream_pool(self) -> str:
        return self._full("StreamPool:StreamPool")

    def pool_factory(self) -> str:
        return self._full("StreamPool:PoolFactory")

    def vesting_stream(self) -> str:
        return self._full("VestingStream:VestingStream")

    def vesting_factory(self) -> str:
        return self._full("VestingStream:VestingFactory")

    def milestone_stream(self) -> str:
        return self._full("MilestoneStream:MilestoneStream")

    def milestone_factory(self) -> str:
        return self._full("MilestoneStream:MilestoneFactory")

    def grow_token(self) -> str:
        return self._full("GrowToken:GrowToken")

    def faucet(self) -> str:
        return self._full("GrowToken:Faucet")

    def module_template(self, full_id: str) -> str:
        parts = full_id.split(":")
        if len(parts) >= 3:
            return f"{parts[-2]}:{parts[-1]}"
        return full_id

    def is_choice_allowed(self, template_path: str, choice: str) -> bool:
        allowed = ALLOWED_CHOICES.get(template_path, set())
        return choice in allowed

    def short_name(self, full_template_id: str) -> str:
        return full_template_id.split(":")[-1]
