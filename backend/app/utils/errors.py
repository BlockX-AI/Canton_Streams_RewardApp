from __future__ import annotations

from typing import Any


class CantonError(Exception):
    def __init__(self, status: int, code: str, message: str, details: Any = None) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details

    def http_status(self) -> int:
        if self.status == 409 or "DUPLICATE_COMMAND" in self.code:
            return 409
        if self.status == 404 or "NOT_FOUND" in self.code:
            return 404
        if self.status in (400, 422) or any(
            k in self.code for k in ("INVALID", "BAD_REQUEST", "ARGUMENT")
        ):
            return 422
        if self.status == 403 or "PERMISSION" in self.code or "UNAUTHORIZED" in self.code:
            return 403
        if self.status >= 500:
            return 502
        return 422

    def user_message(self) -> str:
        if "CONTRACT_NOT_FOUND" in self.code:
            return "Contract not found — it may have been archived or already exercised."
        if "DUPLICATE_COMMAND" in self.code:
            return "Duplicate command — this action was already submitted."
        if "DAML_INTERPRETATION_ERROR" in self.code or "UNHANDLED_EXCEPTION" in self.code:
            return f"Daml contract rejected the action: {self.message}"
        return self.message


class CantonUnavailableError(CantonError):
    def __init__(self, detail: str = "") -> None:
        super().__init__(503, "CANTON_UNAVAILABLE", f"Canton ledger API is unreachable. {detail}")

    def http_status(self) -> int:
        return 503


class ContractNotFoundError(Exception):
    def __init__(self, contract_id: str) -> None:
        super().__init__(f"Contract {contract_id!r} not found in active contract set.")
        self.contract_id = contract_id


class ValidationError(Exception):
    pass
