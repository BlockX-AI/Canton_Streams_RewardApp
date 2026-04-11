# Canton Network - Complete Beginner's Learning Guide

> **Your Goal**: Migrate GrowStreams (currently on Vara Network) to Canton Network
> 
> **Created**: March 11, 2026
> **For**: Prakhar Mishra - GrowStreams Team

---

## 📚 Table of Contents

1. [Understanding Canton Network](#1-understanding-canton-network)
2. [Key Concepts You Must Know](#2-key-concepts-you-must-know)
3. [The Canton Technology Stack](#3-the-canton-technology-stack)
4. [Learning Path - Step by Step](#4-learning-path---step-by-step)
5. [GrowStreams Migration Strategy](#5-growstreams-migration-strategy)
6. [Practical Examples](#6-practical-examples)
7. [Resources & Next Steps](#7-resources--next-steps)

---

## 1. Understanding Canton Network

### What is Canton?

**Canton is NOT a blockchain** - it's a **privacy-focused distributed ledger protocol** that runs Daml smart contracts.

#### Key Differences from Vara Network:

| Aspect | Vara Network (Current) | Canton Network (Target) |
|--------|----------------------|------------------------|
| **Type** | Blockchain (Polkadot parachain) | Distributed ledger protocol |
| **Smart Contracts** | Rust (Gear/Sails) | Daml (functional language) |
| **Privacy** | Public by default | Privacy-first (data partitioning) |
| **Consensus** | Global blockchain | Synchronizers (domain-specific) |
| **Scalability** | Single chain | Partitioned state (horizontal scaling) |
| **Interoperability** | Polkadot ecosystem | Cross-domain via synchronizers |

### Why Canton for GrowStreams?

1. **Privacy**: Stream payments can be private between sender/receiver
2. **Scalability**: No global state bottleneck
3. **Compliance**: Built-in GDPR support, auditability
4. **Enterprise Ready**: Used by financial institutions
5. **Composability**: Virtual global ledger across domains

---

## 2. Key Concepts You Must Know

### 2.1 Core Canton Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Canton Network Layer                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐      ┌────────────┐│
│  │ Participant  │◄────►│ Synchronizer │◄────►│Participant ││
│  │   Node 1     │      │   (Domain)   │      │  Node 2    ││
│  │              │      │              │      │            ││
│  │ - Party A    │      │ - Sequencer  │      │ - Party B  ││
│  │ - Ledger API │      │ - Mediator   │      │ - Ledger   ││
│  └──────────────┘      └──────────────┘      └────────────┘│
│         ▲                                           ▲        │
│         │                                           │        │
│         │          Daml Smart Contracts             │        │
│         └───────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Essential Components

#### **Participants**
- Your application nodes that host parties
- Execute Daml contracts
- Expose Ledger API for reading/writing
- Think of them as "your server nodes"

#### **Synchronizers (Domains)**
- Coordinate transactions between participants
- Contain: Sequencer (ordering) + Mediator (validation)
- Can be public or private
- Multiple synchronizers = horizontal scaling

#### **Parties**
- Identity on the ledger (like wallet addresses)
- Allocated on participants
- Can act on contracts (create, exercise)
- Your users will have party IDs

#### **Contracts**
- Instances of Daml templates
- Live on the ledger
- Have signatories (who created) and observers (who can see)
- Immutable once created

---

## 3. The Canton Technology Stack

### 3.1 Daml Smart Contract Language

**Daml** is a functional programming language (like Haskell) for smart contracts.

#### Basic Daml Template (Similar to Your Rust Contracts):

```daml
-- This is like your StreamCore contract in Rust
module StreamCore where

import Daml.Script

-- Template = Smart Contract Type
template Stream
  with
    streamId : Int
    sender : Party
    receiver : Party
    flowRate : Decimal  -- tokens per second
    deposited : Decimal
    withdrawn : Decimal
    status : StreamStatus
  where
    signatory sender
    observer receiver
    
    -- Choice = Function that can be called
    choice Withdraw : ContractId Stream
      with
        amount : Decimal
      controller receiver
      do
        assertMsg "Insufficient balance" (deposited - withdrawn >= amount)
        create this with withdrawn = withdrawn + amount
    
    choice Stop : ()
      controller sender
      do
        -- Refund sender, close stream
        return ()

data StreamStatus = Active | Paused | Stopped
  deriving (Eq, Show)
```

#### Key Daml Concepts:

1. **Templates**: Like Rust structs + impl blocks combined
2. **Signatories**: Parties who must approve contract creation
3. **Observers**: Parties who can see the contract
4. **Choices**: Functions that modify contracts (like Rust methods)
5. **Controllers**: Who can execute a choice

### 3.2 Ledger API

Your frontend/backend interacts with Canton via **Ledger API**:

```typescript
// Similar to your sails-js API calls
import { Ledger } from '@daml/ledger';

const ledger = new Ledger({
  token: 'your-jwt-token',
  httpBaseUrl: 'http://localhost:7575'
});

// Create a stream (like your createStream in Vara)
await ledger.create(StreamCore.Stream, {
  streamId: 1,
  sender: 'Alice::party',
  receiver: 'Bob::party',
  flowRate: '0.001',
  deposited: '100.0',
  withdrawn: '0.0',
  status: StreamCore.StreamStatus.Active
});

// Query active contracts (like your getStream)
const streams = await ledger.query(StreamCore.Stream);

// Exercise a choice (like calling withdraw)
await ledger.exercise(
  StreamCore.Stream.Withdraw,
  contractId,
  { amount: '10.0' }
);
```

### 3.3 Splice Wallet Kernel

The **Splice Wallet Kernel** provides:

1. **Wallet Gateway**: Server that manages user wallets
2. **dApp SDK**: Browser SDK for connecting to wallets (like MetaMask)
3. **Wallet SDK**: For building wallet providers

```typescript
// In your frontend (similar to @gear-js/api)
import * as sdk from '@canton-network/dapp-sdk';

// Connect to wallet
const result = await sdk.connect();

// Get user accounts
const accounts = await sdk.accounts();

// Prepare transaction
const prepared = await sdk.prepare({
  template: 'StreamCore.Stream',
  choice: 'Withdraw',
  arguments: { amount: '10.0' }
});

// Execute (user signs in wallet)
const executed = await sdk.execute(prepared.preparedTransactionId);
```

---

## 4. Learning Path - Step by Step

### Phase 1: Daml Fundamentals (Week 1-2)

#### Day 1-3: Daml Basics
1. **Install Daml SDK**
   ```bash
   cd ~/Documents/canton
   # Follow: https://docs.daml.com/getting-started/installation.html
   ```

2. **Complete Daml Quickstart**
   - Location: `daml-main/sdk/templates/`
   - Study: `skeleton-single-package/daml/Main.daml`
   - Run the example:
     ```bash
     cd daml-main/sdk/templates/skeleton-single-package
     daml start
     ```

3. **Key Files to Study**:
   - `@/Users/prakharmishra/Documents/canton/daml-main/sdk/templates/skeleton-single-package/daml/Main.daml`
   - `@/Users/prakharmishra/Documents/canton/daml-main/sdk/daml-script/daml/Daml/Script.daml`

#### Day 4-7: Build Your First Daml Contract

**Exercise**: Recreate a simple version of your GROW token in Daml

```daml
module GrowToken where

template Token
  with
    issuer : Party
    owner : Party
    amount : Decimal
  where
    signatory issuer
    observer owner
    
    choice Transfer : ContractId Token
      with
        newOwner : Party
      controller owner
      do
        create this with owner = newOwner
```

#### Day 8-14: Advanced Daml Patterns

Study these patterns from your GrowStreams contracts:

1. **Token Standard** → Daml's built-in `DA.Finance` libraries
2. **Access Control** → Daml's signatory/observer model
3. **State Machines** → Daml choices with status transitions
4. **Cross-Contract Calls** → Daml's `exercise` within choices

### Phase 2: Canton Network (Week 3-4)

#### Day 15-18: Canton Participant Setup

1. **Study Canton Configuration**:
   - Location: `canton-main/community/`
   - Read: `canton-main/README.md`

2. **Run Local Canton Network**:
   ```bash
   cd canton-main
   # Build Canton (requires sbt)
   sbt "community-app/run"
   ```

3. **Understand Canton Console**:
   ```scala
   // Canton console commands
   participant1.parties.list()
   participant1.domains.list_connected()
   participant1.ledger_api.acs.of_party(party)
   ```

#### Day 19-21: Ledger API Integration

1. **Study Ledger API Examples**:
   - TypeScript: `splice-wallet-kernel-main/core/ledger-client/`
   - OpenAPI spec: Check for API documentation

2. **Build Simple Query App**:
   ```typescript
   // Query all your streams
   const myStreams = await ledger.query(Stream, {
     sender: myPartyId
   });
   ```

#### Day 22-28: Wallet Integration

1. **Study Splice Examples**:
   - `@/Users/prakharmishra/Documents/canton/splice-wallet-kernel-main/examples/ping/`
   - `@/Users/prakharmishra/Documents/canton/splice-wallet-kernel-main/examples/portfolio/`

2. **Key File**: `@/Users/prakharmishra/Documents/canton/splice-wallet-kernel-main/examples/ping/src/App.tsx`

3. **Understand the Flow**:
   ```
   User → dApp (React) → dApp SDK → Wallet Gateway → Canton Participant → Ledger
   ```

### Phase 3: GrowStreams on Canton (Week 5-8)

See [Section 5](#5-growstreams-migration-strategy) below.

---

## 5. GrowStreams Migration Strategy

### Current GrowStreams Architecture (Vara)

```
Vara Network
├── Contracts (Rust + Sails)
│   ├── grow-token (VFT)
│   ├── stream-core (streaming logic)
│   ├── token-vault (escrow)
│   ├── splits-router
│   ├── permission-manager
│   └── identity-registry
├── API (Express + sails-js)
└── Frontend (Next.js)
```

### Target GrowStreams Architecture (Canton)

```
Canton Network
├── Daml Contracts
│   ├── GrowToken.daml (fungible token)
│   ├── StreamCore.daml (streaming logic)
│   ├── TokenVault.daml (escrow)
│   ├── SplitsRouter.daml
│   ├── PermissionManager.daml
│   └── IdentityRegistry.daml
├── Backend (Express + @daml/ledger)
└── Frontend (Next.js + @canton-network/dapp-sdk)
```

### Migration Roadmap

#### Phase 1: Core Contracts (2-3 weeks)

**1. GrowToken Contract**

```daml
-- Replace: contracts/grow-token/src/lib.rs
module GrowToken where

template Token
  with
    owner : Party
    amount : Decimal
    issuer : Party
  where
    signatory issuer, owner
    
    choice Transfer : ContractId Token
      with
        newOwner : Party
        transferAmount : Decimal
      controller owner
      do
        assertMsg "Insufficient balance" (amount >= transferAmount)
        -- Split into two tokens
        create this with 
          owner = newOwner
          amount = transferAmount
        create this with
          amount = amount - transferAmount
```

**2. StreamCore Contract**

```daml
-- Replace: contracts/stream-core/src/lib.rs
module StreamCore where

import DA.Time
import DA.Date

template Stream
  with
    streamId : Int
    sender : Party
    receiver : Party
    token : ContractId GrowToken.Token
    flowRate : Decimal  -- tokens per second
    startTime : Time
    lastUpdate : Time
    deposited : Decimal
    withdrawn : Decimal
    status : StreamStatus
  where
    signatory sender
    observer receiver
    
    choice Withdraw : (ContractId Stream, ContractId GrowToken.Token)
      with
        currentTime : Time
      controller receiver
      do
        let elapsed = subTime currentTime lastUpdate
        let accrued = flowRate * intToDecimal (convertMicrosecondsToSeconds elapsed)
        let available = min accrued (deposited - withdrawn)
        
        -- Create token for receiver
        receiverToken <- create GrowToken.Token with
          owner = receiver
          amount = available
          issuer = sender
        
        -- Update stream
        updatedStream <- create this with
          withdrawn = withdrawn + available
          lastUpdate = currentTime
        
        return (updatedStream, receiverToken)
    
    choice Stop : ()
      controller sender
      do
        -- Refund logic
        return ()

data StreamStatus = Active | Paused | Stopped
  deriving (Eq, Show)
```

**3. TokenVault Contract**

```daml
-- Replace: contracts/token-vault/src/lib.rs
module TokenVault where

template Vault
  with
    owner : Party
    deposited : Decimal
    allocated : Decimal
  where
    signatory owner
    
    choice Deposit : ContractId Vault
      with
        amount : Decimal
        tokenCid : ContractId GrowToken.Token
      controller owner
      do
        -- Archive old token
        exercise tokenCid GrowToken.Token.Archive
        
        -- Create new vault state
        create this with
          deposited = deposited + amount
    
    choice Allocate : ContractId Vault
      with
        amount : Decimal
        streamId : Int
      controller owner
      do
        assertMsg "Insufficient funds" (deposited - allocated >= amount)
        create this with
          allocated = allocated + amount
```

#### Phase 2: Backend API (1-2 weeks)

**Replace Express + sails-js with Express + @daml/ledger**

```typescript
// api/src/routes/streams.ts
import { Ledger } from '@daml/ledger';
import express from 'express';

const router = express.Router();

// Initialize Daml Ledger client
const ledger = new Ledger({
  token: process.env.DAML_LEDGER_TOKEN,
  httpBaseUrl: process.env.DAML_LEDGER_URL || 'http://localhost:7575'
});

// GET /api/streams/:id
router.get('/:id', async (req, res) => {
  try {
    const streamId = parseInt(req.params.id);
    
    // Query Daml ledger
    const streams = await ledger.query('StreamCore:Stream', {
      streamId: streamId
    });
    
    if (streams.length === 0) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    res.json(streams[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/streams
router.post('/', async (req, res) => {
  try {
    const { receiver, flowRate, initialDeposit } = req.body;
    
    // Create stream on Daml ledger
    const result = await ledger.create('StreamCore:Stream', {
      sender: req.user.partyId,  // From JWT
      receiver: receiver,
      flowRate: flowRate,
      deposited: initialDeposit,
      // ... other fields
    });
    
    res.json({ streamId: result.contractId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/streams/:id/withdraw
router.post('/:id/withdraw', async (req, res) => {
  try {
    const streamId = req.params.id;
    
    // Exercise Withdraw choice
    const result = await ledger.exercise(
      'StreamCore:Stream:Withdraw',
      streamId,
      { currentTime: new Date() }
    );
    
    res.json({ success: true, amount: result.amount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

#### Phase 3: Frontend Integration (1-2 weeks)

**Replace @gear-js/api with @canton-network/dapp-sdk**

```typescript
// frontend/hooks/useGrowStreams.ts
import * as sdk from '@canton-network/dapp-sdk';
import { useState, useEffect } from 'react';

export function useGrowStreams() {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Connect to Canton wallet
  const connect = async () => {
    const result = await sdk.connect();
    return result;
  };
  
  // Create stream
  const createStream = async (receiver: string, flowRate: string, deposit: string) => {
    setLoading(true);
    try {
      // Prepare transaction
      const prepared = await sdk.prepare({
        template: 'StreamCore.Stream',
        arguments: {
          receiver,
          flowRate,
          deposited: deposit,
          // ... other fields
        }
      });
      
      // Execute (user signs in wallet)
      const result = await sdk.execute(prepared.preparedTransactionId);
      
      return result;
    } finally {
      setLoading(false);
    }
  };
  
  // Withdraw from stream
  const withdraw = async (streamId: string) => {
    const prepared = await sdk.prepare({
      template: 'StreamCore.Stream',
      choice: 'Withdraw',
      contractId: streamId,
      arguments: {
        currentTime: new Date()
      }
    });
    
    return await sdk.execute(prepared.preparedTransactionId);
  };
  
  // Query user's streams
  const loadStreams = async (partyId: string) => {
    const result = await sdk.ledgerApi({
      requestMethod: 'POST',
      resource: '/v2/query',
      body: {
        templateIds: ['StreamCore:Stream'],
        query: { sender: partyId }
      }
    });
    
    setStreams(JSON.parse(result.response).results);
  };
  
  return {
    connect,
    createStream,
    withdraw,
    loadStreams,
    streams,
    loading
  };
}
```

#### Phase 4: Testing & Deployment (2-3 weeks)

1. **Write Daml Scripts** (like your e2e-test.mjs):
   ```daml
   module Test where
   
   import Daml.Script
   import StreamCore
   
   testStreamCreation : Script ()
   testStreamCreation = script do
     alice <- allocateParty "Alice"
     bob <- allocateParty "Bob"
     
     -- Create stream
     streamCid <- submit alice do
       createCmd Stream with
         sender = alice
         receiver = bob
         flowRate = 0.001
         -- ...
     
     -- Test withdrawal
     submit bob do
       exerciseCmd streamCid Withdraw with
         currentTime = ...
   ```

2. **Deploy to Canton Network**:
   - Use Canton testnet or run local network
   - Deploy Daml contracts
   - Configure participant nodes

---

## 6. Practical Examples

### Example 1: Simple Token Transfer

**Vara (Current)**:
```rust
// Rust contract
#[derive(Encode, Decode)]
pub struct Transfer {
    to: ActorId,
    amount: u128,
}

impl VftService {
    pub fn transfer(&mut self, to: ActorId, amount: u128) -> Result<bool, Error> {
        // Transfer logic
    }
}
```

**Canton (Target)**:
```daml
-- Daml contract
template Token
  with
    owner : Party
    amount : Decimal
  where
    signatory owner
    
    choice Transfer : ContractId Token
      with
        newOwner : Party
      controller owner
      do
        create this with owner = newOwner
```

### Example 2: Stream Creation

**Vara (Current)**:
```javascript
// JavaScript API call
const result = await fetch('/api/streams', {
  method: 'POST',
  body: JSON.stringify({
    receiver: '0xRECEIVER',
    flowRate: '1000000000',
    initialDeposit: '50000000000000'
  })
});
```

**Canton (Target)**:
```typescript
// TypeScript SDK call
const prepared = await sdk.prepare({
  template: 'StreamCore.Stream',
  arguments: {
    receiver: 'Bob::party',
    flowRate: '0.001',
    deposited: '50.0'
  }
});

const result = await sdk.execute(prepared.preparedTransactionId);
```

---

## 7. Resources & Next Steps

### Official Documentation

1. **Daml Documentation**: https://docs.daml.com/
2. **Canton Documentation**: https://docs.digitalasset.com/
3. **Splice Wallet Kernel**: `@/Users/prakharmishra/Documents/canton/splice-wallet-kernel-main/README.md`

### Your Local Resources

1. **Canton Source**: `@/Users/prakharmishra/Documents/canton/canton-main/`
2. **Daml SDK**: `@/Users/prakharmishra/Documents/canton/daml-main/sdk/`
3. **Wallet Examples**: `@/Users/prakharmishra/Documents/canton/splice-wallet-kernel-main/examples/`
4. **GrowStreams**: `@/Users/prakharmishra/Documents/canton/GrowStreams_Backend-main/`

### Immediate Action Items

#### Week 1: Setup & Learning
- [ ] Install Daml SDK
- [ ] Run Daml quickstart tutorial
- [ ] Study `Main.daml` template example
- [ ] Build a simple token contract in Daml

#### Week 2: Canton Network
- [ ] Build Canton from source
- [ ] Run local Canton network
- [ ] Deploy your token contract
- [ ] Query contracts via Ledger API

#### Week 3: Wallet Integration
- [ ] Study Splice ping example
- [ ] Build simple dApp with wallet connection
- [ ] Test transaction signing flow

#### Week 4-8: GrowStreams Migration
- [ ] Convert StreamCore to Daml
- [ ] Convert GrowToken to Daml
- [ ] Build new API with @daml/ledger
- [ ] Migrate frontend to Canton SDK
- [ ] Test end-to-end flow

### Key Differences to Remember

| Concept | Vara | Canton |
|---------|------|--------|
| Contract Language | Rust | Daml (functional) |
| State | Mutable | Immutable (create new contracts) |
| API | sails-js | @daml/ledger |
| Wallet | Polkadot.js | Splice Wallet Kernel |
| Identity | ActorId (hex) | Party (string) |
| Deployment | Program ID | Package ID |
| Events | Emitted events | Transaction trees |

### Common Pitfalls to Avoid

1. **Don't think blockchain** - Canton is not a blockchain, it's a distributed ledger
2. **Immutability** - You can't update contracts, you archive and create new ones
3. **Privacy model** - Data is only visible to signatories and observers
4. **Time handling** - Use Daml's Time type, not block timestamps
5. **Testing** - Write Daml Scripts, not just integration tests

---

## Quick Reference: Mapping Your Contracts

| Vara Contract | Canton Equivalent | Priority |
|---------------|-------------------|----------|
| `grow-token` | `GrowToken.daml` | P0 - Start here |
| `stream-core` | `StreamCore.daml` | P0 - Core logic |
| `token-vault` | `TokenVault.daml` | P0 - Essential |
| `splits-router` | `SplitsRouter.daml` | P1 - Later |
| `permission-manager` | Built-in (signatory/observer) | P1 - Rethink |
| `identity-registry` | `IdentityRegistry.daml` | P2 - Optional |

---

## Getting Help

1. **Daml Forum**: https://discuss.daml.com/
2. **Canton GitHub**: https://github.com/digital-asset/canton
3. **Your Local Code**: Study the examples in splice-wallet-kernel-main

---

**Remember**: Canton is fundamentally different from Vara. Take time to understand the privacy model, immutability, and functional programming paradigm. Start small, build incrementally, and test thoroughly.

Good luck with your GrowStreams migration! 🚀
