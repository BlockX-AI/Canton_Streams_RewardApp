'use strict';

const { listContracts, create, getLedgerEnd } = require('./client/cantonClient');
const { parties } = require('./config/localnet');
const T = require('./contracts/templateIds');

async function main() {
  const off1 = await getLedgerEnd();
  console.log('Ledger end BEFORE create:', off1);

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const r = await create('Alice', T.StreamAgreement, {
    streamId   : 99,
    sender     : parties.Alice,
    receiver   : parties.Bob,
    admin      : parties.Admin,
    flowRate   : '1.0',
    startTime  : now,
    lastUpdate : now,
    deposited  : '100.0',
    withdrawn  : '0.0',
    status     : 'Active',
  });
  console.log('Create HTTP status:', r.status, '  ok:', r.ok);
  console.log('Create response:', JSON.stringify(r.data).slice(0, 400));

  const off2 = await getLedgerEnd();
  console.log('Ledger end AFTER create:', off2);

  const cs = await listContracts('Alice');
  console.log('\nAll contracts visible to Alice:');
  for (const c of cs) {
    console.log(' ', c.shortName, '| streamId:', c.payload.streamId, '| status:', c.payload.status, '| cid:', c.contractId.slice(0, 20));
  }

  const found = cs.find(c => c.shortName === 'StreamAgreement' && String(c.payload.streamId) === '99');
  console.log('\nFound streamId=99:', !!found);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
