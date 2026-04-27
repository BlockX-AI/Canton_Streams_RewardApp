'use strict';

/**
 * UC4 — Token Vesting
 *
 * Use case: Founders and employees receive tokens continuously after cliff.
 * Stream starts at cliff date, flows at vesting rate.
 * Immutable on-ledger with full audit trail.
 * Privacy: cap table allocations are private.
 *
 * Contract: VestingStream:VestingStream
 * Vest #1: Alice (company/sender) → Bob (employee/receiver)
 * Total: 12,000 GROW over 1 year  |  Cliff: May 4 2026
 *
 * Choice: VestingWithdraw (receiver)  — NOT ClaimVested (that doesn't exist)
 * Guards on-chain: now >= cliffTime AND withdrawable > 0
 */

const { listContracts, exercise } = require('../client/cantonClient');
const { VestingStream: C }        = require('../contracts/choices');
const { VestingStream: T }        = require('../contracts/templateIds');
const { N, S }                    = require('../utils');

async function run(report) {
  report.section('UC4 — Token Vesting', 'Cliff + linear unlock  |  Alice→Bob  12,000 GROW');

  const contracts = await listContracts('Alice');
  const vest = contracts.find(c => c.shortName === 'VestingStream');

  if (!vest) return report.warn('No VestingStream found');

  const p         = vest.payload;
  const now       = Date.now();
  const cliffMs   = new Date(S(p.cliffTime)).getTime();
  const endMs     = new Date(S(p.vestingEnd)).getTime();
  const pastCliff = now >= cliffMs;

  const vestFrac  = (endMs > cliffMs && pastCliff)
    ? Math.min((now - cliffMs) / (endMs - cliffMs), 1.0)
    : 0;
  const totalAmt  = N(p.totalAmount);
  const withdrawn = N(p.withdrawn);
  const vested    = totalAmt * vestFrac;
  const claimable = Math.max(0, vested - withdrawn);

  report.info(`Vest #${S(p.vestingId)}  Alice→Bob  total=${totalAmt.toFixed(2)} GROW`);
  report.info(`Cliff: ${new Date(cliffMs).toLocaleDateString()}  |  Vest end: ${new Date(endMs).toLocaleDateString()}`);
  report.info(`Cliff passed: ${pastCliff ? 'YES' : 'NO (tokens locked)'}  |  Vested: ${(vestFrac * 100).toFixed(2)}%  |  Claimable: ${claimable.toFixed(4)} GROW`);

  if (!pastCliff) {
    const daysLeft = ((cliffMs - now) / 86_400_000).toFixed(1);
    report.info(`Cliff in ${daysLeft} days — tokens locked on-chain until then`);
    report.info('Canton enforces this: VestingWithdraw will assertFail if called before cliff');
    return { pass: true, note: `pre-cliff (${daysLeft} days remaining)` };
  }

  if (claimable < 0.0001) {
    report.info('Nothing claimable yet');
    return { pass: true, note: 'nothing claimable' };
  }

  report.step(`Bob calling VestingWithdraw — claiming ${claimable.toFixed(4)} GROW…`);
  const res = await exercise('Bob', T, vest.contractId, ...Object.values(C.VestingWithdraw()));

  if (res.ok) {
    report.ok(`GROW vested: ${claimable.toFixed(4)} GROW unlocked → Bob (immutable audit trail on-chain)`);
    return { pass: true, tokenMoved: claimable };
  }

  const em = errMsg(res);
  if (em.includes('Cliff not reached')) {
    report.info('Canton enforced cliff — VestingWithdraw correctly rejected before cliff');
    return { pass: true, note: 'cliff enforced on-chain' };
  }
  if (em.includes('Nothing to withdraw')) {
    report.info('Nothing to withdraw yet');
    return { pass: true, note: 'nothing to withdraw' };
  }

  return report.fail(`VestingWithdraw: ${em}`);
}

function errMsg(res) { return JSON.stringify(res.data).slice(0, 150); }

module.exports = { run };
