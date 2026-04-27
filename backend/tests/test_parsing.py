"""Tests for the ACS response parser — handles all Canton JSON API v2 response variants."""
from __future__ import annotations

import json

import pytest

from app.utils.parsing import (
    ContractView,
    filter_by_template,
    find_by_contract_id,
    parse_active_contracts,
)

STREAM_CID = "00aabbcc001122"
STREAM_TEMPLATE = "ede21c7d:StreamCore:StreamAgreement"

CREATED_EVENT = {
    "contractId": STREAM_CID,
    "templateId": STREAM_TEMPLATE,
    "createArgument": {
        "streamId": 1,
        "sender": "Alice::NS",
        "receiver": "Bob::NS",
        "flowRate": "1.0",
        "deposited": "1000.0",
        "withdrawn": "0.0",
        "status": "Active",
    },
    "signatories": ["Alice::NS"],
    "observers": ["Bob::NS"],
}

CONTRACT_ENTRY = {
    "contractEntry": {
        "activeContract": {
            "createdEvent": CREATED_EVENT
        }
    }
}


def test_parse_ndjson_single_line():
    raw = json.dumps(CONTRACT_ENTRY)
    contracts = parse_active_contracts(raw)
    assert len(contracts) == 1
    c = contracts[0]
    assert c.contract_id == STREAM_CID
    assert c.template_name == "StreamAgreement"
    assert c.payload["flowRate"] == "1.0"


def test_parse_ndjson_multiple_lines():
    entry2 = {
        "contractEntry": {
            "activeContract": {
                "createdEvent": {**CREATED_EVENT, "contractId": "00aabbcc002244"}
            }
        }
    }
    raw = json.dumps(CONTRACT_ENTRY) + "\n" + json.dumps(entry2)
    contracts = parse_active_contracts(raw)
    assert len(contracts) == 2


def test_parse_plain_json_array():
    raw = json.dumps([CONTRACT_ENTRY, CONTRACT_ENTRY])
    contracts = parse_active_contracts(raw)
    assert len(contracts) == 2


def test_parse_envelope_result():
    raw = json.dumps({"result": [CONTRACT_ENTRY]})
    contracts = parse_active_contracts(raw)
    assert len(contracts) == 1


def test_parse_envelope_contracts_key():
    raw = json.dumps({"contracts": [CONTRACT_ENTRY]})
    contracts = parse_active_contracts(raw)
    assert len(contracts) == 1


def test_parse_empty():
    assert parse_active_contracts("") == []
    assert parse_active_contracts("   \n  ") == []


def test_parse_malformed_lines_skipped():
    raw = "NOT JSON\n" + json.dumps(CONTRACT_ENTRY) + "\n{broken"
    contracts = parse_active_contracts(raw)
    assert len(contracts) == 1


def test_parse_create_arguments_fallback():
    ce = {**CREATED_EVENT}
    del ce["createArgument"]
    ce["createArguments"] = {"flowRate": "2.0"}
    entry = {"contractEntry": {"activeContract": {"createdEvent": ce}}}
    contracts = parse_active_contracts(json.dumps(entry))
    assert len(contracts) == 1
    assert contracts[0].payload["flowRate"] == "2.0"


def test_filter_by_template():
    c1 = ContractView("id1", "pkg:A:StreamAgreement", "StreamAgreement", {}, [], [], None)
    c2 = ContractView("id2", "pkg:B:GrowToken", "GrowToken", {}, [], [], None)
    result = filter_by_template([c1, c2], "StreamAgreement")
    assert len(result) == 1
    assert result[0].contract_id == "id1"


def test_find_by_contract_id():
    c1 = ContractView("id1", "pkg:A:T", "T", {}, [], [], None)
    c2 = ContractView("id2", "pkg:A:T", "T", {}, [], [], None)
    assert find_by_contract_id([c1, c2], "id2") is c2
    assert find_by_contract_id([c1, c2], "missing") is None


def test_signatories_and_observers():
    contracts = parse_active_contracts(json.dumps(CONTRACT_ENTRY))
    assert contracts[0].signatories == ["Alice::NS"]
    assert contracts[0].observers == ["Bob::NS"]
