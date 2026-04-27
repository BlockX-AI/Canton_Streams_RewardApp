'use strict';

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
};

function hr(label = '', width = 64) {
  const line = '─'.repeat(width);
  console.log(`\n${C.bold}${C.cyan}${line}${C.reset}`);
  if (label) console.log(`${C.bold}${C.yellow}  ${label}${C.reset}`);
}

/**
 * Build a report object that captures results for one scenario.
 */
function makeReport(label) {
  const logs    = [];
  let   passing = true;

  const emit = (prefix, msg) => {
    const line = `${prefix} ${msg}`;
    console.log(line);
    logs.push(line);
  };

  return {
    label,
    section : (title, subtitle = '') => {
      console.log();
      hr(`${title}  ${C.dim}${subtitle}${C.reset}`);
    },
    step  : (msg) => emit(`${C.blue}[STEP]${C.reset}`, msg),
    info  : (msg) => emit(`${C.cyan}[INFO]${C.reset}`, msg),
    ok    : (msg) => emit(`${C.green}[PASS]${C.reset}`, msg),
    warn  : (msg) => { emit(`${C.yellow}[WARN]${C.reset}`, msg); return { pass: true, note: 'warned' }; },
    fail  : (msg) => { emit(`${C.red}[FAIL]${C.reset}`, msg); passing = false; return { pass: false }; },
    isPassing : () => passing,
    logs,
  };
}

function printBalanceDiff(before, after, deltas) {
  hr('GROW Token Movement');
  for (const name of Object.keys(before)) {
    const b     = before[name] ?? 0;
    const a     = after[name]  ?? 0;
    const d     = deltas[name] ?? 0;
    const arrow = d > 0.0001  ? `${C.green}▲ +${d.toFixed(6)}${C.reset}` :
                  d < -0.0001 ? `${C.red}▼ ${d.toFixed(6)}${C.reset}`   :
                  `${C.dim}  unchanged${C.reset}`;
    console.log(`  ${C.bold}${name.padEnd(7)}${C.reset}  ${C.cyan}${a.toFixed(6)} GROW${C.reset}  ${arrow}`);
  }
}

function printSummary(results, elapsed) {
  hr('Test Summary');
  let passed = 0;
  for (const r of results) {
    const icon = r.pass ? `${C.green}[PASS]${C.reset}` : `${C.red}[FAIL]${C.reset}`;
    const note = r.note ? `  ${C.dim}(${r.note})${C.reset}` : '';
    console.log(`  ${icon}  ${r.label}${note}`);
    if (r.pass) passed++;
  }
  console.log();
  console.log(`  ${C.bold}Result: ${passed}/${results.length} use cases${C.reset}  ${C.dim}(${elapsed}ms)${C.reset}`);
}

function printHeader() {
  console.log(`\n${C.bold}${C.cyan}`);
  console.log('  ╔═══════════════════════════════════════════════════╗');
  console.log('  ║   GrowStreams  ·  Canton LocalNet Test Harness    ║');
  console.log('  ║   6 Use Cases · Real Daml Contracts · JSON API v2 ║');
  console.log('  ╚═══════════════════════════════════════════════════╝');
  console.log(`${C.reset}`);
}

module.exports = { makeReport, printBalanceDiff, printSummary, printHeader, hr };
