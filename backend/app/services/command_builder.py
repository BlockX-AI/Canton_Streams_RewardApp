"""
CommandBuilder: construct all Canton submit-and-wait payloads.

Rules:
  - All command construction happens here, never in route handlers.
  - Template IDs always include packageId prefix.
  - commandId is deterministic per (contract, choice, request).
  - userId comes from config, never from the request.
  - actAs is a single-element list (the acting party).
  - readAs includes all known parties for maximal visibility.
  - choiceArgument for unit choices is {}.
  - Decimal amounts are passed as strings (Canton JSON API requirement).
"""
from __future__ import annotations

from decimal import Decimal
from typing import Any

from app.utils.command_ids import deterministic_command_id
from app.utils.template_ids import TemplateIds, ALLOWED_CHOICES


class CommandBuilder:
    def __init__(self, package_id: str, user_id: str, all_party_ids: list[str]) -> None:
        self._pkg = package_id
        self._user_id = user_id
        self._read_as = all_party_ids
        self.tpl = TemplateIds(package_id)

    def _full_template_id(self, template_path: str) -> str:
        return f"{self._pkg}:{template_path}"

    def _validate_choice(self, template_path: str, choice: str) -> None:
        allowed = ALLOWED_CHOICES.get(template_path, set())
        if allowed and choice not in allowed:
            raise ValueError(
                f"Choice '{choice}' is not whitelisted for template '{template_path}'. "
                f"Allowed: {sorted(allowed)}"
            )

    def exercise_payload(
        self,
        template_path: str,
        contract_id: str,
        choice: str,
        choice_argument: dict[str, Any],
        act_as_party_id: str,
        request_id: str = "",
    ) -> dict[str, Any]:
        self._validate_choice(template_path, choice)
        command_id = deterministic_command_id(contract_id, choice, choice_argument, request_id)
        return {
            "commands": [{
                "ExerciseCommand": {
                    "templateId": self._full_template_id(template_path),
                    "contractId": contract_id,
                    "choice": choice,
                    "choiceArgument": choice_argument,
                },
            }],
            "commandId": command_id,
            "userId": self._user_id,
            "actAs": [act_as_party_id],
            "readAs": self._read_as,
        }

    def create_payload(
        self,
        template_path: str,
        create_arguments: dict[str, Any],
        act_as_party_id: str,
        request_id: str = "",
    ) -> dict[str, Any]:
        command_id = deterministic_command_id("", "create", create_arguments, request_id)
        return {
            "commands": [{
                "CreateCommand": {
                    "templateId": self._full_template_id(template_path),
                    "createArguments": create_arguments,
                },
            }],
            "commandId": command_id,
            "userId": self._user_id,
            "actAs": [act_as_party_id],
            "readAs": self._read_as,
        }

    def stream_withdraw(self, contract_id: str, receiver_party_id: str, request_id: str = "") -> dict[str, Any]:
        return self.exercise_payload(
            "StreamCore:StreamAgreement", contract_id, "Withdraw", {}, receiver_party_id, request_id
        )

    def stream_pause(self, contract_id: str, sender_party_id: str, request_id: str = "") -> dict[str, Any]:
        return self.exercise_payload(
            "StreamCore:StreamAgreement", contract_id, "Pause", {}, sender_party_id, request_id
        )

    def stream_resume(self, contract_id: str, sender_party_id: str, request_id: str = "") -> dict[str, Any]:
        return self.exercise_payload(
            "StreamCore:StreamAgreement", contract_id, "Resume", {}, sender_party_id, request_id
        )

    def stream_stop(self, contract_id: str, sender_party_id: str, request_id: str = "") -> dict[str, Any]:
        return self.exercise_payload(
            "StreamCore:StreamAgreement", contract_id, "Stop", {}, sender_party_id, request_id
        )

    def stream_top_up(self, contract_id: str, amount: Decimal, sender_party_id: str, request_id: str = "") -> dict[str, Any]:
        return self.exercise_payload(
            "StreamCore:StreamAgreement",
            contract_id,
            "TopUp",
            {"additionalDeposit": str(amount)},
            sender_party_id,
            request_id,
        )

    def pool_withdraw_member(self, contract_id: str, member_party_id: str, request_id: str = "") -> dict[str, Any]:
        return self.exercise_payload(
            "StreamPool:StreamPool",
            contract_id,
            "WithdrawMember",
            {"member": member_party_id},
            member_party_id,
            request_id,
        )

    def pool_top_up(self, contract_id: str, amount: Decimal, admin_party_id: str, request_id: str = "") -> dict[str, Any]:
        return self.exercise_payload(
            "StreamPool:StreamPool",
            contract_id,
            "TopUpPool",
            {"additionalDeposit": str(amount)},
            admin_party_id,
            request_id,
        )

    def pool_pause(self, contract_id: str, admin_party_id: str, request_id: str = "") -> dict[str, Any]:
        return self.exercise_payload(
            "StreamPool:StreamPool", contract_id, "PausePool", {}, admin_party_id, request_id
        )

    def pool_resume(self, contract_id: str, admin_party_id: str, request_id: str = "") -> dict[str, Any]:
        return self.exercise_payload(
            "StreamPool:StreamPool", contract_id, "ResumePool", {}, admin_party_id, request_id
        )

    def vesting_withdraw(self, contract_id: str, receiver_party_id: str, request_id: str = "") -> dict[str, Any]:
        return self.exercise_payload(
            "VestingStream:VestingStream", contract_id, "VestingWithdraw", {}, receiver_party_id, request_id
        )

    def vesting_stop(self, contract_id: str, sender_party_id: str, request_id: str = "") -> dict[str, Any]:
        return self.exercise_payload(
            "VestingStream:VestingStream", contract_id, "VestingStop", {}, sender_party_id, request_id
        )

    def milestone_confirm(
        self, contract_id: str, milestone_name: str, admin_party_id: str, request_id: str = ""
    ) -> dict[str, Any]:
        return self.exercise_payload(
            "MilestoneStream:MilestoneStream",
            contract_id,
            "ConfirmMilestone",
            {"milestoneName": milestone_name},
            admin_party_id,
            request_id,
        )

    def milestone_refund(self, contract_id: str, sender_party_id: str, request_id: str = "") -> dict[str, Any]:
        return self.exercise_payload(
            "MilestoneStream:MilestoneStream",
            contract_id,
            "RefundRemaining",
            {},
            sender_party_id,
            request_id,
        )

    def milestone_force_refund(
        self, contract_id: str, admin_party_id: str, request_id: str = ""
    ) -> dict[str, Any]:
        return self.exercise_payload(
            "MilestoneStream:MilestoneStream",
            contract_id,
            "ForceRefund",
            {},
            admin_party_id,
            request_id,
        )
