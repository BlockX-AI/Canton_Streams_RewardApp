'use strict';

/**
 * Loop runner — repeats smoke cycle on an interval.
 * Tracks cumulative stats across cycles.
 * Use for: soak testing, continuous localnet verification.
 */

const { runOnce }  = require('./smokeRunner');
const { hr }       = require('./reporter');

const INTERVAL_MS  = parseInt(process.env.TEST_INTERVAL_MS || '30000', 10);

const stats = {
  cycles       : 0,
  totalTests   : 0,
  totalPassed  : 0,
  tokenMoves   : 0,
  errors       : 0,
  startTime    : Date.now(),
};

async function loop() {
  console.log(`\x1b[2m  Loop runner — interval ${INTERVAL_MS / 1000}s  |  Ctrl+C to stop\x1b[0m\n`);

  const run = async () => {
    stats.cycles++;
    console.log(`\x1b[1m\x1b[34m  ── Cycle #${stats.cycles}  ──\x1b[0m`);
    try {
      const results = await runOnce();
      stats.totalTests  += results.length;
      stats.totalPassed += results.filter(r => r.pass).length;
    } catch (err) {
      console.error(`\x1b[31m[ERR] Cycle ${stats.cycles} crashed: ${err.message}\x1b[0m`);
      stats.errors++;
    }

    const upSec  = ((Date.now() - stats.startTime) / 1000).toFixed(0);
    const pct    = stats.totalTests > 0
      ? (stats.totalPassed / stats.totalTests * 100).toFixed(1)
      : '0';
    console.log(
      `\n  \x1b[2mCumulative: ${stats.totalPassed}/${stats.totalTests} (${pct}%)  ` +
      `Cycles: ${stats.cycles}  Uptime: ${upSec}s  Errors: ${stats.errors}\x1b[0m`
    );
    console.log(`\x1b[2m  Next cycle in ${INTERVAL_MS / 1000}s…\x1b[0m`);
  };

  await run();
  setInterval(run, INTERVAL_MS);
}

module.exports = { loop };
