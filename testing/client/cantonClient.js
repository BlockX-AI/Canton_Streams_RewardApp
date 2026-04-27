'use strict';

const { cantonUrl, userId, parties } = require('../config/localnet');

// ─── Raw HTTP helpers ─────────────────────────────────────────────────────────

async function get(path) {
  const r = await fetch(`${cantonUrl}${path}`);
  return r.json();
}

async function post(path, body) {
  const r = await fetch(`${cantonUrl}${path}`, {
    method  : 'POST',
    headers : { 'Content-Type': 'application/json' },
    body    : JSON.stringify(body),
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); }
  catch { data = { raw: text }; }
  return { ok: r.ok, status: r.status, data };
}

// ─── Public API ───────────────────────────────────────────────────────────────

async function getVersion() {
  return get('/v2/version');
}

async function getLedgerEnd() {
  const d = await get('/v2/state/ledger-end');
  return d.offset ?? d.absolute ?? 0;
}

async function listParties() {
  return get('/v2/parties');
}

/**
 * Query active contracts visible to one party.
 * Returns normalised array: [{ contractId, shortName, moduleName, templateId, payload }]
 */
async function listContracts(partyName, templateFilter = null) {
  const partyId = parties[partyName];
  if (!partyId) throw new Error(`Unknown party: ${partyName}`);

  const offset = await getLedgerEnd();

  const filterValue = templateFilter
    ? { cumulative: [{ templateFilter: { value: { templateId: templateFilter } } }] }
    : {};

  const body = {
    filter         : { filtersByParty: { [partyId]: filterValue } },
    verbose        : true,
    activeAtOffset : offset,
    userId,
  };

  const r    = await fetch(`${cantonUrl}/v2/state/active-contracts`, {
    method  : 'POST',
    headers : { 'Content-Type': 'application/json' },
    body    : JSON.stringify(body),
  });
  const raw  = await r.text();

  const contracts = [];
  for (const line of raw.trim().split('\n')) {
    const l = line.trim();
    if (!l) continue;
    try {
      const parsed = JSON.parse(l);
      const items  = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const entry = item?.contractEntry;
        if (!entry) continue;
        const inner  = Object.values(entry)[0];
        const ce     = inner?.createdEvent;
        if (!ce?.contractId) continue;
        const fullTpl = ce.templateId ?? '';
        const parts   = fullTpl.split(':');
        contracts.push({
          contractId : ce.contractId,
          templateId : fullTpl,
          moduleName : parts[1] ?? '',
          shortName  : parts[2] ?? fullTpl,
          payload    : ce.createArgument ?? {},
        });
      }
    } catch { /* malformed line */ }
  }
  return contracts;
}

/**
 * Submit an exercise command via submit-and-wait.
 * actAsName  : key in config.parties
 * templatePath : 'Module:TemplateName'  (no packageId prefix)
 * contractId   : full Canton contract ID string
 * choice       : choice name (exact as in .daml)
 * choiceArgument : {} for unit choices, else the argument record
 */
async function exercise(actAsName, templatePath, contractId, choice, choiceArgument = {}) {
  const { packageId } = require('../config/localnet');
  const actAs      = parties[actAsName];
  if (!actAs) throw new Error(`Unknown actAs party: ${actAsName}`);

  const readAs     = Object.values(parties);
  const commandId  = `gs-${choice.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const body = {
    commands: [{
      ExerciseCommand: {
        templateId    : `${packageId}:${templatePath}`,
        contractId,
        choice,
        choiceArgument,
      },
    }],
    commandId,
    userId,
    actAs  : [actAs],
    readAs,
  };

  return post('/v2/commands/submit-and-wait', body);
}

/**
 * Submit a create command via submit-and-wait.
 */
async function create(actAsName, templatePath, createArguments) {
  const { packageId } = require('../config/localnet');
  const actAs      = parties[actAsName];
  if (!actAs) throw new Error(`Unknown actAs party: ${actAsName}`);

  const readAs     = Object.values(parties);
  const commandId  = `gs-create-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const body = {
    commands: [{
      CreateCommand: {
        templateId      : `${packageId}:${templatePath}`,
        createArguments,
      },
    }],
    commandId,
    userId,
    actAs  : [actAs],
    readAs,
  };

  return post('/v2/commands/submit-and-wait', body);
}

/**
 * Aggregate GrowToken balances for a party.
 */
async function getTokenBalance(partyName) {
  const contracts = await listContracts(partyName);
  return contracts
    .filter(c => c.shortName === 'GrowToken')
    .reduce((sum, c) => sum + (parseFloat(String(c.payload.amount)) || 0), 0);
}

/**
 * Snapshot GROW balances for all parties.
 */
async function snapshotBalances() {
  const result = {};
  for (const name of Object.keys(parties)) {
    result[name] = await getTokenBalance(name);
  }
  return result;
}

module.exports = { getVersion, getLedgerEnd, listParties, listContracts, exercise, create, getTokenBalance, snapshotBalances };
