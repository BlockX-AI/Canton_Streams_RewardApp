'use strict';

/**
 * UC1 — Payroll Streaming
 *
 * Use case: Employees receive salary continuously.
 * Every second they work earns proportional compensation.
 * No monthly wait, no batch processing. Withdraw anytime.
 * Privacy: salary amount never visible to third parties.
 *
 * Contract: StreamCore:StreamAgreement
 * Stream #1:  Alice (employer) → Bob (employee)
 * Rate:       1.0 GROW/s
 * Controller: Bob calls Withdraw
 */

const { listContracts, exercise } = require('../client/cantonClient');
const { StreamAgreement }         = require('../contracts/choices');
const { StreamAgreement: T }      = require('../contracts/templateIds');
const { thresholds, parties }     = require('../config/localnet');
const { N, S }                    = require('../utils');

async function run(report) {
  report.section('UC1 — Payroll Streaming', '0.000385–1.0 GROW/s  |  Withdraw anytime');

  // Always re-fetch: Withdraw consumes old contract → new contract ID
  const aliceContracts = await listContracts('Alice');
  const stream = aliceContracts.find(c =>
    c.shortName === 'StreamAgreement' && S(c.payload.streamId) === '1'
  );

  if (!stream) {
    return report.warn('StreamAgreement #1 not found — may be stopped or drained');
  }

  const p       = stream.payload;
  const status  = S(p.status);
  const rate    = N(p.flowRate);
  const elapsed = (Date.now() - new Date(S(p.lastUpdate)).getTime()) / 1000;
  const avail   = N(p.deposited) - N(p.withdrawn);
  const accrued = status === 'Active' ? Math.max(0, Math.min(rate * elapsed, avail)) : 0;

  report.info(`Stream #1  Alice→Bob  status=${status}  rate=${rate.toFixed(4)} GROW/s`);
  report.info(`Deposited=${N(p.deposited).toFixed(4)}  Withdrawn=${N(p.withdrawn).toFixed(4)}  Accrued≈${accrued.toFixed(6)} GROW`);

  if (status !== 'Active' && status !== 'Paused') {
    report.warn(`Stream is ${status} — nothing to do`);
    return { pass: true, note: 'stream stopped' };
  }

  if (status === 'Paused') {
    report.step('Stream paused — employer (Alice) resuming for payroll…');
    const res = await exercise('Alice', T, stream.contractId, ...Object.values(StreamAgreement.Resume()));
    if (!res.ok) return report.fail(`Resume failed: ${errMsg(res)}`);
    report.ok('Stream resumed — accrual running again');
    return { pass: true };
  }

  if (accrued < thresholds.minWithdraw) {
    report.info(`Accrued ${accrued.toFixed(6)} GROW — below threshold, accruing…`);
    return { pass: true, note: 'below threshold' };
  }

  if (avail <= 0) {
    report.warn('Stream deposit exhausted — employer should TopUp');
    report.step('Alice topping up stream with 5000 GROW…');
    const tu = await exercise('Alice', T, stream.contractId, ...Object.values(StreamAgreement.TopUp(5000)));
    if (tu.ok) { report.ok('TopUp confirmed — stream refunded'); }
    else        { report.fail(`TopUp failed: ${errMsg(tu)}`); }
    return { pass: tu.ok };
  }

  // Bob withdraws accrued salary
  report.step(`Bob withdrawing ${accrued.toFixed(6)} GROW (salary)…`);
  const res = await exercise('Bob', T, stream.contractId, ...Object.values(StreamAgreement.Withdraw()));

  if (res.ok) {
    report.ok(`GROW moved: ${accrued.toFixed(6)} GROW → Bob (no batch, no invoice)`);
    return { pass: true, tokenMoved: accrued };
  }

  // StreamAgreement creates new contract on Withdraw — if cid stale, re-fetch
  const errText = errMsg(res);
  if (errText.includes('CONTRACT_NOT_FOUND') || errText.includes('not found')) {
    report.warn('Contract ID stale (archived by prior Withdraw) — will catch up next cycle');
    return { pass: true, note: 'stale cid' };
  }

  return report.fail(`Withdraw failed: ${errText}`);
}

function errMsg(res) { return JSON.stringify(res.data).slice(0, 150); }

module.exports = { run };
