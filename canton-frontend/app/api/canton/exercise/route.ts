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

function allPartyIds(): string[] {
  return [
    process.env.CANTON_ADMIN_PARTY ?? `Admin::${NAMESPACE}`,
    process.env.CANTON_ALICE_PARTY ?? `Alice::${NAMESPACE}`,
    process.env.CANTON_BOB_PARTY   ?? `Bob::${NAMESPACE}`,
    process.env.CANTON_CAROL_PARTY ?? `Carol::${NAMESPACE}`,
  ].filter(Boolean);
}

export async function POST(req: NextRequest) {
  try {
    const { party, templateId, contractId, choice, argument } = await req.json();
    const partyId = partyForName(party);
    if (!partyId) return NextResponse.json({ error: 'Unknown party' }, { status: 400 });

    const commandId = `grow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const body = {
      commands: [{
        ExerciseCommand: {
          templateId: `${PACKAGE_ID}:${templateId}`,
          contractId,
          choice,
          choiceArgument: argument ?? {},
        },
      }],
      commandId,
      userId: 'participant_admin',
      actAs: [partyId],
      readAs: allPartyIds(),
    };

    const res = await fetch(`${CANTON_URL}/v2/commands/submit-and-wait`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json({ ok: res.ok, status: res.status, data }, { status: res.ok ? 200 : res.status });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
