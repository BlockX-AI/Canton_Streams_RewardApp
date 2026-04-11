# Week 1-2: Foundation

**Duration**: March 1-14, 2026  
**Goal**: StreamAgreement Template + Accrual Formula  
**Status**:  Complete

---

##  Objectives

1. Design StreamAgreement template
2. Implement per-second accrual formula
3. Set up basic testing framework
4. Establish party authorization model

---

##  Deliverables

### 1. StreamAgreement Template
**File**: `daml-contracts/daml/StreamCore.daml`

```daml
template StreamAgreement
  with
    streamId    : Int
    sender      : Party
    receiver    : Party
    flowRate    : Decimal  -- GROW per second
    deposited   : Decimal
    withdrawn   : Decimal
    status      : StreamStatus
  where
    signatory sender
    observer  receiver, admin
```

**Features**:
-  Per-second token accrual
-  Sender/receiver party model
-  Flow rate configuration
-  Deposit tracking

---

### 2. Accrual Formula
**Implementation**:

```daml
calculateAccrued : StreamAgreement -> Time -> Decimal
calculateAccrued stream currentTime =
  if stream.status /= Active then 0.0
  else
    let elapsedSeconds = convertMicrosecondsToSeconds (subTime currentTime stream.lastUpdate)
        accrued = stream.flowRate * intToDecimal elapsedSeconds
        available = stream.deposited - stream.withdrawn
    in if accrued > available then available else accrued
```

**Formula**: `accrued = flowRate × secondsElapsed`

**Features**:
-  Precise time calculation (microseconds → seconds)
-  Accrual capped at available balance
-  Zero accrual when paused

---

### 3. Basic Testing
**Tests Created**: 5 initial tests

1. `testStreamLifecycle` - End-to-end stream flow
2. `testInvalidFlowRate` - Negative rate rejection
3. `testInvalidDeposit` - Negative deposit rejection
4. `testStreamDepletion` - Accrual cap verification
5. `testNoWithdrawalWhenZero` - Zero withdrawal prevention

**Status**:  All tests passing

---

### 4. Party Authorization
**Model**:
- **Signatory**: sender (controls stream)
- **Observer**: receiver, admin (can view)
- **Controller**: sender for lifecycle, receiver for withdrawal

**Verification**:  Authorization tests passing

---

##  Metrics

- **Code Written**: ~150 lines of Daml
- **Tests**: 5 tests, 100% passing
- **Templates**: 1 (StreamAgreement)
- **Choices**: 3 (Withdraw, Pause, Stop)

---

## 🔍 Key Learnings

1. **Time Handling**: Canton uses microseconds, need conversion to seconds
2. **Accrual Cap**: Must cap at available balance to prevent over-withdrawal
3. **Authorization**: Proper signatory/observer model critical for security
4. **Testing**: Daml Script provides excellent testing framework

---

##  Acceptance Criteria Met

-  StreamAgreement template implemented
-  Per-second accrual working correctly
-  Basic tests passing
-  Party authorization model established

---

**Week 1-2 Complete!**   
**Next**: Week 3-4 - ObligationView + LifecycleManager
