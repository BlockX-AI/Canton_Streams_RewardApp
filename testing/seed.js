'use strict';

/**
 * GrowStreams ledger seeder.
 *
 * Creates all 6 use-case contracts DIRECTLY (no factory indirection).
 * Safe to re-run — each check is idempotent; contracts are created only
 * when absent from the ACS.
 *
 * Canton JSON API v2 encoding rules applied:
 *   - Daml Decimal  → JSON string  e.g. "1.0"
 *   - Daml Time     → ISO 8601 UTC e.g. "2026-04-27T00:00:00Z"
 *   - Daml Int      → JSON number  e.g. 1
 *   - Daml Bool     → JSON boolean e.g. false
 *   - Daml Variant  → plain string for unit constructors e.g. "Active"
 *
 * Usage:
 *   node testing/seed.js        # standalone
 *   require('./seed').seedAll() # called from index.js --seed
 */

const { listContracts, create } = require('./client/cantonClient');
const { parties }               = require('./config/localnet');
const T                         = require('./contracts/templateIds');

const C = {
  green : '\x1b[32m',
  yellow: '\x1b[33m',
  reset : '\x1b[0m',
  dim   : '\x1b[2m',
  bold  : '\x1b[1m',
};

const ok   = (m) => console.log(`${C.green}[SEED ✓]${C.reset} ${m}`);
const skip = (m) => console.log(`${C.dim}[SEED  ]${C.reset} ${m}`);
const boom = (label, res) => {
  throw new Error(`${label} failed (${res.status}): ${JSON.stringify(res.data).slice(0, 400)}`);
};

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}
function isoOffset(days) {
  return new Date(Date.now() + days * 86_400_000).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

async function seedAll() {
  console.log(`\n${C.bold}[SEED] GrowStreams — seeding all 6 use cases...${C.reset}\n`);

  const now = nowIso();

  // ── UC1 + UC5: StreamAgreement #1  Alice→Bob  1.0 GROW/s ─────────────────
  // signatory: sender (Alice) → actAs Alice
  let aliceCs = await listContracts('Alice', 'StreamCore:StreamAgreement');
  const stream1 = aliceCs.find(c => String(c.payload.streamId) === '1');
  if (!stream1) {
    skip('Creating StreamAgreement #1 (Alice→Bob 1.0 GROW/s — UC1 Payroll + UC5 SaaS)...');
    const r = await create('Alice', T.StreamAgreement, {
      streamId   : 1,
      sender     : parties.Alice,
      receiver   : parties.Bob,
      admin      : parties.Admin,
      flowRate   : '1.0',
      startTime  : now,
      lastUpdate : now,
      deposited  : '5000.0',
      withdrawn  : '0.0',
      status     : 'Active',
    });
    if (!r.ok) boom('CreateStreamAgreement #1', r);
    ok('StreamAgreement #1 ready — Alice→Bob 1.0 GROW/s (UC1 Payroll + UC5 SaaS)');
  } else {
    skip('StreamAgreement #1 already exists');
  }

  // ── UC3: StreamAgreement #2  Alice→Carol  0.5 GROW/s ─────────────────────
  aliceCs = await listContracts('Alice', 'StreamCore:StreamAgreement');
  const stream2 = aliceCs.find(c => String(c.payload.streamId) === '2');
  if (!stream2) {
    skip('Creating StreamAgreement #2 (Alice→Carol 0.5 GROW/s — UC3 Billing)...');
    const r = await create('Alice', T.StreamAgreement, {
      streamId   : 2,
      sender     : parties.Alice,
      receiver   : parties.Carol,
      admin      : parties.Admin,
      flowRate   : '0.5',
      startTime  : now,
      lastUpdate : now,
      deposited  : '2000.0',
      withdrawn  : '0.0',
      status     : 'Active',
    });
    if (!r.ok) boom('CreateStreamAgreement #2', r);
    ok('StreamAgreement #2 ready — Alice→Carol 0.5 GROW/s (UC3 Institutional Billing)');
  } else {
    skip('StreamAgreement #2 already exists');
  }

  // ── UC2: StreamPool  Admin  Alice 70 units  Carol 30 units  10 GROW/s ─────
  // signatory: admin → actAs Admin
  let adminCs = await listContracts('Admin', 'StreamPool:StreamPool');
  const pool = adminCs.find(c => c.shortName === 'StreamPool');
  if (!pool) {
    skip('Creating StreamPool (Alice 70 units, Carol 30 units, 10 GROW/s — UC2 LP Rewards)...');
    const r = await create('Admin', T.StreamPool, {
      poolId         : 1,
      admin          : parties.Admin,
      totalRate      : '10.0',
      memberStates   : [
        { party: parties.Alice, units: '70.0', withdrawn: '0.0', lastUpdate: now },
        { party: parties.Carol, units: '30.0', withdrawn: '0.0', lastUpdate: now },
      ],
      totalUnits     : '100.0',
      deposited      : '10000.0',
      totalWithdrawn : '0.0',
      status         : 'Active',
    });
    if (!r.ok) boom('CreateStreamPool', r);
    ok('StreamPool ready — 10 GROW/s, Alice 70%, Carol 30% (UC2 LP Incentive Rewards)');
  } else {
    skip('StreamPool already exists');
  }

  // ── UC4: VestingStream  Alice→Bob  12,000 GROW  cliff=yesterday ───────────
  // signatory: sender (Alice) → actAs Alice
  aliceCs = await listContracts('Alice', 'VestingStream:VestingStream');
  const vest = aliceCs.find(c => c.shortName === 'VestingStream');
  if (!vest) {
    const cliff = isoOffset(-1);   // yesterday — cliff already passed, claimable immediately
    const end   = isoOffset(364);
    skip(`Creating VestingStream (Alice→Bob 12,000 GROW cliff=${cliff} — UC4 Vesting)...`);
    const r = await create('Alice', T.VestingStream, {
      vestingId   : 1,
      sender      : parties.Alice,
      receiver    : parties.Bob,
      admin       : parties.Admin,
      cliffTime   : cliff,
      vestingEnd  : end,
      totalAmount : '12000.0',
      withdrawn   : '0.0',
    });
    if (!r.ok) boom('CreateVestingStream', r);
    ok(`VestingStream ready — 12,000 GROW cliff=${cliff} (UC4 Token Vesting)`);
  } else {
    skip('VestingStream already exists');
  }

  // ── UC6: MilestoneStream  Alice→Carol  1000 GROW  3 milestones ───────────
  // signatory: sender (Alice) → actAs Alice
  aliceCs = await listContracts('Alice', 'MilestoneStream:MilestoneStream');
  adminCs = await listContracts('Admin', 'MilestoneStream:MilestoneStream');
  const ms = adminCs.find(c => c.shortName === 'MilestoneStream')
          || aliceCs.find(c => c.shortName === 'MilestoneStream');
  if (!ms) {
    skip('Creating MilestoneStream (Alice→Carol 1000 GROW — UC6 Milestone Escrow)...');
    const r = await create('Alice', T.MilestoneStream, {
      milestoneId : 1,
      sender      : parties.Alice,
      receiver    : parties.Carol,
      admin       : parties.Admin,
      milestones  : [
        { name: 'Design', amount: '200.0', done: false },
        { name: 'Build',  amount: '600.0', done: false },
        { name: 'Launch', amount: '200.0', done: false },
      ],
      deposited   : '1000.0',
    });
    if (!r.ok) boom('CreateMilestoneStream', r);
    ok('MilestoneStream ready — Design 200 + Build 600 + Launch 200 GROW (UC6 Milestone)');
  } else {
    skip('MilestoneStream already exists');
  }

  console.log(`\n${C.bold}${C.green}[SEED] ✓ All 6 use cases seeded and ready on Canton${C.reset}\n`);
}

module.exports = { seedAll };

if (require.main === module) {
  seedAll().catch(err => {
    console.error(`\x1b[31m[SEED FAIL]\x1b[0m ${err.message}`);
    process.exit(1);
  });
}
