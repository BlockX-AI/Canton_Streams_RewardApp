'use strict';

/**
 * Smoke runner — one pass through all 6 use cases.
 * Use for: CI, manual verification, quick pre-flight check.
 * Exit code: 0 if all pass, 1 if any fail.
 */

const { snapshotBalances } = require('../client/cantonClient');
const { diffBalances }     = require('../assertions');
const { makeReport, printBalanceDiff, printSummary, printHeader, hr } = require('./reporter');
const { isoNow }           = require('../utils');

const scenarios = [
  ['UC1 Payroll Streaming',     require('../scenarios/uc1_payroll')],
  ['UC2 LP Incentive Rewards',  require('../scenarios/uc2_lpRewards')],
  ['UC3 Institutional Billing', require('../scenarios/uc3_billing')],
  ['UC4 Token Vesting',         require('../scenarios/uc4_vesting')],
  ['UC5 B2B SaaS Subscription', require('../scenarios/uc5_saas')],
  ['UC6 Milestone Escrow',      require('../scenarios/uc6_milestone')],
];

async function runOnce() {
  printHeader();
  console.log(`  Timestamp : ${isoNow()}`);
  console.log(`  Canton    : ${require('../config/localnet').cantonUrl}`);
  console.log(`  Package   : ${require('../config/localnet').packageId.slice(0, 20)}…`);

  const t0      = Date.now();
  const before  = await snapshotBalances();
  const results = [];

  for (const [label, scenario] of scenarios) {
    const report = makeReport(label);
    let outcome;
    try {
      outcome = await scenario.run(report);
    } catch (err) {
      report.fail(`Uncaught: ${err.message}`);
      outcome = { pass: false };
    }
    const pass = outcome?.pass !== false && report.isPassing();
    results.push({ label, pass, note: outcome?.note });
  }

  const after          = await snapshotBalances();
  const { moved, deltas } = diffBalances(before, after);

  printBalanceDiff(before, after, deltas);
  console.log();
  if (moved) {
    console.log(`  \x1b[32m\x1b[1mGROW tokens are moving on Canton ✓\x1b[0m`);
  } else {
    console.log(`  \x1b[33m[INFO] No token movement this cycle — streams may need more time\x1b[0m`);
  }

  printSummary(results, Date.now() - t0);

  return results;
}

module.exports = { runOnce };
