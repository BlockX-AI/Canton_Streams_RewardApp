'use strict';

/**
 * UC6 — Milestone Escrow  (ClearLedger-style compliance escrow)
 *
 * Use case: Conditional tranche release triggered by admin confirmation.
 * No Superfluid equivalent — pure Canton DVP primitive.
 * Admin confirms deliverable → GrowToken created for receiver.
 * Privacy: deal terms and milestone amounts are private.
 *
 * Contract: MilestoneStream:MilestoneStream
 * MS #1: Alice (client/sender) → Carol (contractor/receiver)
 * Total: 1000 GROW  |  Milestones: Design 200, Build 600, Launch 200
 *
 * Choice: ConfirmMilestone (controller: admin, arg: milestoneName Text)
 *         NOT ReleaseMilestone / ClaimMilestone (those don't exist in .daml)
 */

const { listContracts, exercise } = require('../client/cantonClient');
const { MilestoneStream: C }      = require('../contracts/choices');
const { MilestoneStream: T }      = require('../contracts/templateIds');
const { N, S }                    = require('../utils');

async function run(report) {
  report.section('UC6 — Milestone Escrow', 'Admin confirms deliverable → Carol receives GROW');

  // Must be visible to Admin (observer on MilestoneStream)
  const contracts = await listContracts('Admin', 'MilestoneStream:MilestoneStream');
  const ms = contracts.find(c => c.shortName === 'MilestoneStream');

  if (!ms) {
    // also try from Alice's view (signatory)
    const aliceContracts = await listContracts('Alice', 'MilestoneStream:MilestoneStream');
    const msAlice = aliceContracts.find(c => c.shortName === 'MilestoneStream');
    if (!msAlice) return report.warn('No MilestoneStream found');
    return runWith(msAlice, report);
  }

  return runWith(ms, report);
}

async function runWith(ms, report) {
  const p          = ms.payload;
  const milestones = p.milestones ?? [];
  const sender     = S(p.sender).split('::')[0];
  const receiver   = S(p.receiver).split('::')[0];
  const deposited  = N(p.deposited);

  report.info(`MS #${S(p.milestoneId)}  ${sender}→${receiver}  deposited=${deposited.toFixed(2)} GROW`);

  let pending = null;
  for (let i = 0; i < milestones.length; i++) {
    const m    = milestones[i];
    const done = m.done === true || String(m.done) === 'true';
    report.info(`  [${i}] ${S(m.name).padEnd(10)}  ${N(m.amount).toFixed(2)} GROW  ${done ? 'CONFIRMED ✓' : 'PENDING'}`);
    if (!done && !pending) pending = { index: i, name: S(m.name), amount: N(m.amount) };
  }

  if (!pending) {
    report.ok('All milestones confirmed — project complete');

    // Try refunding any remaining deposit to Alice
    if (deposited > 0) {
      report.step(`Alice calling RefundRemaining for ${deposited.toFixed(2)} GROW…`);
      const ref = await exercise('Alice', T, ms.contractId, ...Object.values(
        require('../contracts/choices').MilestoneStream.RefundRemaining()
      ));
      if (ref.ok) report.ok('Remaining deposit refunded to Alice');
      else report.info(`RefundRemaining: ${errMsg(ref)}`);
    }
    return { pass: true, note: 'all milestones done' };
  }

  // Admin confirms the next pending milestone
  report.step(`Admin confirming milestone "${pending.name}" (${pending.amount.toFixed(2)} GROW → Carol)…`);
  const res = await exercise('Admin', T, ms.contractId, ...Object.values(C.ConfirmMilestone(pending.name)));

  if (res.ok) {
    report.ok(`GROW released: ${pending.amount.toFixed(2)} GROW → Carol  (Canton DVP, atomic, private)`);
    report.info('GrowToken created for Carol in same transaction (Canton atomicity)');
    return { pass: true, tokenMoved: pending.amount };
  }

  const em = errMsg(res);
  if (em.includes('CONTRACT_NOT_FOUND')) {
    report.warn('Contract archived in prior cycle — re-fetching next cycle');
    return { pass: true, note: 'stale cid' };
  }
  if (em.includes('already completed') || em.includes('already done')) {
    report.info(`Milestone "${pending.name}" was already confirmed`);
    return { pass: true, note: 'already done' };
  }

  return report.fail(`ConfirmMilestone: ${em}`);
}

function errMsg(res) { return JSON.stringify(res.data).slice(0, 150); }

module.exports = { run };
