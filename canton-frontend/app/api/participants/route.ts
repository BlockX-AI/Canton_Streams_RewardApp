import { NextResponse } from "next/server"

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = searchParams.get("limit") || "20"
  try {
    const res = await fetch(`${BACKEND}/participants?limit=${limit}`, {
      cache: "no-store",
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 })
  }
}
