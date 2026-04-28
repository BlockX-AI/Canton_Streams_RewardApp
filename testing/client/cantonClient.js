'use strict';

const { cantonUrl, userId, parties, packageId } = require('../config/localnet');

// ── Contract store ────────────────────────────────────────────────────────────
// Populated automatically by create() and exercise() via the transaction-tree
// endpoint.  Used as a fallback by listContracts() when the ACS query hits the
// 200-contract node limit (HTTP 413) that accumulates during extended test runs.
const contractStore = new Map(); // contractId → normalised contract

function normaliseCreated(ce) {
  if (!ce?.contractId) return null;
  const fullTpl = ce.templateId ?? '';
  const parts   = fullTpl.split(':');
  return {
    contractId : ce.contractId,
    templateId : fullTpl,
    moduleName : parts[1] ?? '',
    shortName  : parts[2] ?? fullTpl,
    payload    : ce.createArgument ?? {},
  };
}

// Parse a Canton v2 transaction object (tree or flat) and sync the store.
function parseTxIntoStore(tx) {
  let found = false;
  // Tree format: eventsById map
  for (const event of Object.values(tx.eventsById ?? {})) {
    const ex = event.exercisedEvent;
    if (ex?.contractId && ex.consuming === true) { contractStore.delete(ex.contractId); found = true; }
    const c = normaliseCreated(event.createdEvent);
    if (c) { contractStore.set(c.contractId, c); found = true; }
  }
  // Flat format: events array
  for (const ev of (tx.events ?? [])) {
    if (ev.archived?.contractId) { contractStore.delete(ev.archived.contractId); found = true; }
    const c = normaliseCreated(ev.created ?? (ev.contractId ? ev : null));
    if (c) { contractStore.set(c.contractId, c); found = true; }
  }
  // Flat createdEvents / archivedEvents lists
  for (const ce of (tx.createdEvents ?? [])) {
    const c = normaliseCreated(ce);
    if (c) { contractStore.set(c.contractId, c); found = true; }
  }
  for (const ae of (tx.archivedEvents ?? [])) {
    if (ae?.contractId) { contractStore.delete(ae.contractId); found = true; }
  }
  return found;
}

// Sync the contract store from a completed transaction.
// 3-tier fallback: transaction-tree-by-id → flat-transaction-by-id → transaction stream.
async function syncStoreFromUpdate(updateId, completionOffset) {
  if (!updateId) return;

  // Tier 1 — tree endpoint
  try {
    const r = await post('/v2/updates/transaction-tree-by-id', {
      updateId, requestingParties: Object.values(parties),
    });
    if (r.ok) {
      const tx = r.data?.transaction ?? r.data ?? {};
      if (parseTxIntoStore(tx)) return;
    }
  } catch {}

  // Tier 2 — flat endpoint
  try {
    const r = await post('/v2/updates/flat-transaction-by-id', {
      updateId, requestingParties: Object.values(parties),
    });
    if (r.ok) {
      const tx = r.data?.transaction ?? r.data ?? {};
      if (parseTxIntoStore(tx)) return;
    }
  } catch {}

  // Tier 3 — transaction stream at the specific offset
  if (completionOffset != null) {
    try {
      const filtersByParty = {};
      for (const p of Object.values(parties)) filtersByParty[p] = {};
      const r = await post('/v2/updates/transactions', {
        filter: { filtersByParty },
        beginExclusive : Math.max(0, Number(completionOffset) - 1),
        endInclusive   : Number(completionOffset),
        verbose        : true,
        userId,
      });
      if (r.ok) {
        const raw = typeof r.data?.raw === 'string' ? r.data.raw : JSON.stringify(r.data);
        for (const line of raw.split('\n')) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            parseTxIntoStore(parsed?.transaction ?? parsed ?? {});
          } catch {}
        }
      }
    } catch {}
  }
}

// Query the store as a fallback when ACS is unavailable.
function storeQuery(partyName, templateShortName) {
  const partyId = parties[partyName];
  return Array.from(contractStore.values()).filter(c => {
    if (templateShortName && c.shortName !== templateShortName) return false;
    // GrowToken: each party only sees their own tokens (owner field)
    if (c.shortName === 'GrowToken') return c.payload.owner === partyId;
    return true;
  });
}

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
 * templateFilter: e.g. 'StreamCore:StreamAgreement' — shortName is extracted
 *   and used for client-side filtering (no server-side template filter in the
 *   ACS query, since the Canton v2 filter format differs by build).
 * Falls back to the in-process contractStore when ACS returns HTTP 4xx/5xx
 *   (typically 413 — too many contracts after many test cycles locally).
 */
async function listContracts(partyName, templateFilter = null) {
  const partyId   = parties[partyName];
  if (!partyId) throw new Error(`Unknown party: ${partyName}`);
  const shortName = templateFilter ? templateFilter.split(':').pop() : null;

  const offset = await getLedgerEnd();
  const body   = {
    filter         : { filtersByParty: { [partyId]: {} } },
    verbose        : true,
    activeAtOffset : offset,
    userId,
  };

  const r   = await fetch(`${cantonUrl}/v2/state/active-contracts`, {
    method  : 'POST',
    headers : { 'Content-Type': 'application/json' },
    body    : JSON.stringify(body),
  });
  const raw = await r.text();

  if (!r.ok) {
    // ACS unavailable (413 = node limit exceeded after many test cycles).
    // Fall back to the in-process store populated by create/exercise calls.
    return storeQuery(partyName, shortName);
  }

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
        const inner = Object.values(entry)[0];
        const c     = normaliseCreated(inner?.createdEvent);
        if (c) {
          contracts.push(c);
          contractStore.set(c.contractId, c); // keep store in sync
        }
      }
    } catch { /* malformed line */ }
  }

  return shortName ? contracts.filter(c => c.shortName === shortName) : contracts;
}

/**
 * Submit an exercise command via submit-and-wait.
 * Automatically syncs the contract store from the resulting transaction.
 */
async function exercise(actAsName, templatePath, contractId, choice, choiceArgument = {}) {
  const actAs     = parties[actAsName];
  if (!actAs) throw new Error(`Unknown actAs party: ${actAsName}`);

  const readAs    = Object.values(parties);
  const commandId = `gs-${choice.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

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

  const result = await post('/v2/commands/submit-and-wait', body);
  if (result.ok) {
    contractStore.delete(contractId); // always remove exercised contract immediately
    const { updateId, completionOffset } = result.data ?? {};
    if (updateId) await syncStoreFromUpdate(updateId, completionOffset);
  }
  return result;
}

/**
 * Submit a create command via submit-and-wait.
 * Automatically adds the created contract to the store.
 */
async function create(actAsName, templatePath, createArguments) {
  const actAs     = parties[actAsName];
  if (!actAs) throw new Error(`Unknown actAs party: ${actAsName}`);

  const readAs    = Object.values(parties);
  const commandId = `gs-create-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

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

  const result = await post('/v2/commands/submit-and-wait', body);
  if (result.ok) {
    const { updateId, completionOffset } = result.data ?? {};
    if (updateId) await syncStoreFromUpdate(updateId, completionOffset);
  }
  return result;
}

/**
 * Aggregate GrowToken balances for a party.
 */
async function getTokenBalance(partyName) {
  const contracts = await listContracts(partyName, 'GrowToken:GrowToken');
  return contracts.reduce((sum, c) => sum + (parseFloat(String(c.payload.amount)) || 0), 0);
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
