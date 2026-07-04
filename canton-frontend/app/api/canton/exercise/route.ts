import { NextResponse } from "next/server"

const CANTON_URL = process.env.CANTON_LEDGER_API_URL ?? "http://localhost:7575"
const PKG = process.env.CANTON_PACKAGE_ID ?? ""

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
    const { party, contractId, templateId, choice, argument } = (await req.json()) as {
      party: string
      contractId: string
      templateId?: string
      choice: string
      argument?: Record<string, unknown>
    }

    if (!party || !contractId || !choice) {
      return NextResponse.json(
        { error: "party, contractId, and choice are required" },
        { status: 400 },
      )
    }

    const auth = await makeBearer(party)
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (auth) headers["Authorization"] = auth

    const cmd = {
      actAs: [party],
      readAs: [party],
      applicationId: "growstreams-wallet",
      commandId: `wallet-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      commands: [
        {
          exerciseCommand: {
            templateId: templateId ?? `${PKG}:GrowToken:GrowToken`,
            contractId,
            choice,
            choiceArgument: { value: argument ?? {} },
          },
        },
      ],
    }

    const res = await fetch(`${CANTON_URL}/v2/commands/submit-and-wait`, {
      method: "POST",
      headers,
      body: JSON.stringify(cmd),
      cache: "no-store",
    })

    const data = (await res.json()) as unknown
    if (!res.ok) return NextResponse.json({ error: data }, { status: res.status })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
