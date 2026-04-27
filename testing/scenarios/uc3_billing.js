'use strict';

/**
 * UC3 — Institutional Billing
 *
 * Use case: B2B services billed per second of consumption.
 * Cloud compute, data feeds, compliance oracle calls.
 * Client deposits escrow; stream depletes as service is consumed.
 * Privacy: contract rates are confidential between parties.
 *
 * Contract: StreamCore:StreamAgreement
 * Stream #2:  Alice (client/payer) → Carol (service provider)
 * Rate:       0.5 GROW/s  (pay-per-second metering)
 * Pause = session ended, Resume = new session started.
 */

const { listContracts, exercise } = require('../client/cantonClient');
const { StreamAgreement: C }      = require('../contracts/choices');
const { StreamAgreement: T }      = require('../contracts/templateIds');
const { thresholds }              = require('../config/localnet');
const { N, S }                    = require('../utils');

async function run(report) {
  report.section('UC3 — Institutional Billing', 'Per-session metering  |  0.5 GROW/s');

  const aliceContracts = await listContracts('Alice', 'StreamCore:StreamAgreement');
  const stream = aliceContracts.find(c =>
    c.shortName === 'StreamAgreement' && S(c.payload.streamId) === '2'
  );

  if (!stream) return report.warn('StreamAgreement #2 not found');

  const p       = stream.payload;
  const status  = S(p.status);
  const rate    = N(p.flowRate);
  const avail   = N(p.deposited) - N(p.withdrawn);
  const elapsed = status === 'Active'
    ? (Date.now() - new Date(S(p.lastUpdate)).getTime()) / 1000 : 0;
  const accrued = Math.max(0, Math.min(rate * elapsed, avail));

  report.info(`Stream #2  Alice→Carol  status=${status}  rate=${rate} GROW/s`);
  report.info(`Deposited=${N(p.deposited).toFixed(4)}  Withdrawn=${N(p.withdrawn).toFixed(4)}  Billed this session≈${accrued.toFixed(6)} GROW`);

  // Refuel if running low
  if (avail < 10) {
    report.step('Low escrow — Alice topping up 5000 GROW…');
    const tu = await exercise('Alice', T, stream.contractId, ...Object.values(C.TopUp(5000)));
    if (tu.ok) report.ok('TopUp confirmed — client escrow refuelled');
    else report.fail(`TopUp failed: ${errMsg(tu)}`);
  }

  if (status === 'Active') {
    // Simulate: billing session ended — pause the meter
    report.step('Billing session ended — pausing meter (Alice)…');
    const res = await exercise('Alice', T, stream.contractId, ...Object.values(C.Pause()));
    if (!res.ok) return report.fail(`Pause failed: ${errMsg(res)}`);
    report.ok(`Meter paused — ${accrued.toFixed(6)} GROW billed to Carol for this session`);

    // Carol collects what was billed (Pause settles via GrowToken creation in Daml)
    report.info('Carol received GrowToken for billed amount (created by Pause on-chain)');
    return { pass: true, tokenMoved: accrued };

  } else if (status === 'Paused') {
    // Simulate: new session starting — resume meter
    report.step('New API session starting — resuming billing meter (Alice)…');
    const res = await exercise('Alice', T, stream.contractId, ...Object.values(C.Resume()));
    if (!res.ok) return report.fail(`Resume failed: ${errMsg(res)}`);
    report.ok('Meter running — billing per second with no invoice cycle');
    return { pass: true };

  } else {
    report.warn(`Stream status: ${status}`);
    return { pass: false };
  }
}

function errMsg(res) { return JSON.stringify(res.data).slice(0, 150); }

module.exports = { run };
