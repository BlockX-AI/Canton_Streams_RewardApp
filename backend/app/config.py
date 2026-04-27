from __future__ import annotations

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    canton_ledger_api_url: str = "http://localhost:7575"
    canton_user_id: str = "participant_admin"
    canton_package_id: str = "ede21c7dd468efab3df48ff5638d165bd6a82f551f608ae19dbfecd21c3c6d84"
    canton_timeout_seconds: float = 30.0
    canton_namespace: str = ""

    canton_admin_party: str = ""
    canton_alice_party: str = ""
    canton_bob_party: str = ""
    canton_carol_party: str = ""

    app_env: str = "local"
    app_name: str = "growstreams-api"
    enable_admin_endpoints: bool = True
    enable_demo_endpoints: bool = True

    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    def known_parties(self) -> dict[str, str]:
        parties: dict[str, str] = {}
        for name, attr in (
            ("Admin", "canton_admin_party"),
            ("Alice", "canton_alice_party"),
            ("Bob", "canton_bob_party"),
            ("Carol", "canton_carol_party"),
        ):
            val = getattr(self, attr)
            if val:
                parties[name] = val
            elif self.canton_namespace:
                parties[name] = f"{name}::{self.canton_namespace}"
        return parties

    def party_id(self, name: str) -> str | None:
        return self.known_parties().get(name)

    def all_party_ids(self) -> list[str]:
        return list(self.known_parties().values())


settings = Settings()
