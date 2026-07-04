import { NextResponse } from "next/server"

const CANTON_URL = process.env.CANTON_LEDGER_API_URL ?? "http://localhost:7575"

async function makeBearer(party: string): Promise<string | null> {
  const secret = process.env.CANTON_AUTH_SECRET
  if (!secret) return null
  const encode = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url")
  const head = encode({ alg: "HS256", typ: "JWT" })
  const body = encode({
    sub: party,
    actAs: [party],
    readAs: [party],
    exp: Math.floor(Date.now() / 1000) + 3600,
  })
  const sigInput = `${head}.${body}`
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(sigInput))
  return `Bearer ${sigInput}.${Buffer.from(sig).toString("base64url")}`
}

export async function POST(req: Request) {
  try {
    const { party, templateId } = (await req.json()) as {
      party: string
      templateId?: string
    }

    if (!party) return NextResponse.json({ error: "party required" }, { status: 400 })

    const auth = await makeBearer(party)
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (auth) headers["Authorization"] = auth

    const filter = {
      filtersByParty: {
        [party]: templateId
          ? { cumulative: [{ templateFilter: { value: { templateId } } }] }
          : { cumulative: [] },
      },
    }

    const res = await fetch(`${CANTON_URL}/v2/state/active-contracts`, {
      method: "POST",
      headers,
      body: JSON.stringify({ filter }),
      cache: "no-store",
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: res.status })
    }

    const raw = await res.text()

    // Handle v1-compat single JSON (sandbox may return { status, result: [...] })
    try {
      const single = JSON.parse(raw) as { result?: unknown[] }
      if (Array.isArray(single.result)) {
        return NextResponse.json({ contracts: single.result })
      }
    } catch {
      // not single JSON — fall through to NDJSON
    }

    // Handle NDJSON (Canton v2 streams one object per line)
    // Lines look like: { "activeContract": { "contractId": "...", "templateId": "...", "payload": {...} } }
    const contracts: { contractId: string; templateId: string; payload: unknown }[] = []
    for (const line of raw.split("\n").filter(Boolean)) {
      try {
        const obj = JSON.parse(line) as {
          activeContract?: { contractId: string; templateId: string; payload: unknown }
        }
        if (obj.activeContract) contracts.push(obj.activeContract)
      } catch {
        // skip malformed lines
      }
    }

    return NextResponse.json({ contracts })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
