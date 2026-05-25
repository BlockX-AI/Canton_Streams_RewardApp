"use client"

import { useEffect, useState, useCallback } from "react"
import { fetchCantonProofStats } from "@/lib/canton-backend-api"
import { ExternalLink, Copy, RefreshCw, CheckCircle, Users, Zap, Trophy, Activity } from "lucide-react"

interface PartyEntry {
  short_id: string
  full_id: string
  x_handle: string
  display_name: string
  total_xp: number
  cantonscan_url: string
  ccexplorer_url: string
  created_at: string | null
  time_ago: string
}

interface ProofStats {
  validator: string
  network: string
  package_id: string
  namespace: string
  stats: {
    total_parties: number
    active_7d: number
    campaign_completions: number
    total_xp_minted: number
  }
  recent_parties: PartyEntry[]
  cantonscan_base: string
  ccexplorer_base: string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white border border-white/10 hover:border-white/30 px-2 py-1 rounded transition-all"
    >
      {copied ? <CheckCircle size={11} className="text-emerald-400" /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: any
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-2">
      <div className={`inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest ${color}`}>
        <Icon size={13} />
        {label}
      </div>
      <div className="text-3xl font-bold text-white tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {sub && <div className="text-xs text-white/40">{sub}</div>}
    </div>
  )
}

export default function CantonProofPage() {
  const [data, setData] = useState<ProofStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchCantonProofStats()
      setData(res)
      setLastRefresh(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Canton DevNet Proof Dashboard</h1>
            <p className="text-sm text-white/40 mt-1">
              Real-time proof of GrowStreams usage on Canton Network — for committees &amp; grant reviewers
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-white/30">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 text-xs border border-white/20 hover:border-white/40 px-3 py-2 rounded-lg transition-all disabled:opacity-40"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Network Info Banner */}
        {data && (
          <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-xl px-5 py-4 flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-white/40 mr-2">Network:</span>
              <span className="text-emerald-400 font-medium">{data.network}</span>
            </div>
            <div>
              <span className="text-white/40 mr-2">Validator:</span>
              <span className="text-emerald-400 font-medium">{data.validator}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/40">Package ID:</span>
              <span className="font-mono text-xs text-white/70">
                {data.package_id ? `${data.package_id.slice(0, 12)}...` : "—"}
              </span>
              {data.package_id && <CopyButton text={data.package_id} />}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/40">Namespace:</span>
              <span className="font-mono text-xs text-white/70">
                {data.namespace ? `${data.namespace.slice(0, 12)}...` : "—"}
              </span>
              {data.namespace && <CopyButton text={data.namespace} />}
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
              <span className="text-emerald-400 text-xs">Live</span>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        {loading && !data ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 h-28 animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              label="Canton Parties"
              value={data.stats.total_parties}
              sub="Allocated on GINIE-VALIDATOR"
              color="text-cyan-400"
            />
            <StatCard
              icon={Activity}
              label="Active (7d)"
              value={data.stats.active_7d}
              sub="Unique wallets last 7 days"
              color="text-emerald-400"
            />
            <StatCard
              icon={Trophy}
              label="Campaign Completions"
              value={data.stats.campaign_completions}
              sub="Completed quests"
              color="text-yellow-400"
            />
            <StatCard
              icon={Zap}
              label="XP Minted"
              value={data.stats.total_xp_minted}
              sub="Total XP across all users"
              color="text-purple-400"
            />
          </div>
        ) : (
          <div className="text-center text-white/40 py-12 border border-white/10 rounded-xl">
            Failed to load stats. Backend may be unreachable.
          </div>
        )}

        {/* Recent Party Allocations */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/60">
              Recent Party Allocations
            </h2>
            <div className="flex gap-3 text-xs text-white/30">
              <a
                href="https://devnet.ccexplorer.io/parties"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
              >
                <ExternalLink size={11} /> CCExplorer
              </a>
              <a
                href="https://scan.sv-2.dev.global.canton.network.digitalasset.com/parties"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
              >
                <ExternalLink size={11} /> Cantonscan
              </a>
            </div>
          </div>

          <div className="border border-white/10 rounded-xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-white/5 border-b border-white/10 text-xs text-white/40 uppercase tracking-widest font-medium">
              <span>Party ID</span>
              <span>User</span>
              <span>XP</span>
              <span>Registered</span>
              <span>Verify</span>
            </div>

            {/* Rows */}
            {loading && !data ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-4 px-5 py-4 border-b border-white/5 animate-pulse">
                  {[...Array(5)].map((_, j) => (
                    <div key={j} className="h-4 bg-white/10 rounded" />
                  ))}
                </div>
              ))
            ) : data?.recent_parties.length === 0 ? (
              <div className="px-5 py-10 text-center text-white/30 text-sm">
                No parties registered yet. Be the first to register on the Canton page!
              </div>
            ) : (
              data?.recent_parties.map((p, i) => (
                <div
                  key={p.full_id}
                  className="grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-4 px-5 py-4 border-b border-white/5 hover:bg-white/3 transition-colors items-center"
                >
                  {/* Party ID */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-cyan-400 truncate">{p.short_id}</span>
                    <CopyButton text={p.full_id} />
                  </div>

                  {/* User */}
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">{p.display_name}</div>
                    <div className="text-xs text-white/40 truncate">
                      {p.x_handle !== "—" ? `@${p.x_handle.replace(/^@/, "")}` : "—"}
                    </div>
                  </div>

                  {/* XP */}
                  <div className="text-sm font-medium text-purple-300">
                    {p.total_xp.toLocaleString()}
                  </div>

                  {/* Time */}
                  <div className="text-xs text-white/40">{p.time_ago}</div>

                  {/* Verify Links */}
                  <div className="flex items-center gap-2">
                    <a
                      href={p.ccexplorer_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 whitespace-nowrap"
                      title="Verify on CCExplorer"
                    >
                      <ExternalLink size={11} /> CC
                    </a>
                    <a
                      href={p.cantonscan_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-white/40 hover:text-white flex items-center gap-1 whitespace-nowrap"
                      title="Verify on Cantonscan"
                    >
                      <ExternalLink size={11} /> Scan
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Committee Share Block */}
        <div className="bg-white/3 border border-white/10 rounded-xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/60 mb-4">
            Share with Canton Committee
          </h2>
          <div className="font-mono text-xs text-white/70 whitespace-pre-wrap bg-black/40 rounded-lg p-4 leading-relaxed">
{`GrowStreams — Canton DevNet Proof of Users
Live verification: https://canton-frontend.vercel.app/app/admin/canton-proof

As of ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}:
- ${data?.stats.total_parties ?? 0} Canton parties allocated on GINIE-VALIDATOR DevNet
- Package ID: ${data?.package_id ?? "054d83ae..."}
- ${data?.stats.campaign_completions ?? 0} campaign quest completions
- ${data?.stats.total_xp_minted ?? 0} total XP minted across all users

Sample verifiable parties:
${(data?.recent_parties ?? []).slice(0, 4).map((p, i) =>
  `${i + 1}. @${p.x_handle.replace(/^@/, "")} → ${p.short_id} → ${p.ccexplorer_url}`
).join("\n")}

Any committee member can verify each party exists on Canton DevNet.`}
          </div>
          <div className="mt-3 flex justify-end">
            <CopyButton text={`GrowStreams — Canton DevNet Proof of Users\nLive: https://canton-frontend.vercel.app/app/admin/canton-proof\nTotal parties: ${data?.stats.total_parties ?? 0}\nValidator: GINIE-VALIDATOR DevNet`} />
          </div>
        </div>

      </div>
    </div>
  )
}
