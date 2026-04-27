'use strict';

const { N } = require('../utils');

/**
 * Compare two balance snapshots and report movement.
 * Returns { moved: bool, deltas: {Alice: Δ, Bob: Δ, ...} }
 */
function diffBalances(before, after) {
  const deltas = {};
  let moved = false;
  for (const name of Object.keys(before)) {
    const d = (after[name] ?? 0) - (before[name] ?? 0);
    deltas[name] = d;
    if (Math.abs(d) > 0.0001) moved = true;
  }
  return { moved, deltas };
}

/**
 * Assert that a specific party received tokens (delta > 0).
 */
function assertReceived(deltas, party, minAmount = 0) {
  const d = deltas[party] ?? 0;
  if (d < minAmount) {
    throw new Error(`Expected ${party} to receive ≥${minAmount} GROW, got Δ${d.toFixed(6)}`);
  }
  return true;
}

/**
 * Assert that a specific party's balance decreased (they paid).
 */
function assertSpent(deltas, party) {
  const d = deltas[party] ?? 0;
  if (d >= 0) {
    throw new Error(`Expected ${party} balance to decrease, got Δ${d.toFixed(6)}`);
  }
  return true;
}

/**
 * Assert total GROW in system is conserved (no minting, no burning).
 * Use only when no Faucet/Mint was called during the cycle.
 */
function assertConserved(before, after, tolerance = 0.01) {
  const totalBefore = Object.values(before).reduce((s, v) => s + N(v), 0);
  const totalAfter  = Object.values(after).reduce((s, v) => s + N(v), 0);
  const diff = Math.abs(totalAfter - totalBefore);
  if (diff > tolerance) {
    throw new Error(`Token supply changed by ${diff.toFixed(6)} GROW (expected ≤${tolerance})`);
  }
  return true;
}

module.exports = { diffBalances, assertReceived, assertSpent, assertConserved };
