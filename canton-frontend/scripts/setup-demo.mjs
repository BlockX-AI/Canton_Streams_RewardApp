// canton-frontend/scripts/setup-demo.mjs
// Creates demo contracts on Canton sandbox via JSON API
// Run: node scripts/setup-demo.mjs
//
// Requires env: CANTON_AUTH_SECRET (must match participant JWT secret)
// Production: replace makeToken with tokens from a real OIDC provider (RS256).
import crypto from 'crypto';

const CANTON_JSON_API = 'http://localhost:7575';
const PACKAGE_ID = process.env.CANTON_PACKAGE_ID ?? 'a60b6d5c583f91e98770e754fe71d1fbc737b36bb9b2ff5d4911dd86ad79358b';
const NAMESPACE = process.env.CANTON_NAMESPACE ?? '12203e76b582b4c420f1e6ee4d1992042e9e5e1bacff0166fc4e87764459aea1d771';

const PARTIES = {
  admin: `Admin::${NAMESPACE}`,
  alice: `Alice::${NAMESPACE}`,
  bob: `Bob::${NAMESPACE}`,
};

// HS256-signed JWT — configure CANTON_AUTH_SECRET to match participant config.
// Never use alg:none in production; replace with RS256 + OIDC for mainnet.
function makeToken(actAs, readAs) {
  const secret = process.env.CANTON_AUTH_SECRET ?? 'change-me-in-production';
  const actAsList  = Array.isArray(actAs)  ? actAs  : [actAs];
  const readAsList = Array.isArray(readAs) ? readAs : (readAs ? [readAs] : actAsList);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    'https://daml.com/ledger-api': {
      applicationId: 'growstreams',
      actAs: actAsList,
      readAs: readAsList,
    },
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

const TOKENS = {
  admin: makeToken(PARTIES.admin),
  alice: makeToken(PARTIES.alice, [PARTIES.alice, PARTIES.bob, PARTIES.admin]),
  bob: makeToken(PARTIES.bob, [PARTIES.bob, PARTIES.alice, PARTIES.admin]),
};

async function cantonRequest(method, path, body, token) {
  const res = await fetch(`${CANTON_JSON_API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok || json.status === 'error' || (json.errors && json.errors.length > 0)) {
    console.error('API error:', JSON.stringify(json, null, 2));
    throw new Error(`Canton API error: ${json.errors?.[0] || res.statusText}`);
  }
  return json;
}

async function createContract(templateId, payload, actAs, token) {
  const body = {
    actAs: Array.isArray(actAs) ? actAs : [actAs],
    readAs: [],
    applicationId: 'growstreams',
    commandId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    commands: [{ createCommand: { templateId, createArguments: payload } }],
  };
  return cantonRequest('POST', '/v2/commands/submit-and-wait', body, token);
}

async function exerciseChoice(templateId, contractId, choice, argument, actAs, token) {
  const body = {
    actAs: Array.isArray(actAs) ? actAs : [actAs],
    readAs: [],
    applicationId: 'growstreams',
    commandId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    commands: [{
      exerciseCommand: { templateId, contractId, choice, choiceArgument: { value: argument } },
    }],
  };
  return cantonRequest('POST', '/v2/commands/submit-and-wait', body, token);
}

async function queryContracts(templateId, party, token) {
  const filter = {
    filtersByParty: {
      [party]: {
        cumulative: [{ templateFilter: { value: { templateId } } }],
      },
    },
  };
  const res = await cantonRequest('POST', '/v2/state/active-contracts', { filter }, token);
  return res.result || [];
}

function damlTime(date) {
  return date.toISOString().replace('Z', '000Z').replace(/(\.\d{3})000Z/, '$1000Z');
}

async function main() {
  console.log('=== GrowStreams Demo Setup ===');
  console.log('Canton JSON API:', CANTON_JSON_API);
  console.log('Package ID:', PACKAGE_ID);
  console.log('');
  console.log('Parties:');
  console.log('  Admin:', PARTIES.admin);
  console.log('  Alice:', PARTIES.alice);
  console.log('  Bob  :', PARTIES.bob);
  console.log('');

  const now = new Date();
  const damlNow = now.toISOString();

  // 1. Create Faucet first (admin only — just admin field)
  console.log('1. Creating Faucet...');
  let faucetId;
  try {
    const res = await createContract(`${PACKAGE_ID}:GrowToken:Faucet`, {
      admin: PARTIES.admin,
    }, PARTIES.admin, TOKENS.admin);
    faucetId = res.result?.contractId;
    console.log('    Faucet:', faucetId);
  } catch (e) {
    console.log('     Faucet creation failed:', e.message);
  }

  // 2. Mint GrowToken for Alice via Faucet
  console.log('2. Minting GrowToken for Alice (10,000 GROW via Faucet)...');
  let aliceTokenId;
  if (faucetId) {
    try {
      const res = await exerciseChoice(
        `${PACKAGE_ID}:GrowToken:Faucet`, faucetId, 'Mint',
        { recipient: PARTIES.alice, amount: '10000.0' }, PARTIES.admin, TOKENS.admin
      );
      aliceTokenId = res.result?.exerciseResult;
      console.log('    Alice GrowToken minted:', aliceTokenId);
    } catch (e) {
      console.log('     Mint Alice failed:', e.message);
    }
  }

  // Mint for Bob
  console.log('3. Minting GrowToken for Bob (5,000 GROW via Faucet)...');
  if (faucetId) {
    try {
      const res = await exerciseChoice(
        `${PACKAGE_ID}:GrowToken:Faucet`, faucetId, 'Mint',
        { recipient: PARTIES.bob, amount: '5000.0' }, PARTIES.admin, TOKENS.admin
      );
      console.log('    Bob GrowToken minted:', res.result?.exerciseResult);
    } catch (e) {
      console.log('     Mint Bob failed:', e.message);
    }
  }

  // 4. Create StreamFactory (admin-owned)
  console.log('4. Creating StreamFactory...');
  let factoryId;
  try {
    const res = await createContract(`${PACKAGE_ID}:StreamCore:StreamFactory`, {
      admin: PARTIES.admin,
      users: [PARTIES.alice, PARTIES.bob],
      nextStreamId: 1,
    }, PARTIES.admin, TOKENS.admin);
    factoryId = res.result?.contractId;
    console.log('    StreamFactory:', factoryId);
  } catch (e) {
    console.log('     StreamFactory creation failed:', e.message);
  }

  // 5. Create StreamAgreement (Alice → Bob, Active) — enum as plain string
  console.log('5. Creating StreamAgreement #1 (Alice → Bob, 0.1 GROW/sec, Active)...');
  let streamId1;
  try {
    const res = await createContract(`${PACKAGE_ID}:StreamCore:StreamAgreement`, {
      streamId: 1,
      sender: PARTIES.alice,
      receiver: PARTIES.bob,
      admin: PARTIES.admin,
      flowRate: '0.1',
      startTime: damlNow,
      lastUpdate: damlNow,
      deposited: '500.0',
      withdrawn: '0.0',
      status: 'Active',
    }, PARTIES.alice, TOKENS.alice);
    streamId1 = res.result?.contractId;
    console.log('    StreamAgreement #1:', streamId1);
  } catch (e) {
    console.log('     StreamAgreement #1 creation failed:', e.message);
  }

  // 6. Create a second StreamAgreement (Paused)
  const oneHourAgo = new Date(now.getTime() - 3600000).toISOString();
  console.log('6. Creating StreamAgreement #2 (Alice → Bob, Paused)...');
  let streamId2;
  try {
    const res = await createContract(`${PACKAGE_ID}:StreamCore:StreamAgreement`, {
      streamId: 2,
      sender: PARTIES.alice,
      receiver: PARTIES.bob,
      admin: PARTIES.admin,
      flowRate: '0.05',
      startTime: oneHourAgo,
      lastUpdate: oneHourAgo,
      deposited: '200.0',
      withdrawn: '45.0',
      status: 'Paused',
    }, PARTIES.alice, TOKENS.alice);
    streamId2 = res.result?.contractId;
    console.log('    StreamAgreement #2:', streamId2);
  } catch (e) {
    console.log('     StreamAgreement #2 creation failed:', e.message);
  }

  console.log('');
  console.log('=== Setup Complete ===');
  console.log('');
  console.log('Env vars for .env.local:');
  console.log(`NEXT_PUBLIC_CANTON_JSON_API_URL=http://localhost:7575`);
  console.log(`NEXT_PUBLIC_ADMIN_PARTY=${PARTIES.admin}`);
  console.log(`NEXT_PUBLIC_ALICE_PARTY=${PARTIES.alice}`);
  console.log(`NEXT_PUBLIC_BOB_PARTY=${PARTIES.bob}`);
  console.log(`NEXT_PUBLIC_PACKAGE_ID=${PACKAGE_ID}`);
  console.log('');
  console.log('Contract IDs:');
  console.log('  StreamAgreement #1:', streamId1 || 'creation failed');
  console.log('  StreamAgreement #2:', streamId2 || 'creation failed');
  console.log('  StreamFactory:', factoryId || 'creation failed');
}

main().catch(console.error);
