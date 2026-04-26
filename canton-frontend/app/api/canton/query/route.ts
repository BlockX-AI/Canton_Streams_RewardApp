import { NextRequest, NextResponse } from 'next/server';

const CANTON_URL = process.env.CANTON_JSON_API_URL || 'http://localhost:7575';
const NAMESPACE  = process.env.CANTON_NAMESPACE  ?? '';
const PACKAGE_ID = process.env.CANTON_PACKAGE_ID ?? '';

function partyForName(name: string): string {
  const map: Record<string, string> = {
    Admin: process.env.CANTON_ADMIN_PARTY ?? `Admin::${NAMESPACE}`,
    Alice: process.env.CANTON_ALICE_PARTY ?? `Alice::${NAMESPACE}`,
    Bob:   process.env.CANTON_BOB_PARTY   ?? `Bob::${NAMESPACE}`,
    Carol: process.env.CANTON_CAROL_PARTY ?? `Carol::${NAMESPACE}`,
  };
  return map[name] ?? '';
}

function parseNdjson(raw: string): unknown[] {
  const results: unknown[] = [];
  for (const line of raw.trim().split('\n')) {
    const l = line.trim();
    if (!l) continue;
    try {
      const parsed = JSON.parse(l);
      if (Array.isArray(parsed)) results.push(...parsed);
      else results.push(parsed);
    } catch { /* skip malformed lines */ }
  }
  return results;
}

export async function POST(req: NextRequest) {
  try {
    const { party, templateId } = await req.json();
    const partyId = partyForName(party);
    if (!partyId) return NextResponse.json({ error: 'Unknown party' }, { status: 400 });

    const ledgerEndRes = await fetch(`${CANTON_URL}/v2/state/ledger-end`);
    const { offset } = await ledgerEndRes.json() as { offset: number };

    const filterValue = templateId
      ? {
          cumulative: [{
            templateFilter: {
              value: { templateId: `${PACKAGE_ID}:${templateId}` },
            },
          }],
        }
      : {};

    const body = {
      filter: { filtersByParty: { [partyId]: filterValue } },
      verbose: true,
      activeAtOffset: offset,
      userId: 'participant_admin',
    };

    const res = await fetch(`${CANTON_URL}/v2/state/active-contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const raw = await res.text();
    const items = parseNdjson(raw);

    const contracts = items.flatMap((item) => {
      const c = item as Record<string, unknown>;
      const entry = c.contractEntry as Record<string, unknown> | undefined;
      if (!entry) return [];
      const inner = Object.values(entry)[0] as Record<string, unknown> | undefined;
      if (!inner) return [];
      const ce = inner.createdEvent as Record<string, unknown> | undefined;
      if (!ce?.contractId) return [];
      const fullTpl = (ce.templateId as string) ?? '';
      const shortName = fullTpl.split(':').pop() ?? fullTpl;
      return [{
        contractId: ce.contractId as string,
        templateId: fullTpl,
        shortName,
        payload: ce.createArgument as Record<string, unknown>,
      }];
    });

    return NextResponse.json({ result: contracts });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
