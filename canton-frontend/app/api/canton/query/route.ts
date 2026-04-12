import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const CANTON_URL = process.env.CANTON_JSON_API_URL || 'http://localhost:7575';
const NAMESPACE = '12203e76b582b4c420f1e6ee4d1992042e9e5e1bacff0166fc4e87764459aea1d771';
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || 'a60b6d5c583f91e98770e754fe71d1fbc737b36bb9b2ff5d4911dd86ad79358b';

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
  const { party, templateId } = await req.json();
  const partyId = partyForName(party);
  const fullTemplateId = `${PACKAGE_ID}:${templateId}`;
  if (!partyId) return NextResponse.json({ error: 'Unknown party' }, { status: 400 });
  const readAs = [
    process.env.CANTON_ALICE_PARTY ?? `Alice::${NAMESPACE}`,
    process.env.CANTON_BOB_PARTY   ?? `Bob::${NAMESPACE}`,
    process.env.CANTON_ADMIN_PARTY ?? `Admin::${NAMESPACE}`,
  ];
  const token = generateToken([partyId], readAs);

  const filter = {
    filtersByParty: {
      [partyId]: {
        cumulative: [
          {
            templateFilter: {
              value: { templateId: fullTemplateId },
            },
          },
        ],
      },
    },
  };

  const res = await fetch(`${CANTON_URL}/v2/state/active-contracts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ filter }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
