'use strict';

/**
 * UC5 — B2B SaaS Subscription
 *
 * Use case: Enterprise software paid per second of access.
 * Customer can pause when not using. Vendor always knows exact receivable.
 * No invoice cycles.
 * Privacy: pricing terms are private between parties.
 *
 * Contract: StreamCore:StreamAgreement  (Stream #1 as SaaS proxy)
 * Alice = SaaS vendor  |  Bob = enterprise customer
 * Rate: 1 GROW/s = 2,592,000 GROW/month (30d × 86400s)
 *
 * Demonstrates: pause-when-idle billing model
 *   Active   = customer is using software, meter running
 *   Paused   = idle period, no billing
 *   TopUp    = customer pre-pays more escrow
 */

const { listContracts, exercise } = require('../client/cantonClient');
const { StreamAgreement: C }      = require('../contracts/choices');
const { StreamAgreement: T }      = require('../contracts/templateIds');
const { N, S }                    = require('../utils');

async function run(report) {
  report.section('UC5 — B2B SaaS Subscription', 'Pause-when-idle  |  exact per-second billing');

  const contracts = await listContracts('Alice', 'StreamCore:StreamAgreement');
  const stream = contracts.find(c =>
    c.shortName === 'StreamAgreement' && S(c.payload.streamId) === '1'
  );

  if (!stream) return report.warn('No SaaS stream found (StreamAgreement #1)');

  const p           = stream.payload;
  const status      = S(p.status);
  const rate        = N(p.flowRate);
  const deposited   = N(p.deposited);
  const withdrawn   = N(p.withdrawn);
  const monthlyRate = rate * 2_592_000;
  const daysLeft    = (deposited - withdrawn) / (rate * 86_400);

  report.info(`Alice (vendor) → Bob (customer)  status=${status}`);
  report.info(`Rate: ${rate} GROW/s = ${monthlyRate.toLocaleString()} GROW/30-day period`);
  report.info(`Used: ${withdrawn.toFixed(4)} GROW  |  Remaining: ${(deposited - withdrawn).toFixed(4)} GROW  |  Coverage: ${Math.max(0, daysLeft).toFixed(2)} days`);
  report.info('No invoice, no batch — exact second-level billing enforced by Canton');

  if (deposited - withdrawn < rate * 3600) {
    report.warn('Less than 1hr of escrow left — Bob should TopUp');
    report.step('Bob topping up SaaS subscription escrow with 5000 GROW…');

    // Note: TopUp is controlled by sender (Alice in this contract)
    const tu = await exercise('Alice', T, stream.contractId, ...Object.values(C.TopUp(5000)));
    if (tu.ok) {
      report.ok('Escrow topped up — subscription continues uninterrupted');
      return { pass: true };
    } else {
      report.fail(`TopUp: ${errMsg(tu)}`);
      return { pass: false };
    }
  }

  report.ok(`Subscription solvent — ${Math.max(0, daysLeft).toFixed(2)} days of coverage remaining`);
  report.info('Vendor receivable is exact (no invoicing ambiguity, no settlement lag)');
  return { pass: true };
}

function errMsg(res) { return JSON.stringify(res.data).slice(0, 150); }

module.exports = { run };
