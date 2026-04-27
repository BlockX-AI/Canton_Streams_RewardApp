/**
 * GrowStreams Live Integration Test
 * Simulates 6 real-world use cases on Canton LocalNet using the JSON Ledger API v2.
 *
 * Use cases tested:
 *   UC1  Payroll Streaming      — continuous salary accrual + periodic withdraw
 *   UC2  LP Incentive Rewards   — proportional StreamPool distribution
 *   UC3  Institutional Billing  — per-session pause/resume metering
 *   UC4  Token Vesting          — cliff + linear unlock schedule
 *   UC5  B2B SaaS Subscription  — pause when idle, resume on use, calculate exact billing
 *   UC6  Milestone Escrow       — sender releases, receiver claims per deliverable
 *
 * Run: node growstreams-live-test.js
 * Requires Node >= 18 (native fetch). No npm deps.
 */

'use strict';

// ─── Configuration ───────────────────────────────────────────────────────────

const CANTON_URL = 'http://localhost:7575';
const PKG        = 'ede21c7dd468efab3df48ff5638d165bd6a82f551f608ae19dbfecd21c3c6d84';
const NS         = '1220e2c67d34d1e650204b3a85417ebcbcc20c637e885be34f390d6aebbb1cd6d06e';

const PARTY = {
  Admin : `Admin::${NS}`,
  Alice : `Alice::${NS}`,
  Bob   : `Bob::${NS}`,
  Carol : `Carol::${NS}`,
};

const LOOP_INTERVAL_MS = 30_000;  // re-run all checks every 30 s
const WITHDRAW_THRESHOLD = 0.001; // only withdraw if accrued > this

// ─── Terminal colours ─────────────────────────────────────────────────────────

const C = {
  reset  : '\x1b[0m',
  bold   : '\x1b[1m',
  dim    : '\x1b[2m',
  cyan   : '\x1b[36m',
  green  : '\x1b[32m',
  yellow : '\x1b[33m',
  red    : '\x1b[31m',
  blue   : '\x1b[34m',
  purple : '\x1b[35m',
  white  : '\x1b[37m',
};

const tag = {
  ok   : `${C.green}[PASS]${C.reset}`,
  fail : `${C.red}[FAIL]${C.reset}`,
  info : `${C.cyan}[INFO]${C.reset}`,
  warn : `${C.yellow}[WARN]${C.reset}`,
  step : `${C.blue}[STEP]${C.reset}`,
  move : `${C.purple}[MOVE]${C.reset}`,
};

function log(level, msg) { console.log(`${level} ${msg}`); }
function hr(label) {
  const line = '─'.repeat(62);
  console.log(`\n${C.bold}${C.cyan}${line}${C.reset}`);
  if (label) console.log(`${C.bold}${C.yellow}  ${label}${C.reset}`);
  console.log(`${C.bold}${C.cyan}${line}${C.reset}`);
}

// ─── Canton HTTP Client ───────────────────────────────────────────────────────

async function getLedgerEnd() {
  const r = await fetch(`${CANTON_URL}/v2/state/ledger-end`);
  const d = await r.json();
  return d.offset;
}

async function listContracts(partyName) {
  const partyId = PARTY[partyName];
  if (!partyId) throw new Error(`Unknown party: ${partyName}`);
  const offset = await getLedgerEnd();
  const body = {
    filter      : { filtersByParty: { [partyId]: {} } },
    verbose     : true,
    activeAtOffset: offset,
    userId      : 'participant_admin',
  };
  const r   = await fetch(`${CANTON_URL}/v2/state/active-contracts`, {
    method  : 'POST',
    headers : { 'Content-Type': 'application/json' },
    body    : JSON.stringify(body),
  });
  const raw   = await r.text();
  const items = [];
  for (const line of raw.trim().split('\n')) {
    const l = line.trim();
    if (!l) continue;
    try {
      const parsed = JSON.parse(l);
      for (const obj of (Array.isArray(parsed) ? parsed : [parsed])) {
        const entry = obj?.contractEntry;
        if (!entry) continue;
        const inner = Object.values(entry)[0];
        const ce    = inner?.createdEvent;
        if (!ce?.contractId) continue;
        const fullTpl  = ce.templateId ?? '';
        const shortName = fullTpl.split(':').pop();
        items.push({ contractId: ce.contractId, shortName, templateId: fullTpl, payload: ce.createArgument ?? {} });
      }
    } catch { /* skip */ }
  }
  return items;
}

