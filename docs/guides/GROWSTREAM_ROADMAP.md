# GrowStreams → Canton Network - Master Migration Roadmap

> **Your Complete Execution Plan**  
> **Grant Target**: $75,000 USD in Canton Coin (CC)  
> **Timeline**: 22 weeks (5.5 months)  
> **Current Status**: Vara Testnet → Canton Migration

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Phase-by-Phase Execution Plan](#phase-by-phase-execution-plan)
4. [Weekly Task Breakdown](#weekly-task-breakdown)
5. [Acceptance Criteria](#acceptance-criteria)
6. [Risk Mitigation](#risk-mitigation)
7. [Daily Checklist](#daily-checklist)

---

## Executive Summary

### What You're Building

**GrowStreams Streaming Cashflows Utility on Canton Network**

A Daml-native primitive that enables continuous, programmable financial obligations on Canton — turning batch invoices into real-time streams that accrue per-second, settle on-demand, and require zero reconciliation.

### What You Already Have (Vara Network)

✅ **6 deployed contracts** on Vara Testnet  
✅ **53/53 E2E tests** passing  
✅ **Production REST API** (Railway)  
✅ **TypeScript SDK** ready to publish  
✅ **Next.js frontend** (growstreams.xyz)  
✅ **Full documentation** (spec, API ref, security model)

### What You're Migrating To

**Canton Network** - Privacy-first, institutional-grade distributed ledger  
**Daml 3.4.0** - Functional smart contract language  
**Canton JSON API v1** - Proven working (validated via Canton_Ginie)  
**Target Users** - Node operators, consortiums, enterprise service providers

### The Two-Phase Plan

| Phase | Deliverables | Funding | Timeline |
|-------|-------------|---------|----------|
| **Phase 1** | StreamAgreement + Accrual Engine + Testnet Deploy | $35,000 CC | 10 weeks |
| **Phase 2** | Split Router + Credit Cap + Enterprise Controls | $40,000 CC | 12 weeks |

---

## Current State Analysis

### Your Vara Contracts → Canton Daml Mapping

| Vara Contract (Rust) | Canton Equivalent (Daml) | Complexity | Priority |
|---------------------|-------------------------|------------|----------|
| **grow-token** (VFT) | `GrowToken.daml` | Low | P0 |
| **stream-core** | `StreamCore.daml` + `StreamAgreement.daml` | Medium | P0 |
| **token-vault** | `TokenVault.daml` | Medium | P0 |
| **splits-router** | `SplitsRouter.daml` | Medium | P1 |
| **permission-manager** | Built-in (signatory/observer) | Low | P1 |
| **bounty-adapter** | `BountyAdapter.daml` | Low | P2 |
| **identity-registry** | `IdentityRegistry.daml` | Low | P2 |

### Key Architecture Differences

| Aspect | Vara (Current) | Canton (Target) |
|--------|---------------|-----------------|
| **Language** | Rust (Gear Sails 0.6) | Daml 3.4.0 |
| **State Model** | Mutable actor state | Immutable contracts |
| **Time** | Block timestamp | Ledger Time (native) |
| **Privacy** | Public by default | Sub-transaction privacy |
| **API** | sails-js + REST | Canton JSON API + Ledger API |
| **Testing** | E2E scripts (mjs) | Daml Scripts |
| **Deployment** | Program ID | DAR + Contract ID |

---

## Phase-by-Phase Execution Plan

---

## 🎯 PHASE 1: Core Streaming Primitive (Weeks 1-10)

**Goal**: StreamAgreement live on Canton testnet with full accrual engine

**Funding**: $35,000 in Canton Coin

### Week 1-2: Environment Setup & Learning

#### Week 1: Daml SDK Setup

**Tasks**:
- [ ] Install Daml SDK 3.4.0
  ```bash
  curl -sSL https://get.daml.com/ | sh
  daml version  # Verify 3.4.0
  ```

- [ ] Study Canton_Ginie examples
  - [ ] Read `asset_transfer.daml` (token pattern)
  - [ ] Read `escrow.daml` (vault pattern)
  - [ ] Understand `canton_client_v2.py` (API integration)

- [ ] Create GrowStreams Daml project
  ```bash
  cd ~/Documents/canton/GrowStreams_Backend-main
  mkdir daml-contracts && cd daml-contracts
  
  # Create daml.yaml
  cat > daml.yaml << 'EOF'
  sdk-version: 3.4.0
  name: growstreams
  version: 1.0.0
  source: daml
  dependencies:
    - daml-prim
    - daml-stdlib
    - daml-script
  build-options:
    - --target=2.1
  EOF
  
  mkdir -p daml
  ```

- [ ] Test compile empty project
  ```bash
  daml build
  # Should succeed with empty project
  ```

**Deliverables**:
- ✅ Daml SDK installed and working
- ✅ GrowStreams Daml project created
- ✅ Successful test compilation

#### Week 2: Daml Language Mastery

**Tasks**:
- [ ] Complete Daml quickstart tutorial
  ```bash
  cd ~/Documents/canton/daml-main/sdk/templates/skeleton-single-package
  daml start
  # Study Main.daml template structure
  ```

- [ ] Study Daml syntax rules (from Canton_Ginie)
  - [ ] Template structure (`with`, `where`, `signatory`, `observer`)
  - [ ] Choice structure (`with` before `controller`)
  - [ ] Single `ensure` clause with `&&`
  - [ ] Party types (not Text)
  - [ ] Decimal types (not Float)

- [ ] Write first simple contract
  ```daml
  -- daml/HelloStream.daml
  module HelloStream where
  
  import Daml.Script
  
  template SimpleStream
    with
      sender   : Party
      receiver : Party
      amount   : Decimal
    where
      signatory sender
      observer  receiver
      
      ensure amount > 0.0
      
      choice Withdraw : Decimal
        controller receiver
        do
          return amount
  
  testSimple : Script ()
  testSimple = script do
    alice <- allocateParty "Alice"
    bob <- allocateParty "Bob"
    
    streamCid <- submit alice do
      createCmd SimpleStream with
        sender = alice
        receiver = bob
        amount = 100.0
    
    result <- submit bob do
      exerciseCmd streamCid Withdraw
    
    assertMsg "Should withdraw 100" (result == 100.0)
    return ()
  ```

- [ ] Compile and test
  ```bash
  daml build
  daml test --files daml/HelloStream.daml
  ```

**Deliverables**:
- ✅ Daml syntax mastery
- ✅ First contract compiles
- ✅ First test passes

---

### Week 3-4: GrowToken.daml Implementation

#### Week 3: Token Contract

**Reference**: Canton_Ginie's `asset_transfer.daml`

**Tasks**:
- [ ] Create `daml/GrowToken.daml`

```daml
-- daml/GrowToken.daml
module GrowToken where

import DA.Time
import Daml.Script

-- Main token template
template GrowToken
  with
    owner    : Party
    issuer   : Party
    amount   : Decimal
    symbol   : Text
    decimals : Int
  where
    signatory issuer, owner
    
    ensure amount > 0.0 && symbol == "GROW" && decimals == 12
    
    -- Transfer tokens
    choice Transfer : (ContractId GrowToken, Optional (ContractId GrowToken))
      with
        newOwner       : Party
        transferAmount : Decimal
      controller owner
      do
        assertMsg "Insufficient balance" (amount >= transferAmount)
        assertMsg "Invalid amount" (transferAmount > 0.0)
        
        -- Create token for recipient
        recipientToken <- create this with
          owner = newOwner
          amount = transferAmount
        
        -- Create remainder for sender (if any)
        remainder <- if amount > transferAmount then do
          senderToken <- create this with
            amount = amount - transferAmount
          return (Some senderToken)
        else
          return None
        
        return (recipientToken, remainder)
    
    -- Split tokens
    choice Split : (ContractId GrowToken, ContractId GrowToken)
      with splitAmount : Decimal
      controller owner
      do
        assertMsg "Split amount must be less than total" (splitAmount < amount)
        part1 <- create this with amount = splitAmount
        part2 <- create this with amount = amount - splitAmount
        return (part1, part2)
    
    -- Merge tokens
    choice Merge : ContractId GrowToken
      with otherCid : ContractId GrowToken
      controller owner
      do
        other <- fetch otherCid
        assertMsg "Same owner required" (other.owner == owner)
        assertMsg "Same issuer required" (other.issuer == issuer)
        archive otherCid
        create this with amount = amount + other.amount
    
    -- Burn tokens
    choice Burn : Optional (ContractId GrowToken)
      with burnAmount : Decimal
      controller owner
      do
        assertMsg "Insufficient balance" (amount >= burnAmount)
        
        if amount > burnAmount then do
          remaining <- create this with amount = amount - burnAmount
          return (Some remaining)
        else
          return None

-- Allowance for vault deposits
template Allowance
  with
    tokenOwner : Party
    spender    : Party
    amount     : Decimal
    issuer     : Party
  where
    signatory tokenOwner
    observer  spender
    
    choice TransferFrom : (ContractId GrowToken, Optional (ContractId Allowance))
      with
        transferAmount : Decimal
        recipient      : Party
      controller spender
      do
        assertMsg "Exceeds allowance" (amount >= transferAmount)
        
        -- Create token for recipient
        token <- create GrowToken with
          owner = recipient
          issuer = issuer
          amount = transferAmount
          symbol = "GROW"
          decimals = 12
        
        -- Update allowance
        newAllowance <- if amount > transferAmount then do
          updated <- create this with amount = amount - transferAmount
          return (Some updated)
        else
          return None
        
        return (token, newAllowance)

-- Faucet for testing
template Faucet
  with
    admin : Party
  where
    signatory admin
    
    choice Mint : ContractId GrowToken
      with
        recipient : Party
        amount    : Decimal
      controller admin
      do
        create GrowToken with
          owner = recipient
          issuer = admin
          amount = amount
          symbol = "GROW"
          decimals = 12
```

- [ ] Create test script `daml/Test/GrowTokenTest.daml`

```daml
-- daml/Test/GrowTokenTest.daml
module Test.GrowTokenTest where

import Daml.Script
import GrowToken

testTokenTransfer : Script ()
testTokenTransfer = script do
  -- Allocate parties
  admin <- allocateParty "Admin"
  alice <- allocateParty "Alice"
  bob <- allocateParty "Bob"
  
  -- Mint tokens to Alice
  faucet <- submit admin do
    createCmd Faucet with admin = admin
  
  aliceToken <- submit admin do
    exerciseCmd faucet Mint with
      recipient = alice
      amount = 1000.0
  
  -- Alice transfers to Bob
  (bobToken, aliceRemainder) <- submit alice do
    exerciseCmd aliceToken Transfer with
      newOwner = bob
      transferAmount = 100.0
  
  -- Verify Bob's balance
  Some token <- queryContractId bob bobToken
  assertMsg "Bob should have 100 GROW" (token.amount == 100.0)
  
  -- Verify Alice's remainder
  case aliceRemainder of
    Some remainderCid -> do
      Some remainder <- queryContractId alice remainderCid
      assertMsg "Alice should have 900 GROW" (remainder.amount == 900.0)
    None -> abort "Alice should have remainder"
  
  return ()

testTokenSplit : Script ()
testTokenSplit = script do
  admin <- allocateParty "Admin"
  alice <- allocateParty "Alice"
  
  faucet <- submit admin do
    createCmd Faucet with admin = admin
  
  aliceToken <- submit admin do
    exerciseCmd faucet Mint with
      recipient = alice
      amount = 1000.0
  
  -- Split into 400 and 600
  (part1, part2) <- submit alice do
    exerciseCmd aliceToken Split with
      splitAmount = 400.0
  
  -- Verify splits
  Some token1 <- queryContractId alice part1
  Some token2 <- queryContractId alice part2
  
  assertMsg "Part 1 should be 400" (token1.amount == 400.0)
  assertMsg "Part 2 should be 600" (token2.amount == 600.0)
  
  return ()

testTokenMerge : Script ()
testTokenMerge = script do
  admin <- allocateParty "Admin"
  alice <- allocateParty "Alice"
  
  faucet <- submit admin do
    createCmd Faucet with admin = admin
  
  token1 <- submit admin do
    exerciseCmd faucet Mint with
      recipient = alice
      amount = 300.0
  
  token2 <- submit admin do
    exerciseCmd faucet Mint with
      recipient = alice
      amount = 700.0
  
  -- Merge tokens
  merged <- submit alice do
    exerciseCmd token1 Merge with
      otherCid = token2
  
  -- Verify merged amount
  Some mergedToken <- queryContractId alice merged
  assertMsg "Merged should be 1000" (mergedToken.amount == 1000.0)
  
  return ()
```

- [ ] Compile and test
  ```bash
  daml build
  daml test --files daml/Test/GrowTokenTest.daml
  # All 3 tests should pass
  ```

**Deliverables**:
- ✅ GrowToken.daml compiles
- ✅ All token tests pass (Transfer, Split, Merge, Burn)
- ✅ Faucet working for minting

#### Week 4: Token Refinement

**Tasks**:
- [ ] Add approval mechanism tests
- [ ] Test edge cases (zero amounts, negative, etc.)
- [ ] Document token contract
- [ ] Create token usage examples

**Deliverables**:
- ✅ Token contract fully tested
- ✅ Edge cases handled
- ✅ Documentation complete

---

### Week 5-7: StreamCore.daml Implementation

#### Week 5: Core Stream Logic

**Reference**: Canton_Ginie's `escrow.daml` + Your Vara `stream-core`

**Tasks**:
- [ ] Create `daml/StreamCore.daml`

```daml
-- daml/StreamCore.daml
module StreamCore where

import DA.Time
import DA.Date
import GrowToken

data StreamStatus = Active | Paused | Stopped
  deriving (Eq, Show)

-- Main stream template (Obligation-First model)
template StreamAgreement
  with
    streamId    : Int
    sender      : Party
    receiver    : Party
    flowRate    : Decimal  -- GROW per second
    startTime   : Time
    lastUpdate  : Time
    deposited   : Decimal
    withdrawn   : Decimal
    status      : StreamStatus
  where
    signatory sender
    observer  receiver
    
    ensure flowRate > 0.0 && deposited >= 0.0 && withdrawn >= 0.0 && withdrawn <= deposited
    
    -- Calculate accrued amount (THE CORE FORMULA)
    let calculateAccrued (currentTime : Time) : Decimal =
          if status /= Active then 0.0
          else
            let elapsedMicros = subTime currentTime lastUpdate
                elapsedSeconds = convertMicrosecondsToSeconds elapsedMicros
                accrued = flowRate * intToDecimal elapsedSeconds
                available = deposited - withdrawn
            in min accrued available
    
    -- Receiver withdraws accrued tokens
    choice Withdraw : (ContractId StreamAgreement, Decimal)
      with currentTime : Time
      controller receiver
      do
        let withdrawable = calculateAccrued currentTime
        assertMsg "No tokens to withdraw" (withdrawable > 0.0)
        
        -- Update stream state
        newStream <- create this with
          withdrawn = withdrawn + withdrawable
          lastUpdate = currentTime
        
        return (newStream, withdrawable)
    
    -- Sender adds more deposit
    choice TopUp : ContractId StreamAgreement
      with
        additionalDeposit : Decimal
        currentTime       : Time
      controller sender
      do
        assertMsg "Invalid deposit" (additionalDeposit > 0.0)
        
        -- Settle accrued first
        let accrued = calculateAccrued currentTime
        
        create this with
          deposited = deposited + additionalDeposit
          lastUpdate = currentTime
    
    -- Sender pauses stream
    choice Pause : ContractId StreamAgreement
      with currentTime : Time
      controller sender
      do
        assertMsg "Already paused" (status == Active)
        
        -- Settle accrued before pausing
        let accrued = calculateAccrued currentTime
        
        create this with
          status = Paused
          lastUpdate = currentTime
    
    -- Sender resumes stream
    choice Resume : ContractId StreamAgreement
      with currentTime : Time
      controller sender
      do
        assertMsg "Not paused" (status == Paused)
        
        create this with
          status = Active
          lastUpdate = currentTime
    
    -- Sender stops stream permanently
    choice Stop : (Decimal, Decimal)
      with currentTime : Time
      controller sender
      do
        let finalAccrued = calculateAccrued currentTime
        let refundAmount = deposited - withdrawn - finalAccrued
        
        -- Archive stream (returns ())
        return (finalAccrued, refundAmount)
    
    -- Query withdrawable balance (non-consuming)
    choice GetWithdrawable : Decimal
      with currentTime : Time
      controller receiver
      do
        return (calculateAccrued currentTime)

-- Stream factory (creates streams)
template StreamFactory
  with
    admin         : Party
    nextStreamId  : Int
  where
    signatory admin
    
    choice CreateStream : (ContractId StreamFactory, ContractId StreamAgreement)
      with
        sender         : Party
        receiver       : Party
        flowRate       : Decimal
        initialDeposit : Decimal
        currentTime    : Time
      controller sender
      do
        assertMsg "Invalid flow rate" (flowRate > 0.0)
        assertMsg "Invalid deposit" (initialDeposit > 0.0)
        
        -- Create stream
        stream <- create StreamAgreement with
          streamId = nextStreamId
          sender = sender
          receiver = receiver
          flowRate = flowRate
          startTime = currentTime
          lastUpdate = currentTime
          deposited = initialDeposit
          withdrawn = 0.0
          status = Active
        
        -- Update factory
        newFactory <- create this with
          nextStreamId = nextStreamId + 1
        
        return (newFactory, stream)
```

- [ ] Create test script `daml/Test/StreamCoreTest.daml`

```daml
-- daml/Test/StreamCoreTest.daml
module Test.StreamCoreTest where

import Daml.Script
import DA.Time
import DA.Date
import StreamCore

testStreamLifecycle : Script ()
testStreamLifecycle = script do
  -- Setup
  admin <- allocateParty "Admin"
  alice <- allocateParty "Alice"
  bob <- allocateParty "Bob"
  
  -- Create factory
  factory <- submit admin do
    createCmd StreamFactory with
      admin = admin
      nextStreamId = 1
  
  -- Alice creates stream to Bob (0.1 GROW/second, 100 GROW deposit)
  let startTime = time (date 2026 Mar 11) 0 0 0
  (newFactory, stream) <- submit alice do
    exerciseCmd factory CreateStream with
      sender = alice
      receiver = bob
      flowRate = 0.1
      initialDeposit = 100.0
      currentTime = startTime
  
  -- Wait 100 seconds (10 GROW accrued)
  let afterTime = addRelTime startTime (seconds 100)
  
  -- Bob withdraws
  (updatedStream, amount) <- submit bob do
    exerciseCmd stream Withdraw with
      currentTime = afterTime
  
  -- Verify Bob received 10 GROW
  assertMsg "Bob should withdraw 10 GROW" (amount == 10.0)
  
  -- Wait another 400 seconds (total 500 seconds, 50 GROW total accrued)
  let stopTime = addRelTime startTime (seconds 500)
  
  -- Alice stops stream
  (receiverFinal, senderRefund) <- submit alice do
    exerciseCmd updatedStream Stop with
      currentTime = stopTime
  
  -- Verify final balances
  -- Bob gets remaining 40 GROW (50 total - 10 already withdrawn)
  assertMsg "Receiver should get 40 GROW" (receiverFinal == 40.0)
  -- Alice gets refund of 50 GROW (100 - 50 streamed)
  assertMsg "Sender should get 50 GROW refund" (senderRefund == 50.0)
  
  return ()

testStreamPauseResume : Script ()
testStreamPauseResume = script do
  admin <- allocateParty "Admin"
  alice <- allocateParty "Alice"
  bob <- allocateParty "Bob"
  
  factory <- submit admin do
    createCmd StreamFactory with
      admin = admin
      nextStreamId = 1
  
  let startTime = time (date 2026 Mar 11) 0 0 0
  (_, stream) <- submit alice do
    exerciseCmd factory CreateStream with
      sender = alice
      receiver = bob
      flowRate = 0.1
      initialDeposit = 100.0
      currentTime = startTime
  
  -- Stream for 100 seconds
  let pauseTime = addRelTime startTime (seconds 100)
  
  -- Pause stream
  pausedStream <- submit alice do
    exerciseCmd stream Pause with
      currentTime = pauseTime
  
  -- Wait 100 more seconds while paused (no accrual)
  let resumeTime = addRelTime pauseTime (seconds 100)
  
  -- Resume stream
  resumedStream <- submit alice do
    exerciseCmd pausedStream Resume with
      currentTime = resumeTime
  
  -- Wait 100 more seconds
  let withdrawTime = addRelTime resumeTime (seconds 100)
  
  -- Withdraw
  (_, amount) <- submit bob do
    exerciseCmd resumedStream Withdraw with
      currentTime = withdrawTime
  
  -- Should be 20 GROW (100s before pause + 100s after resume = 200s × 0.1)
  assertMsg "Should withdraw 20 GROW" (amount == 20.0)
  
  return ()

testStreamTopUp : Script ()
testStreamTopUp = script do
  admin <- allocateParty "Admin"
  alice <- allocateParty "Alice"
  bob <- allocateParty "Bob"
  
  factory <- submit admin do
    createCmd StreamFactory with
      admin = admin
      nextStreamId = 1
  
  let startTime = time (date 2026 Mar 11) 0 0 0
  (_, stream) <- submit alice do
    exerciseCmd factory CreateStream with
      sender = alice
      receiver = bob
      flowRate = 0.1
      initialDeposit = 10.0  -- Only 10 GROW (100 seconds worth)
      currentTime = startTime
  
  -- Wait 50 seconds
  let topUpTime = addRelTime startTime (seconds 50)
  
  -- Top up with 90 more GROW
  toppedStream <- submit alice do
    exerciseCmd stream TopUp with
      additionalDeposit = 90.0
      currentTime = topUpTime
  
  -- Wait 500 more seconds (total 550 seconds)
  let withdrawTime = addRelTime topUpTime (seconds 500)
  
  -- Withdraw
  (_, amount) <- submit bob do
    exerciseCmd toppedStream Withdraw with
      currentTime = withdrawTime
  
  -- Should be 55 GROW (550s × 0.1, capped at 100 total deposit)
  assertMsg "Should withdraw 55 GROW" (amount == 55.0)
  
  return ()
```

- [ ] Compile and test
  ```bash
  daml build
  daml test --files daml/Test/StreamCoreTest.daml
  # All 3 tests should pass
  ```

**Deliverables**:
- ✅ StreamAgreement template compiles
- ✅ Accrual formula working correctly
- ✅ Lifecycle tests pass (create, withdraw, pause, resume, stop, topup)

#### Week 6: ObligationView & Advanced Features

**Tasks**:
- [ ] Add non-consuming query choices
- [ ] Implement credit cap logic
- [ ] Add buffer management
- [ ] Test edge cases (depleted streams, exact balance, etc.)

**Deliverables**:
- ✅ ObligationView working
- ✅ Credit cap implemented
- ✅ Edge cases tested

#### Week 7: Integration Testing

**Tasks**:
- [ ] Test GrowToken + StreamCore integration
- [ ] Test token transfer → deposit → stream → withdraw flow
- [ ] Performance testing (multiple streams)
- [ ] Documentation

**Deliverables**:
- ✅ Full integration tests passing
- ✅ StreamCore documented
- ✅ Performance validated

---

### Week 8-9: Canton Deployment

#### Week 8: Canton Sandbox Setup

**Tasks**:
- [ ] Download Canton SDK
  ```bash
  cd ~/Downloads
  wget https://github.com/digital-asset/canton/releases/download/v3.4.0/canton-open-source-3.4.0.tar.gz
  tar -xzf canton-open-source-3.4.0.tar.gz
  cd canton-open-source-3.4.0
  ```

- [ ] Start Canton sandbox
  ```bash
  bin/canton -c examples/01-simple-topology/simple-topology.conf
  # Should start on http://localhost:7575
  ```

- [ ] Test Canton JSON API
  ```bash
  curl http://localhost:7575/livez
  # Should return 200 OK
  ```

- [ ] Build DAR file
  ```bash
  cd ~/Documents/canton/GrowStreams_Backend-main/daml-contracts
  daml build
  # Output: .daml/dist/growstreams-1.0.0.dar
  ```

**Deliverables**:
- ✅ Canton sandbox running
- ✅ DAR file built successfully
- ✅ JSON API accessible

#### Week 9: Deploy to Canton

**Tasks**:
- [ ] Create Python Canton client (copy from Canton_Ginie)

```python
# deploy/canton_client.py
import base64
import json
import httpx
from typing import Optional

def make_sandbox_jwt(act_as: list[str], read_as: list[str] = None) -> str:
    """Generate unsigned JWT for Canton sandbox"""
    def _b64url(s: str) -> str:
        return base64.urlsafe_b64encode(s.encode()).rstrip(b"=").decode()
    
    header = _b64url(json.dumps({"alg": "none", "typ": "JWT"}))
    payload = _b64url(json.dumps({
        "ledgerId": "sandbox",
        "applicationId": "growstreams",
        "actAs": act_as,
        "readAs": read_as or act_as,
        "admin": True,
        "exp": 9999999999
    }))
    return f"{header}.{payload}."

class CantonClient:
    def __init__(self, base_url: str = "http://localhost:7575"):
        self.base_url = base_url.rstrip("/")
        self.token = "sandbox-token"
    
    def _headers(self, content_type: str = "application/json") -> dict:
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": content_type
        }
    
    async def upload_dar(self, dar_path: str) -> tuple[bool, str]:
        try:
            with open(dar_path, "rb") as f:
                dar_bytes = f.read()
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/v1/packages",
                    content=dar_bytes,
                    headers=self._headers("application/octet-stream")
                )
            
            if response.status_code in (200, 201):
                print(f"✓ DAR uploaded successfully")
                return True, ""
            return False, f"HTTP {response.status_code}: {response.text}"
        
        except Exception as e:
            return False, str(e)
    
    async def allocate_party(self, party_hint: str) -> tuple[bool, str, str]:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    f"{self.base_url}/v1/parties/allocate",
                    json={
                        "displayName": party_hint,
                        "identifierHint": party_hint.lower().replace(" ", "-")
                    },
                    headers=self._headers()
                )
            
            if response.status_code in (200, 201):
                data = response.json()
                party_id = data["result"]["identifier"]
                print(f"✓ Party allocated: {party_hint} → {party_id}")
                return True, party_id, ""
            
            return False, "", f"HTTP {response.status_code}"
        
        except Exception as e:
            return False, "", str(e)
    
    async def create_contract(
        self,
        template_id: str,
        payload: dict,
        acting_party: str
    ) -> tuple[bool, str, str]:
        try:
            self.token = make_sandbox_jwt([acting_party])
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/v1/create",
                    json={
                        "templateId": template_id,
                        "payload": payload
                    },
                    headers=self._headers()
                )
            
            if response.status_code in (200, 201):
                data = response.json()
                contract_id = data["result"]["contractId"]
                print(f"✓ Contract created: {contract_id}")
                return True, contract_id, ""
            
            return False, "", f"HTTP {response.status_code}: {response.text}"
        
        except Exception as e:
            return False, "", str(e)
```

- [ ] Create deployment script

```python
# deploy/deploy.py
import asyncio
from canton_client import CantonClient

async def deploy():
    print("🚀 GrowStreams Canton Deployment\n")
    
    canton = CantonClient("http://localhost:7575")
    
    # 1. Upload DAR
    print("1. Uploading DAR...")
    success, error = await canton.upload_dar("../.daml/dist/growstreams-1.0.0.dar")
    if not success:
        print(f"❌ Failed: {error}")
        return
    
    # 2. Allocate admin party
    print("\n2. Allocating admin party...")
    success, admin_id, error = await canton.allocate_party("Admin")
    if not success:
        print(f"❌ Failed: {error}")
        return
    
    # 3. Create Faucet
    print("\n3. Creating Faucet...")
    success, faucet_cid, error = await canton.create_contract(
        template_id="growstreams:GrowToken:Faucet",
        payload={"admin": admin_id},
        acting_party=admin_id
    )
    if not success:
        print(f"❌ Failed: {error}")
        return
    
    # 4. Create StreamFactory
    print("\n4. Creating StreamFactory...")
    success, factory_cid, error = await canton.create_contract(
        template_id="growstreams:StreamCore:StreamFactory",
        payload={
            "admin": admin_id,
            "nextStreamId": "1"
        },
        acting_party=admin_id
    )
    if not success:
        print(f"❌ Failed: {error}")
        return
    
    print("\n✅ Deployment Complete!")
    print(f"\nAdmin Party: {admin_id}")
    print(f"Faucet Contract: {faucet_cid}")
    print(f"Factory Contract: {factory_cid}")
    
    # Save to file
    with open("deployment.json", "w") as f:
        json.dump({
            "admin_party": admin_id,
            "faucet_contract": faucet_cid,
            "factory_contract": factory_cid
        }, f, indent=2)
    
    print("\n📄 Deployment info saved to deployment.json")

if __name__ == "__main__":
    asyncio.run(deploy())
```

- [ ] Run deployment
  ```bash
  cd deploy
  pip install httpx
  python deploy.py
  ```

**Deliverables**:
- ✅ DAR uploaded to Canton
- ✅ Admin party allocated
- ✅ Faucet contract created
- ✅ StreamFactory contract created
- ✅ Deployment info saved

---

### Week 10: Phase 1 Verification & Documentation

**Tasks**:
- [ ] Create demo video (2 minutes)
  - Show stream creation
  - Show accrual in real-time
  - Show withdrawal
  - Show pause/resume

- [ ] Write Phase 1 documentation
  - Architecture overview
  - Contract specifications
  - API reference
  - Integration guide

- [ ] Create acceptance criteria checklist
  - [ ] StreamAgreement deployed on Canton testnet
  - [ ] ObligationView returns correct accrual
  - [ ] Pause → Resume → Clip flow working
  - [ ] Demo video published
  - [ ] Documentation complete

- [ ] Submit Phase 1 deliverables to Canton Foundation

**Deliverables**:
- ✅ Phase 1 complete and verified
- ✅ Demo video published
- ✅ Documentation submitted
- ✅ Ready for Phase 2 funding release

---

## 🎯 PHASE 2: Enterprise Controls (Weeks 11-22)

**Goal**: Split Router + Credit Cap + Enterprise-grade controls

**Funding**: $40,000 in Canton Coin

### Week 11-13: Split Router Implementation

#### Week 11: Split Router Design

**Reference**: Your Vara `splits-router` contract

**Tasks**:
- [ ] Create `daml/SplitsRouter.daml`

```daml
-- daml/SplitsRouter.daml
module SplitsRouter where

import DA.List (sortOn)
import Daml.Script
import GrowToken

-- Split group configuration
template SplitGroup
  with
    groupId    : Int
    owner      : Party
    recipients : [(Party, Int)]  -- (party, weight)
    totalWeight: Int
  where
    signatory owner
    
    ensure totalWeight > 0
    ensure all (\(_, w) -> w > 0) recipients
    
    -- Distribute tokens according to weights
    choice Distribute : [ContractId GrowToken]
      with
        tokenCid : ContractId GrowToken
      controller owner
      do
        token <- fetch tokenCid
        assertMsg "Owner must own the token" (token.owner == owner)
        
        -- Archive source token
        archive tokenCid
        
        -- Create tokens for each recipient
        forA recipients $ \(recipient, weight) -> do
          let share = (token.amount * intToDecimal weight) / intToDecimal totalWeight
          create GrowToken with
            owner = recipient
            issuer = token.issuer
            amount = share
            symbol = token.symbol
            decimals = token.decimals
    
    -- Update weights
    choice UpdateWeights : ContractId SplitGroup
      with newRecipients : [(Party, Int)]
      controller owner
      do
        let newTotal = sum (map snd newRecipients)
        create this with
          recipients = newRecipients
          totalWeight = newTotal

-- Split group factory
template SplitGroupFactory
  with
    admin       : Party
    nextGroupId : Int
  where
    signatory admin
    
    choice CreateSplitGroup : (ContractId SplitGroupFactory, ContractId SplitGroup)
      with
        owner      : Party
        recipients : [(Party, Int)]
      controller owner
      do
        let totalWeight = sum (map snd recipients)
        assertMsg "Must have at least one recipient" (not (null recipients))
        assertMsg "All weights must be positive" (all (\(_, w) -> w > 0) recipients)
        
        group <- create SplitGroup with
          groupId = nextGroupId
          owner = owner
          recipients = recipients
          totalWeight = totalWeight
        
        newFactory <- create this with
          nextGroupId = nextGroupId + 1
        
        return (newFactory, group)
```

- [ ] Create test script

```daml
-- daml/Test/SplitsRouterTest.daml
module Test.SplitsRouterTest where

import Daml.Script
import SplitsRouter
import GrowToken

testSplitDistribution : Script ()
testSplitDistribution = script do
  admin <- allocateParty "Admin"
  alice <- allocateParty "Alice"
  bob <- allocateParty "Bob"
  charlie <- allocateParty "Charlie"
  
  -- Create faucet
  faucet <- submit admin do
    createCmd Faucet with admin = admin
  
  -- Mint 1000 GROW to Alice
  aliceToken <- submit admin do
    exerciseCmd faucet Mint with
      recipient = alice
      amount = 1000.0
  
  -- Create split group factory
  factory <- submit admin do
    createCmd SplitGroupFactory with
      admin = admin
      nextGroupId = 1
  
  -- Alice creates split group: Bob 60%, Charlie 40%
  (_, splitGroup) <- submit alice do
    exerciseCmd factory CreateSplitGroup with
      owner = alice
      recipients = [(bob, 60), (charlie, 40)]
  
  -- Distribute Alice's 1000 GROW
  distributedTokens <- submit alice do
    exerciseCmd splitGroup Distribute with
      tokenCid = aliceToken
  
  -- Verify Bob got 600 GROW
  Some bobToken <- queryContractId bob (distributedTokens !! 0)
  assertMsg "Bob should get 600 GROW" (bobToken.amount == 600.0)
  
  -- Verify Charlie got 400 GROW
  Some charlieToken <- queryContractId charlie (distributedTokens !! 1)
  assertMsg "Charlie should get 400 GROW" (charlieToken.amount == 400.0)
  
  return ()
```

**Deliverables**:
- ✅ SplitsRouter.daml compiles
- ✅ Distribution tests pass
- ✅ Weight updates working

#### Week 12-13: Split Router + Stream Integration

**Tasks**:
- [ ] Integrate SplitsRouter with StreamAgreement
- [ ] Test consortium revenue distribution use case
- [ ] Performance testing with multiple recipients
- [ ] Documentation

**Deliverables**:
- ✅ Split Router integrated with streams
- ✅ Consortium use case validated
- ✅ Documentation complete

---

### Week 14-16: Credit Cap & Auto-Pause

#### Week 14: Credit Cap Logic

**Tasks**:
- [ ] Add credit cap to StreamAgreement
- [ ] Implement auto-pause when approaching cap
- [ ] Add solvency checks

```daml
-- Update StreamAgreement with credit cap
template StreamAgreement
  with
    -- ... existing fields ...
    creditCap   : Decimal  -- Maximum allowed obligation
  where
    signatory sender
    observer  receiver
    
    ensure flowRate > 0.0 && creditCap > 0.0
    
    -- Auto-pause check
    let shouldAutoPause (currentTime : Time) : Bool =
          let accrued = calculateAccrued currentTime
              totalObligation = accrued + withdrawn
          in totalObligation >= creditCap * 0.95  -- Pause at 95% of cap
    
    choice CheckAndPause : Optional (ContractId StreamAgreement)
      with currentTime : Time
      controller sender
      do
        if shouldAutoPause currentTime && status == Active then do
          paused <- create this with
            status = Paused
            lastUpdate = currentTime
          return (Some paused)
        else
          return None
```

**Deliverables**:
- ✅ Credit cap implemented
- ✅ Auto-pause working
- ✅ Solvency tests passing

#### Week 15-16: Treasury Delegation

**Tasks**:
- [ ] Implement delegation mechanism
- [ ] Allow admin party to manage streams on behalf of users
- [ ] Test enterprise scenarios

**Deliverables**:
- ✅ Treasury delegation working
- ✅ Enterprise controls tested
- ✅ Security review passed

---

### Week 17-19: SettlementAdapter & Fiat Integration

#### Week 17: Settlement Adapter Design

**Tasks**:
- [ ] Create `daml/SettlementAdapter.daml`
- [ ] Support Canton Coin settlement
- [ ] Design fiat instruction interface

**Deliverables**:
- ✅ SettlementAdapter compiles
- ✅ CC settlement working
- ✅ Fiat interface designed

#### Week 18-19: Integration & Testing

**Tasks**:
- [ ] Test with Canton Coin
- [ ] Test with bank tokens (if available)
- [ ] Performance testing
- [ ] Documentation

**Deliverables**:
- ✅ Multi-asset settlement working
- ✅ Performance validated
- ✅ Documentation complete

---

### Week 20-21: Security Review & Optimization

#### Week 20: Security Audit

**Tasks**:
- [ ] Internal security review
- [ ] Test attack vectors
  - [ ] Reentrancy (not applicable in Daml)
  - [ ] Integer overflow (Decimal type safe)
  - [ ] Authorization bypass
  - [ ] Time manipulation
  - [ ] Solvency breach

- [ ] Fix any vulnerabilities
- [ ] Document security model

**Deliverables**:
- ✅ Zero critical vulnerabilities
- ✅ Security model documented
- ✅ Threat model published

#### Week 21: Performance Optimization

**Tasks**:
- [ ] Optimize contract size
- [ ] Optimize query performance
- [ ] Load testing (100+ concurrent streams)
- [ ] Gas/fee analysis

**Deliverables**:
- ✅ Performance benchmarks met
- ✅ Load testing passed
- ✅ Fee analysis complete

---

### Week 22: Phase 2 Verification & Final Delivery

**Tasks**:
- [ ] Create comprehensive demo
  - Node operator billing scenario
  - Consortium revenue split scenario
  - Service retainer scenario

- [ ] Write final documentation
  - Complete API reference
  - Integration guide
  - Security documentation
  - Deployment guide

- [ ] Create acceptance criteria checklist
  - [ ] Split Router distributes to 5+ parties correctly
  - [ ] Auto-pause triggers at credit cap
  - [ ] SettlementAdapter tested with Canton Coin
  - [ ] Security review complete (zero critical issues)
  - [ ] Documentation published
  - [ ] Demo video published

- [ ] Submit Phase 2 deliverables to Canton Foundation

**Deliverables**:
- ✅ Phase 2 complete and verified
- ✅ Full enterprise suite ready
- ✅ Documentation submitted
- ✅ GrowStreams live on Canton Network

---

## Acceptance Criteria

### Phase 1 Acceptance Criteria

| Criterion | Verification Method | Status |
|-----------|-------------------|--------|
| **StreamAgreement deployed on Canton testnet** | Contract ID verifiable on Canton explorer | ⬜ |
| **ObligationView returns correct accrual at any timestamp** | Test script demonstrates accuracy | ⬜ |
| **Pause → Resume → Clip flow working end-to-end** | Demo video shows full lifecycle | ⬜ |
| **GrowToken.daml compiles and tests pass** | `daml test` output shows 100% pass | ⬜ |
| **StreamCore.daml compiles and tests pass** | `daml test` output shows 100% pass | ⬜ |
| **Demo video published** | YouTube/Vimeo link provided | ⬜ |
| **Documentation complete** | Docs accessible via GitHub/website | ⬜ |

### Phase 2 Acceptance Criteria

| Criterion | Verification Method | Status |
|-----------|-------------------|--------|
| **Split Router distributes to 5+ parties correctly** | Test script with 5 recipients passes | ⬜ |
| **Auto-pause triggers at 95% of credit cap** | Test demonstrates automatic pause | ⬜ |
| **SettlementAdapter works with Canton Coin** | Live transaction on testnet | ⬜ |
| **Treasury delegation allows admin management** | Test shows admin creating stream for user | ⬜ |
| **Security review complete** | Report shows zero critical vulnerabilities | ⬜ |
| **Load testing passed** | 100+ concurrent streams handled | ⬜ |
| **Documentation published** | Full API ref + integration guide live | ⬜ |
| **Demo video published** | 3 use case scenarios demonstrated | ⬜ |

---

## Risk Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Daml learning curve steeper than expected** | Medium | Medium | Canton_Ginie examples provide proven patterns; allocate extra time in Week 1-2 |
| **Canton API changes** | Low | High | Use Canton_Ginie's proven v1 API; monitor Canton releases |
| **Time calculation edge cases** | Medium | Medium | Extensive test coverage; reference Vara implementation |
| **Performance issues with many streams** | Low | Medium | Load testing in Week 21; optimize early if issues found |
| **Security vulnerabilities** | Low | High | Security review in Week 20; leverage Daml's formal guarantees |

### Execution Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Phase 1 takes longer than 10 weeks** | Medium | Medium | Milestone-gated funding protects Foundation; we absorb overrun |
| **Canton Foundation delays review** | Low | Low | Provide clear acceptance criteria; proactive communication |
| **Team capacity issues** | Low | High | Core team committed; backup developers identified |
| **Grant funding delayed** | Low | Medium | Phase 1 self-funded if needed; Phase 2 contingent on Phase 1 approval |

---

## Daily Checklist

### Daily Standup Questions

1. **What did I complete yesterday?**
2. **What am I working on today?**
3. **Any blockers?**

### Weekly Review (Every Friday)

- [ ] Review week's progress against roadmap
- [ ] Update task status in this document
- [ ] Identify any risks or blockers
- [ ] Plan next week's priorities
- [ ] Commit code to GitHub
- [ ] Update documentation

### Monthly Milestones

**Month 1 (Weeks 1-4)**:
- ✅ Daml environment setup
- ✅ GrowToken.daml complete
- ✅ StreamCore.daml started

**Month 2 (Weeks 5-8)**:
- ✅ StreamCore.daml complete
- ✅ Canton deployment successful
- ✅ Phase 1 nearly complete

**Month 3 (Weeks 9-13)**:
- ✅ Phase 1 verified and submitted
- ✅ Phase 2 funding released
- ✅ Split Router complete

**Month 4 (Weeks 14-17)**:
- ✅ Credit cap implemented
- ✅ SettlementAdapter complete

**Month 5 (Weeks 18-22)**:
- ✅ Security review complete
- ✅ Phase 2 verified and submitted
- ✅ GrowStreams live on Canton

---

## Next Steps - Start Today

### Immediate Actions (This Week)

1. **Install Daml SDK**
   ```bash
   curl -sSL https://get.daml.com/ | sh
   daml version
   ```

2. **Study Canton_Ginie Examples**
   - Read `asset_transfer.daml`
   - Read `escrow.daml`
   - Understand the patterns

3. **Create Daml Project**
   ```bash
   cd ~/Documents/canton/GrowStreams_Backend-main
   mkdir daml-contracts && cd daml-contracts
   # Create daml.yaml (see Week 1 tasks)
   ```

4. **Test First Compilation**
   ```bash
   daml build
   ```

### This Month's Goals

- ✅ Complete Week 1-4 tasks
- ✅ GrowToken.daml fully tested
- ✅ StreamCore.daml implementation started
- ✅ Daily progress documented

---

## Resources

### Documentation References

- **Canton_Ginie Examples**: `@/Users/prakharmishra/Documents/canton/Canton_Ginie-main/backend/rag/daml_examples/`
- **Canton Client**: `@/Users/prakharmishra/Documents/canton/Canton_Ginie-main/backend/canton/canton_client_v2.py`
- **Learning Guide**: `@/Users/prakharmishra/Documents/canton/CANTON_LEARNING_GUIDE.md`
- **Migration Guide**: `@/Users/prakharmishra/Documents/canton/GROWSTREAMS_CANTON_MIGRATION_COMPLETE_GUIDE.md`
- **Quick Reference**: `@/Users/prakharmishra/Documents/canton/QUICK_START_MIGRATION_CHEATSHEET.md`

### Official Documentation

- **Daml Docs**: https://docs.daml.com/
- **Canton Docs**: https://docs.digitalasset.com/
- **Canton GitHub**: https://github.com/digital-asset/canton

### Your Vara Implementation

- **Current Contracts**: `@/Users/prakharmishra/Documents/canton/GrowStreams_Backend-main/contracts/`
- **API**: `@/Users/prakharmishra/Documents/canton/GrowStreams_Backend-main/api/`
- **Frontend**: `@/Users/prakharmishra/Documents/canton/GrowStreams_Backend-main/frontend/`

---

## Success Metrics

### Phase 1 Success

- ✅ StreamAgreement deployed on Canton testnet
- ✅ 100% test coverage
- ✅ Demo video with 1000+ views
- ✅ Documentation accessed by 10+ developers
- ✅ Foundation approval for Phase 2

### Phase 2 Success

- ✅ Split Router handling 10+ recipient distributions
- ✅ Auto-pause preventing 100% of solvency breaches
- ✅ Zero critical security vulnerabilities
- ✅ 5+ Canton participants expressing interest
- ✅ Foundation approval for full grant

### Long-term Success (Post-Grant)

- 🎯 10+ active streaming relationships on Canton mainnet
- 🎯 $1M+ in total value streamed
- 🎯 3+ enterprise pilots (node operators, consortiums)
- 🎯 Protocol fee revenue > $10K/month
- 🎯 GrowStreams becomes default streaming primitive on Canton

---

## Contact & Support

**Project Lead**: Satyam (@GrowwStreams)  
**Repository**: github.com/growstreams/canton-contracts  
**Documentation**: docs.growstreams.xyz/canton  
**Support**: t.me/hypervara

---

**🚀 Ready to start? Begin with Week 1, Task 1: Install Daml SDK**

**The future of institutional streaming payments starts now.**
