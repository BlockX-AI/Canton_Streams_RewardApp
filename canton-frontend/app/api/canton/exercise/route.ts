import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const CANTON_URL = process.env.CANTON_JSON_API_URL || 'http://localhost:7575';
const NAMESPACE  = process.env.CANTON_NAMESPACE  ?? '';
const PACKAGE_ID = process.env.CANTON_PACKAGE_ID ?? '';

// Server-side HS256 JWT — secret MUST be configured via CANTON_AUTH_SECRET.
// In production replace with an RS256 token from a proper OIDC provider.
function generateToken(actAs: string[], readAs: string[]): string {
  const secret = process.env.CANTON_AUTH_SECRET ?? 'change-me-in-production';
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    'https://daml.com/ledger-api': {
      applicationId: 'growstreams',
      actAs,
      readAs,
    },
  })).toString('base64url');
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${sig}`;
}

// Map display-name to server-configured party ID (from env vars).
// Clients supply only a name; the actual party ID is never client-controlled.
function partyForName(name: string): string {
  const map: Record<string, string> = {
    Admin: process.env.CANTON_ADMIN_PARTY ?? `Admin::${NAMESPACE}`,
    Alice: process.env.CANTON_ALICE_PARTY ?? `Alice::${NAMESPACE}`,
    Bob:   process.env.CANTON_BOB_PARTY   ?? `Bob::${NAMESPACE}`,
  };
  return map[name] ?? '';
}

export async function POST(req: NextRequest) {
  const { party, templateId, contractId, choice, argument } = await req.json();
  const partyId = partyForName(party);
  const fullTemplateId = `${PACKAGE_ID}:${templateId}`;
  if (!partyId) return NextResponse.json({ error: 'Unknown party' }, { status: 400 });
  const readAs = [
    process.env.CANTON_ALICE_PARTY ?? `Alice::${NAMESPACE}`,
    process.env.CANTON_BOB_PARTY   ?? `Bob::${NAMESPACE}`,
    process.env.CANTON_ADMIN_PARTY ?? `Admin::${NAMESPACE}`,
  ];
  const token = generateToken([partyId], readAs);

  const commandBody = {
    actAs: [partyId],
    readAs: [partyId],
    applicationId: 'growstreams',
    commandId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    commands: [
      {
        exerciseCommand: {
          templateId: fullTemplateId,
          contractId,
          choice,
          choiceArgument: { value: argument },
        },
      },
    ],
  };

  const res = await fetch(`${CANTON_URL}/v2/commands/submit-and-wait`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(commandBody),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