async function exercise(actAsName, templatePath, contractId, choice, choiceArgument = {}) {
  const actAs    = PARTY[actAsName];
  const readAs   = Object.values(PARTY);
  const commandId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const body = {
    commands: [{
      ExerciseCommand: {
        templateId    : `${PKG}:${templatePath}`,
        contractId,
        choice,
        choiceArgument,
      },
    }],
    commandId,
    userId : 'participant_admin',
    actAs  : [actAs],
    readAs,
  };
  const r = await fetch(`${CANTON_URL}/v2/commands/submit-and-wait`, {
    method  : 'POST',
    headers : { 'Content-Type': 'application/json' },
    body    : JSON.stringify(body),
  });
  const data = await r.json();
  return { ok: r.ok, status: r.status, data };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const N = v => parseFloat(String(v ?? 0)) || 0;
const S = v => String(v ?? '');

function calcAccrued(payload) {
  if (S(payload.status) !== 'Active') return 0;
  const elapsed   = (Date.now() - new Date(S(payload.lastUpdate)).getTime()) / 1000;
  const available = N(payload.deposited) - N(payload.withdrawn);
  return Math.max(0, Math.min(N(payload.flowRate) * elapsed, available));
}

function shortId(contractId) { return contractId.slice(0, 14) + '…'; }

async function getTokenBalances() {
  const balances = {};
  for (const name of Object.keys(PARTY)) {
    const contracts = await listContracts(name);
    const tokens    = contracts.filter(c => c.shortName === 'GrowToken');
    balances[name]  = tokens.reduce((sum, c) => sum + N(c.payload.amount), 0);
  }
  return balances;
}

// ─── Use Case 1: Payroll Streaming ────────────────────────────────────────────
// Employees (Bob) receive salary continuously; withdraw any time.

async function uc1_payrollStreaming() {
  log(tag.step, `${C.bold}UC1 — Payroll Streaming${C.reset}  (0.000385–1.0 GROW/s, withdraw anytime)`);

  const aliceContracts = await listContracts('Alice');
  const stream1 = aliceContracts.find(c =>
    c.shortName === 'StreamAgreement' && S(c.payload.streamId) === '1'
  );
  if (!stream1) { log(tag.warn, 'StreamAgreement #1 not found — may have been stopped'); return false; }

  const accrued = calcAccrued(stream1.payload);
  const status  = S(stream1.payload.status);
  log(tag.info, `  Stream #1  ${C.green}Alice → Bob${C.reset}  status=${C.yellow}${status}${C.reset}  flowRate=${N(stream1.payload.flowRate).toFixed(4)} GROW/s`);
  log(tag.info, `  Deposited=${N(stream1.payload.deposited).toFixed(4)}  Withdrawn=${N(stream1.payload.withdrawn).toFixed(4)}  Accrued now≈${accrued.toFixed(6)} GROW`);

  if (status === 'Active' && accrued > WITHDRAW_THRESHOLD) {
    log(tag.step, `  Bob withdrawing ${accrued.toFixed(6)} GROW…`);
    const res = await exercise('Bob', 'StreamCore:StreamAgreement', stream1.contractId, 'Withdraw');
    if (res.ok) {
      log(tag.ok,   `  ${C.move} Withdraw confirmed — GROW moved from escrow to Bob`);
      return true;
    } else {
      log(tag.fail, `  Withdraw rejected: ${JSON.stringify(res.data).slice(0, 120)}`);
      return false;
    }
  } else if (status === 'Active') {
    log(tag.info, `  Accrued ${accrued.toFixed(6)} GROW — below threshold, waiting`);
    return true;
  } else {
    log(tag.warn, `  Stream is ${status} — resuming for payroll test`);
    if (status === 'Paused') {
      const res = await exercise('Alice', 'StreamCore:StreamAgreement', stream1.contractId, 'Resume');
      log(res.ok ? tag.ok : tag.fail, `  Resume: ${res.ok ? 'OK' : JSON.stringify(res.data).slice(0, 80)}`);
    }
    return status === 'Paused';
  }
}

// ─── Use Case 2: LP Incentive Rewards ─────────────────────────────────────────
// LPs earn proportional to pool share; StreamPool distributes continuously.

async function uc2_lpIncentiveRewards() {
  log(tag.step, `${C.bold}UC2 — LP Incentive Rewards${C.reset}  (StreamPool, proportional share)`);

  const contracts = await listContracts('Alice');
  const pool = contracts.find(c => c.shortName === 'StreamPool');
  if (!pool) { log(tag.warn, 'No StreamPool found'); return false; }

  const members = (pool.payload.memberStates ?? []);
  const totalUnits = members.reduce((s, m) => s + N(m.units), 0);
  log(tag.info, `  Pool #${S(pool.payload.poolId)}  rate=${N(pool.payload.totalRate).toFixed(2)} GROW/s  status=${S(pool.payload.status)}`);

  let pass = true;
  for (const m of members) {
    const name  = S(m.party).split('::')[0];
    const share = totalUnits > 0 ? (N(m.units) / totalUnits * 100).toFixed(1) : '0';
    log(tag.info, `    ${C.purple}${name}${C.reset}  units=${N(m.units).toFixed(0)}  share=${share}%  withdrawn=${N(m.withdrawn).toFixed(4)} GROW`);

    if (S(pool.payload.status) === 'Active' && Object.keys(PARTY).includes(name)) {
      log(tag.step, `    ${name} withdrawing from pool…`);
      const res = await exercise(name, 'StreamPool:StreamPool', pool.contractId, 'WithdrawMember', { member: PARTY[name] });
      if (res.ok) {
        log(tag.ok, `    ${C.move} ${name} pool payout confirmed (${share}% share)`);
      } else {
        const errMsg = JSON.stringify(res.data).slice(0, 100);
        if (errMsg.includes('Nothing to withdraw') || errMsg.includes('0.0')) {
          log(tag.info, `    ${name}: nothing accrued yet`);
        } else {
          log(tag.fail, `    ${name} pool withdraw: ${errMsg}`);
          pass = false;
        }
      }
    }
  }
  return pass;
}

// ─── Use Case 3: Institutional Billing ────────────────────────────────────────
// B2B service billed per second of access; pause when session ends.

async function uc3_institutionalBilling() {
  log(tag.step, `${C.bold}UC3 — Institutional Billing${C.reset}  (pause/resume metering session)`);

  const aliceContracts = await listContracts('Alice');
  const stream2 = aliceContracts.find(c =>
    c.shortName === 'StreamAgreement' && S(c.payload.streamId) === '2'
  );
  if (!stream2) { log(tag.warn, 'StreamAgreement #2 not found'); return false; }

  const status  = S(stream2.payload.status);
  const accrued = calcAccrued(stream2.payload);
  log(tag.info, `  Stream #2  ${C.green}Alice → Carol${C.reset}  status=${C.yellow}${status}${C.reset}  flowRate=${N(stream2.payload.flowRate).toFixed(4)} GROW/s`);
  log(tag.info, `  Deposited=${N(stream2.payload.deposited).toFixed(4)}  Withdrawn=${N(stream2.payload.withdrawn).toFixed(4)}  Accrued≈${accrued.toFixed(6)} GROW`);

  if (status === 'Active') {
    // Simulate: session ended — pause billing
    log(tag.step, '  Session ended — pausing billing stream (Alice)…');
    const res = await exercise('Alice', 'StreamCore:StreamAgreement', stream2.contractId, 'Pause');
    if (res.ok) {
      log(tag.ok, `  ${C.move} Stream paused — billing meter stopped`);
      return true;
    } else {
      log(tag.fail, `  Pause failed: ${JSON.stringify(res.data).slice(0, 100)}`);
      return false;
    }
  } else if (status === 'Paused') {
    // Simulate: new session started — resume billing
    log(tag.step, '  New API session starting — resuming billing stream (Alice)…');
    const res = await exercise('Alice', 'StreamCore:StreamAgreement', stream2.contractId, 'Resume');
    if (res.ok) {
      log(tag.ok, `  ${C.move} Stream resumed — billing meter running`);
      // Carol withdraws accrued if above threshold
      const carolContracts = await listContracts('Carol');
      const carolStream = carolContracts.find(c =>
        c.shortName === 'StreamAgreement' && S(c.payload.streamId) === '2'
      );
      if (carolStream) {
        const carolAccrued = calcAccrued(carolStream.payload);
        if (carolAccrued > WITHDRAW_THRESHOLD) {
          const wRes = await exercise('Carol', 'StreamCore:StreamAgreement', carolStream.contractId, 'Withdraw');
          log(wRes.ok ? tag.ok : tag.fail, `  ${C.move} Carol invoice payment: ${carolAccrued.toFixed(6)} GROW → Carol`);
        }
      }
      return true;
    } else {
      log(tag.fail, `  Resume failed: ${JSON.stringify(res.data).slice(0, 100)}`);
      return false;
    }
  } else {
    log(tag.warn, `  Stream is ${status}`);
    return false;
  }
}

// ─── Use Case 4: Token Vesting ─────────────────────────────────────────────────
// Cliff + linear unlock; immutable schedule on-ledger.

async function uc4_tokenVesting() {
  log(tag.step, `${C.bold}UC4 — Token Vesting${C.reset}  (cliff + linear unlock)`);

  const contracts = await listContracts('Alice');
  const vest = contracts.find(c => c.shortName === 'VestingStream');
  if (!vest) { log(tag.warn, 'No VestingStream found'); return false; }

  const p         = vest.payload;
  const now       = Date.now();
  const cliffTime = new Date(S(p.cliffTime)).getTime();
  const vestEnd   = new Date(S(p.vestingEnd)).getTime();
  const pastCliff = now >= cliffTime;
  const vestFrac  = vestEnd > cliffTime
    ? Math.min(Math.max((now - cliffTime) / (vestEnd - cliffTime), 0), 1)
    : 0;
  const totalAmt  = N(p.totalAmount);
  const vestedAmt = totalAmt * vestFrac;
  const claimed   = N(p.totalWithdrawn ?? 0);
  const claimable = Math.max(0, vestedAmt - claimed);

  log(tag.info, `  Vest #${S(p.vestingId)}  ${C.green}Alice → Bob${C.reset}  total=${totalAmt.toFixed(2)} GROW`);
  log(tag.info, `  Cliff: ${new Date(cliffTime).toLocaleDateString()}  VestEnd: ${new Date(vestEnd).toLocaleDateString()}`);
  log(tag.info, `  Status: ${pastCliff ? C.green + 'Past cliff ✓' : C.yellow + 'Pre-cliff (locked)'}${C.reset}`);
  log(tag.info, `  Vested: ${(vestFrac * 100).toFixed(2)}%  = ${vestedAmt.toFixed(4)} GROW  Claimable: ${claimable.toFixed(4)} GROW`);

  if (pastCliff && claimable > WITHDRAW_THRESHOLD) {
    log(tag.step, `  Bob claiming ${claimable.toFixed(4)} GROW…`);
    const res = await exercise('Bob', 'VestingStream:VestingStream', vest.contractId, 'ClaimVested');
    if (res.ok) {
      log(tag.ok, `  ${C.move} Vested tokens claimed by Bob`);
      return true;
    } else {
      log(tag.fail, `  ClaimVested: ${JSON.stringify(res.data).slice(0, 100)}`);
      return false;
    }
  } else if (!pastCliff) {
    const daysToCliff = ((cliffTime - now) / 86_400_000).toFixed(1);
    log(tag.info, `  ${C.yellow}Cliff in ${daysToCliff} days — tokens locked until then${C.reset}`);
    return true; // expected — vesting not yet unlocked
  } else {
    log(tag.info, `  Nothing claimable yet (${claimable.toFixed(6)} GROW)`);
    return true;
  }
}

// ─── Use Case 5: B2B SaaS Subscription ────────────────────────────────────────
// Customer pauses when idle; vendor always knows exact receivable.

async function uc5_b2bSaasSubscription() {
  log(tag.step, `${C.bold}UC5 — B2B SaaS Subscription${C.reset}  (pause idle, exact metered billing)`);

  // Re-use Stream #1 as SaaS subscription proxy (Alice = vendor, Bob = customer)
  const bobContracts = await listContracts('Bob');
  const stream = bobContracts.find(c => c.shortName === 'StreamAgreement' && S(c.payload.streamId) === '1');
  if (!stream) { log(tag.warn, 'No SaaS stream found'); return false; }

  const p      = stream.payload;
  const status = S(p.status);
  const monthlyRate = N(p.flowRate) * 2_592_000; // 30 days in seconds
  const usedSoFar   = N(p.withdrawn);
  const remaining   = N(p.deposited) - usedSoFar - calcAccrued(p);

  log(tag.info, `  ${C.green}Alice (vendor) → Bob (customer)${C.reset}  status=${C.yellow}${status}${C.reset}`);
  log(tag.info, `  Rate: ${N(p.flowRate).toFixed(6)} GROW/s = ${monthlyRate.toFixed(2)} GROW/month`);
  log(tag.info, `  Used: ${usedSoFar.toFixed(6)} GROW  Remaining escrow: ${remaining.toFixed(4)} GROW`);
  log(tag.info, `  ${C.dim}No invoice cycles — exact usage billed per second${C.reset}`);

  // Simulate Bob's usage pattern: check balance sufficiency
  if (remaining < 10) {
    log(tag.warn, `  ${C.yellow}Low escrow — vendor should notify customer to top up${C.reset}`);
  } else {
    log(tag.ok, `  Subscription solvent — ${(remaining / N(p.flowRate) / 86400).toFixed(1)} days of coverage remaining`);
  }
  return true;
}

// ─── Use Case 6: Milestone Escrow (ClearLedger-style) ─────────────────────────
// Sender releases milestones; receiver claims per deliverable.

async function uc6_milestoneEscrow() {
  log(tag.step, `${C.bold}UC6 — Milestone Escrow${C.reset}  (release per deliverable, claim on completion)`);

  const contracts = await listContracts('Alice');
  const ms = contracts.find(c => c.shortName === 'MilestoneStream');
  if (!ms) { log(tag.warn, 'No MilestoneStream found'); return false; }

  const milestones = (ms.payload.milestones ?? []);
  const sender   = S(ms.payload.sender).split('::')[0];
  const receiver = S(ms.payload.receiver).split('::')[0];
  log(tag.info, `  MS #${S(ms.payload.milestoneId)}  ${C.green}${sender} → ${receiver}${C.reset}  total=${N(ms.payload.deposited).toFixed(2)} GROW`);

  let pass = true;
  for (let i = 0; i < milestones.length; i++) {
    const m     = milestones[i];
    const done  = m.done === true;
    const name  = S(m.name);
    const amt   = N(m.amount).toFixed(2);
    const state = done ? `${C.green}DONE${C.reset}` : `${C.yellow}PENDING${C.reset}`;
    log(tag.info, `    [${i}] ${name.padEnd(10)}  ${amt} GROW  ${state}`);

    if (!done) {
      // Alice releases the next pending milestone
      log(tag.step, `    Alice releasing milestone "${name}" (${amt} GROW)…`);
      const rel = await exercise('Alice', 'MilestoneStream:MilestoneStream', ms.contractId, 'ReleaseMilestone', { milestoneIndex: i });
      if (rel.ok) {
        log(tag.ok, `    ${C.move} Milestone "${name}" released — escrow unlocked`);
        // Carol claims it (get fresh contract ID after release)
        const carolContracts = await listContracts('Carol');
        const freshMs = carolContracts.find(c => c.shortName === 'MilestoneStream');
        if (freshMs) {
          const freshMilestones = (freshMs.payload.milestones ?? []);
          if (freshMilestones[i]?.done === true) {
            const claim = await exercise('Carol', 'MilestoneStream:MilestoneStream', freshMs.contractId, 'ClaimMilestone', { milestoneIndex: i });
            if (claim.ok) {
              log(tag.ok, `    ${C.move} Carol claimed "${name}" — ${amt} GROW transferred`);
            } else {
              log(tag.fail, `    Carol claim failed: ${JSON.stringify(claim.data).slice(0, 100)}`);
              pass = false;
            }
          }
        }
        break; // release one per iteration
      } else {
        const errMsg = JSON.stringify(rel.data).slice(0, 120);
        if (errMsg.includes('already released') || errMsg.includes('already done')) {
          log(tag.info, `    Milestone "${name}" already released`);
        } else {
          log(tag.fail, `    Release failed: ${errMsg}`);
          pass = false;
        }
        break;
      }
    }
  }

  const doneCnt = milestones.filter(m => m.done === true).length;
  log(tag.info, `  Progress: ${doneCnt}/${milestones.length} milestones complete`);
  return pass;
}

// ─── Token Movement Tracker ───────────────────────────────────────────────────

async function reportTokenMovement(before, after) {
  hr('GROW Token Movement');
  let anyMoved = false;
  for (const name of Object.keys(PARTY)) {
    const b = before[name] ?? 0;
    const a = after[name] ?? 0;
    const d = a - b;
    const arrow = d > 0.0001 ? `${C.green}▲ +${d.toFixed(6)}${C.reset}` :
                  d < -0.0001 ? `${C.red}▼ ${d.toFixed(6)}${C.reset}` :
                  `${C.dim}  unchanged${C.reset}`;
    console.log(`  ${C.bold}${name.padEnd(7)}${C.reset}  ${C.cyan}${a.toFixed(6)} GROW${C.reset}  ${arrow}`);
    if (Math.abs(d) > 0.0001) anyMoved = true;
  }
  console.log();
  if (anyMoved) {
    log(tag.ok, `${C.bold}${C.green}GROW tokens are moving on Canton ✓${C.reset}`);
  } else {
    log(tag.info, `${C.yellow}No token movement this cycle (streams may need more time to accrue)${C.reset}`);
  }
}

// ─── Main Loop ────────────────────────────────────────────────────────────────

async function runAllTests() {
  hr(`GrowStreams Live Test  —  ${new Date().toISOString()}`);
  console.log(`${C.dim}  Sandbox: ${CANTON_URL}  |  Package: ${PKG.slice(0, 16)}…${C.reset}\n`);

  const before = await getTokenBalances();

  const results = [];
  const run = async (label, fn) => {
    console.log();
    try {
      const pass = await fn();
      results.push({ label, pass: pass !== false });
    } catch (e) {
      log(tag.fail, `${label}: ${e.message}`);
      results.push({ label, pass: false });
    }
  };

  await run('UC1 Payroll Streaming',       uc1_payrollStreaming);
  await run('UC2 LP Incentive Rewards',    uc2_lpIncentiveRewards);
  await run('UC3 Institutional Billing',   uc3_institutionalBilling);
  await run('UC4 Token Vesting',           uc4_tokenVesting);
  await run('UC5 B2B SaaS Subscription',   uc5_b2bSaasSubscription);
  await run('UC6 Milestone Escrow',        uc6_milestoneEscrow);

  const after = await getTokenBalances();
  await reportTokenMovement(before, after);

  // ── Summary ─────────────────────────────────────────────────────────────────
  hr('Test Summary');
  let passed = 0;
  for (const { label, pass } of results) {
    const icon = pass ? tag.ok : tag.fail;
    console.log(`  ${icon}  ${label}`);
    if (pass) passed++;
  }
  console.log();
  console.log(`  ${C.bold}Result: ${passed}/${results.length} use cases passed${C.reset}`);
  console.log(`  ${C.dim}Next cycle in ${LOOP_INTERVAL_MS / 1000}s…${C.reset}\n`);
}

async function main() {
  console.clear();
  console.log(`${C.bold}${C.cyan}`);
  console.log('  ██████╗ ██████╗  ██████╗ ██╗    ██╗');
  console.log('  ██╔════╝ ██╔══██╗██╔═══██╗██║    ██║');
  console.log('  ██║  ███╗██████╔╝██║   ██║██║ █╗ ██║');
  console.log('  ██║   ██║██╔══██╗██║   ██║██║███╗██║');
  console.log('  ╚██████╔╝██║  ██║╚██████╔╝╚███╔███╔╝');
  console.log('   ╚═════╝ ╚═╝  ╚═╝ ╚═════╝  ╚══╝╚══╝ ');
  console.log(`${C.reset}${C.bold}  GrowStreams — Canton Live Integration Test Suite${C.reset}`);
  console.log(`${C.dim}  Testing 6 use cases: Payroll · LP Rewards · Billing · Vesting · SaaS · Milestones${C.reset}`);

  // verify sandbox is up
  try {
    const r = await fetch(`${CANTON_URL}/v2/state/ledger-end`);
    const d = await r.json();
    console.log(`\n${tag.ok} Canton sandbox reachable — ledger offset: ${d.offset}`);
  } catch (e) {
    console.log(`\n${tag.fail} Cannot reach Canton sandbox at ${CANTON_URL}`);
    console.log(`  Run: dpm sandbox --ledger-api-port 6866 --json-api-port 7575`);
    process.exit(1);
  }

  await runAllTests();
  setInterval(async () => {
    try { await runAllTests(); }
    catch (e) { log(tag.fail, `Uncaught error in test cycle: ${e.message}`); }
  }, LOOP_INTERVAL_MS);
}

main().catch(e => { console.error(e); process.exit(1); });
