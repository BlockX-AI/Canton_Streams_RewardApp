"""Integration-style tests for /health — uses httpx TestClient."""
from __future__ import annotations

import pytest


def test_health_returns_200(test_client):
    r = test_client.get("/health")
    assert r.status_code == 200


def test_health_has_request_id_header(test_client):
    r = test_client.get("/health")
    headers_lower = {k.lower(): v for k, v in r.headers.items()}
    assert "x-request-id" in headers_lower


def test_health_body_structure(test_client):
    r = test_client.get("/health")
    body = r.json()
    assert "status" in body
    assert "service" in body
    assert "canton_reachable" in body
    assert "timestamp" in body
    assert "request_id" in body


def test_health_propagates_request_id(test_client):
    r = test_client.get("/health", headers={"X-Request-ID": "test-123"})
    body = r.json()
    assert body["request_id"] == "test-123"


def test_health_status_is_ok_or_degraded(test_client):
    r = test_client.get("/health")
    body = r.json()
    assert body["status"] in ("ok", "degraded")
