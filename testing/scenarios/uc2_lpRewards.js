'use strict';

/**
 * UC2 — LP Incentive Rewards
 *
 * Use case: Liquidity providers earn rewards continuously proportional to pool share.
 * StreamFactory manages N parallel streams from one reward pool to multiple LPs.
 * Privacy: deal terms and pool share are private.
 *
 * Contract: StreamPool:StreamPool
 * Pool #1:  Admin controls  |  Alice 70 units (70%)  |  Carol 30 units (30%)
 * Rate:     10.0 GROW/s total
 * Members call WithdrawMember independently.
 */

const { listContracts, exercise } = require('../client/cantonClient');
const { StreamPool: C }           = require('../contracts/choices');
const { StreamPool: T }           = require('../contracts/templateIds');
const { thresholds, parties }     = require('../config/localnet');
const { N, S }                    = require('../utils');

async function run(report) {
  report.section('UC2 — LP Incentive Rewards', 'Proportional pool share  |  10 GROW/s');

  const contracts = await listContracts('Admin');
  const pool = contracts.find(c => c.shortName === 'StreamPool');

  if (!pool) return report.warn('No StreamPool found for Admin');

  const p            = pool.payload;
  const status       = S(p.status);
  const deposited    = N(p.deposited);
  const totalWithdrawn = N(p.totalWithdrawn);
  const available    = deposited - totalWithdrawn;
  const members      = (p.memberStates ?? []);
  const totalUnits   = members.reduce((s, m) => s + N(m.units), 0);

  report.info(`Pool #${S(p.poolId)}  rate=${N(p.totalRate).toFixed(2)} GROW/s  status=${status}`);
  report.info(`Deposited=${deposited.toFixed(2)}  Withdrawn=${totalWithdrawn.toFixed(2)}  Available=${available.toFixed(4)} GROW`);

  // Top up if pool is running low
  if (available < thresholds.poolTopUpAt) {
    report.step(`Pool low (${available.toFixed(2)} GROW) — Admin topping up ${thresholds.poolTopUpAmount} GROW…`);
    const tu = await exercise('Admin', T, pool.contractId, ...Object.values(C.TopUpPool(thresholds.poolTopUpAmount)));
    if (tu.ok) {
      report.ok(`Pool refuelled +${thresholds.poolTopUpAmount} GROW`);
    } else {
      report.fail(`TopUpPool failed: ${errMsg(tu)}`);
      return { pass: false };
    }
  }

  // Pause/resume cycle if needed
  if (status === 'Paused') {
    report.step('Pool paused — Admin resuming…');
    const rr = await exercise('Admin', T, pool.contractId, ...Object.values(C.ResumePool()));
    if (rr.ok) report.ok('Pool resumed');
    else return report.fail(`ResumePool failed: ${errMsg(rr)}`);
  }

  // Fetch fresh contract after any top-up / resume (contract ID changes)
  const fresh = await listContracts('Admin');
  const freshPool = fresh.find(c => c.shortName === 'StreamPool') ?? pool;

  let allPass  = true;
  let currentPool = freshPool;

  for (const m of freshPool.payload.memberStates ?? []) {
    const mName  = S(m.party).split('::')[0];
    const share  = totalUnits > 0 ? (N(m.units) / totalUnits * 100).toFixed(1) : '0';
    const mParty = parties[mName];
    if (!mParty) continue;

    // Always use latest pool contract — WithdrawMember is consuming (archives + creates new)
    const poolNow  = currentPool.payload;
    const mState   = (poolNow.memberStates ?? []).find(x => S(x.party) === mParty);
    if (!mState) continue;

    const mRate   = N(poolNow.totalRate) * (N(mState.units) / (N(poolNow.totalUnits) || 1));
    const elapsed = (Date.now() - new Date(S(mState.lastUpdate)).getTime()) / 1000;
    const avail   = N(poolNow.deposited) - N(poolNow.totalWithdrawn);
    const accrued = Math.max(0, Math.min(mRate * elapsed, avail));

    report.info(`  ${mName}  ${share}% share  accrued≈${accrued.toFixed(4)} GROW  withdrawn=${N(mState.withdrawn).toFixed(4)} GROW`);

    if (accrued < thresholds.minWithdraw) {
      report.info(`  → ${mName}: accrued below threshold, skip`);
      continue;
    }

    report.step(`  ${mName} withdrawing pool share…`);
    const res = await exercise(mName, T, currentPool.contractId, ...Object.values(C.WithdrawMember(mParty)));
    if (res.ok) {
      report.ok(`  GROW moved: ${accrued.toFixed(4)} GROW → ${mName} (proportional to ${share}% share)`);
      // Re-fetch pool — consuming choice created new contract ID
      const refetched = await listContracts('Admin');
      const nextPool  = refetched.find(c => c.shortName === 'StreamPool');
      if (nextPool) currentPool = nextPool;
    } else {
      const em = errMsg(res);
      if (em.includes('Nothing to withdraw')) {
        report.info(`  ${mName}: nothing accrued on-chain yet`);
      } else {
        report.fail(`  ${mName} WithdrawMember: ${em}`);
        allPass = false;
      }
    }
  }

  return { pass: allPass };
}

function errMsg(res) { return JSON.stringify(res.data).slice(0, 150); }

module.exports = { run };
