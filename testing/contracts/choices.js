'use strict';

/**
 * Exact choice names from .daml source files + argument builders.
 *
 * Rules verified against .daml source:
 *   StreamCore.daml      — StreamAgreement choices
 *   StreamPool.daml      — StreamPool choices
 *   VestingStream.daml   — VestingStream choices
 *   MilestoneStream.daml — MilestoneStream choices
 *   GrowToken.daml       — GrowToken choices
 */

const StreamAgreement = {
  // controller: receiver, args: unit {}
  Withdraw      : () => ({ choice: 'Withdraw',    choiceArgument: {} }),
  // controller: sender, args: unit {}
  Pause         : () => ({ choice: 'Pause',        choiceArgument: {} }),
  Resume        : () => ({ choice: 'Resume',       choiceArgument: {} }),
  Stop          : () => ({ choice: 'Stop',         choiceArgument: {} }),
  // controller: sender, args: { additionalDeposit: Decimal }
  TopUp         : (amt) => ({ choice: 'TopUp', choiceArgument: { additionalDeposit: String(amt) } }),
  // controller: sender, args: { newRate: Decimal }
  UpdateRate    : (rate) => ({ choice: 'UpdateRate', choiceArgument: { newRate: String(rate) } }),
  // nonconsuming, controller: receiver
  ObligationView : () => ({ choice: 'ObligationView', choiceArgument: {} }),
  GetWithdrawable: () => ({ choice: 'GetWithdrawable', choiceArgument: {} }),
};

const StreamPool = {
  // controller: member, args: { member: Party }
  WithdrawMember   : (memberPartyId) => ({ choice: 'WithdrawMember', choiceArgument: { member: memberPartyId } }),
  // controller: admin, args: { additionalDeposit: Decimal }
  TopUpPool        : (amt) => ({ choice: 'TopUpPool', choiceArgument: { additionalDeposit: String(amt) } }),
  // controller: admin, args: unit {}
  PausePool        : () => ({ choice: 'PausePool',   choiceArgument: {} }),
  ResumePool       : () => ({ choice: 'ResumePool',  choiceArgument: {} }),
  // controller: admin, args: { newMember: Party, units: Decimal }
  AddMember        : (memberPartyId, units) => ({ choice: 'AddMember', choiceArgument: { newMember: memberPartyId, units: String(units) } }),
  // controller: member, nonconsuming
  GetMemberAccrued : (memberPartyId) => ({ choice: 'GetMemberAccrued', choiceArgument: { member: memberPartyId } }),
};

const VestingStream = {
  // controller: receiver, args: unit {} — GUARDS: now >= cliffTime AND withdrawable > 0
  VestingWithdraw : () => ({ choice: 'VestingWithdraw', choiceArgument: {} }),
  // controller: sender, args: unit {}
  VestingStop     : () => ({ choice: 'VestingStop',     choiceArgument: {} }),
  // nonconsuming, controller: receiver
  VestedBalance   : () => ({ choice: 'VestedBalance',   choiceArgument: {} }),
};

const MilestoneStream = {
  // controller: admin, args: { milestoneName: Text }
  ConfirmMilestone : (milestoneName) => ({ choice: 'ConfirmMilestone', choiceArgument: { milestoneName } }),
  // controller: sender, args: unit {} — GUARD: all milestones done
  RefundRemaining  : () => ({ choice: 'RefundRemaining', choiceArgument: {} }),
  // controller: sender + admin, args: unit {}
  ForceRefund      : () => ({ choice: 'ForceRefund',     choiceArgument: {} }),
  // nonconsuming
  GetPendingMilestones : () => ({ choice: 'GetPendingMilestones', choiceArgument: {} }),
};

const GrowToken = {
  // controller: owner
  Transfer  : (newOwner, amount) => ({ choice: 'Transfer',  choiceArgument: { newOwner, transferAmount: String(amount) } }),
  Burn      : (amount)           => ({ choice: 'Burn',       choiceArgument: { burnAmount: String(amount) } }),
  Split     : (amount)           => ({ choice: 'Split',      choiceArgument: { splitAmount: String(amount) } }),
  Merge     : (otherCid)         => ({ choice: 'Merge',      choiceArgument: { otherCid } }),
};

module.exports = { StreamAgreement, StreamPool, VestingStream, MilestoneStream, GrowToken };
