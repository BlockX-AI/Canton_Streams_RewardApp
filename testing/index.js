'use strict';

/**
 * GrowStreams — Canton LocalNet Test Harness
 *
 * Usage:
 *   node testing/index.js            # single smoke pass, exit 0/1
 *   node testing/index.js --loop     # continuous loop every 30s
 *   TEST_INTERVAL_MS=10000 node testing/index.js --loop   # every 10s
 *
 * All use cases are exercised against the real Canton JSON Ledger API v2.
 * No mocking. No fake state. Canton is the source of truth.
 */

const { getVersion, getLedgerEnd } = require('./client/cantonClient');
const { cantonUrl }                = require('./config/localnet');

async function main() {
  const args = process.argv.slice(2);
  const isLoop = args.includes('--loop');

  // Preflight: verify Canton is reachable
  try {
    const v   = await getVersion();
    const off = await getLedgerEnd();
    console.log(`\x1b[32m[PASS]\x1b[0m Canton reachable at ${cantonUrl}  |  version: ${JSON.stringify(v).slice(0, 60)}  |  offset: ${off}`);
  } catch (e) {
    console.error(`\x1b[31m[FAIL]\x1b[0m Cannot reach Canton at ${cantonUrl}: ${e.message}`);
    console.error('  Ensure: dpm sandbox --json-api-port 7575 is running');
    process.exit(1);
  }

  if (isLoop) {
    const { loop } = require('./runners/loopRunner');
    await loop();
  } else {
    const { runOnce } = require('./runners/smokeRunner');
    const results = await runOnce();
    const failed  = results.filter(r => !r.pass);
    if (failed.length > 0) {
      process.exit(1);
    }
  }
}

main().catch(err => {
  console.error('\x1b[31m[FATAL]\x1b[0m', err.message);
  process.exit(1);
});
