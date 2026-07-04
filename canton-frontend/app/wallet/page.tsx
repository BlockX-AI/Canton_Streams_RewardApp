"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Wallet,
  Copy,
  LogOut,
  RefreshCw,
  Send,
  Download,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  ArrowDownLeft,
  Layers,
  ExternalLink,
  Info,
} from "lucide-react"
import { NavigationV2 } from "@/components/v2/navigation-v2"
import { FooterV2 } from "@/components/v2/footer-v2"
import { GradientText } from "@/components/v2/gradient-text"

// ─── Types ───────────────────────────────────────────────────────────────────

interface GrowTokenUtxo {
  contractId: string
  amount: string
  owner: string
}

type Tab = "assets" | "send" | "receive" | "party"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncate(s: string, head = 14, tail = 8) {
  if (!s) return ""
  if (s.length <= head + tail + 3) return s
  return `${s.slice(0, head)}…${s.slice(-tail)}`
}

function useCopy() {
  const [copied, setCopied] = useState(false)
  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return { copied, copy }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/[0.04] border border-white/10 rounded-2xl backdrop-blur-sm ${className}`}>
      {children}
    </div>
  )
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${ok ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`} />
      {label}
    </span>
  )
}

function StatCard({ label, value, sub, color = "text-white" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card className="p-5 text-center">
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-xs font-medium text-white/60 mt-1">{label}</p>
      {sub && <p className="text-[11px] text-white/30 mt-0.5">{sub}</p>}
    </Card>
  )
}

// ─── Balance / Assets Tab ────────────────────────────────────────────────────

function AssetsTab({
  isConnected,
  partyId,
  utxos,
  loading,
  onRefresh,
}: {
  isConnected: boolean
  partyId: string
  utxos: GrowTokenUtxo[]
  loading: boolean
  onRefresh: () => void
}) {
  const total = utxos.reduce((s, u) => s + parseFloat(u.amount || "0"), 0)

  if (!isConnected) {
    return (
      <Card className="p-10 flex flex-col items-center gap-3 text-center">
        <Wallet className="w-10 h-10 text-white/20" />
        <p className="text-white/50 text-sm">Connect your party to view assets</p>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-white/80">CC Token UTXOs</span>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/50 hover:text-white/80 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="p-5">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-white/30">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading tokens…</span>
          </div>
        )}

        {!loading && utxos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-1">
              <Layers className="w-5 h-5 text-white/20" />
            </div>
            <p className="text-sm text-white/40">No CC tokens found</p>
            <p className="text-xs text-white/25">Connect your Canton party or ask admin to mint tokens</p>
          </div>
        )}

        {!loading && utxos.length > 0 && (
          <div className="space-y-2">
            {utxos.map((u, i) => (
              <motion.div
                key={u.contractId}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-emerald-400">CC</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white/70">Canton Coin</p>
                    <p className="text-[10px] text-white/25 font-mono mt-0.5">{truncate(u.contractId, 10, 6)}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-emerald-300 tabular-nums">
                  {parseFloat(u.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} CC
                </p>
              </motion.div>
            ))}

            <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between px-1">
              <span className="text-xs text-white/30">Total</span>
              <span className="text-sm font-bold text-emerald-300 tabular-nums">
                {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} CC
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

// ─── Send Tab ─────────────────────────────────────────────────────────────────

function SendTab({
  isConnected,
  partyId,
  utxos,
}: {
  isConnected: boolean
  partyId: string
  utxos: GrowTokenUtxo[]
}) {
  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle")
  const [errMsg, setErrMsg] = useState("")

  const totalBalance = utxos.reduce((s, u) => s + parseFloat(u.amount || "0"), 0)

  const handleSend = async () => {
    if (!recipient.trim() || !amount) return
    setStatus("sending")
    setErrMsg("")
    try {
      const pkg = process.env.NEXT_PUBLIC_CANTON_PACKAGE_ID || ""
      const utxo = utxos[0]
      if (!utxo) throw new Error("No CC tokens to send")

      const res = await fetch("/api/canton/exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: `${pkg}:GrowToken:GrowToken`,
          contractId: utxo.contractId,
          choice: "Transfer",
          argument: { newOwner: recipient.trim(), amount },
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setStatus("ok")
      setRecipient("")
      setAmount("")
      setTimeout(() => setStatus("idle"), 3000)
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "Transaction failed")
      setStatus("err")
      setTimeout(() => setStatus("idle"), 4000)
    }
  }

  if (!isConnected) {
    return (
      <Card className="p-10 flex flex-col items-center gap-3 text-center">
        <Send className="w-10 h-10 text-white/20" />
        <p className="text-white/50 text-sm">Connect your party to send tokens</p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-5">
        <Send className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-semibold text-white/80">Send CC Tokens</span>
        <div className="ml-auto text-xs text-white/30">
          Available: <span className="text-white/60 font-semibold tabular-nums">{totalBalance.toFixed(4)} CC</span>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-white/40 mb-1.5">Recipient Party ID</label>
          <input
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            placeholder="PAR::YOUR-VALIDATOR::1220…"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white/40 mb-1.5">Amount (CC)</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors pr-20"
            />
            <button
              onClick={() => setAmount(totalBalance.toFixed(4))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-lg hover:bg-emerald-500/10 transition-colors"
            >
              MAX
            </button>
          </div>
        </div>

        <AnimatePresence>
          {status === "err" && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{errMsg}</p>
            </motion.div>
          )}
          {status === "ok" && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-400">Transfer submitted successfully!</p>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleSend}
          disabled={!recipient.trim() || !amount || status === "sending"}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/5 disabled:text-white/20 text-black font-semibold text-sm transition-all disabled:cursor-not-allowed"
        >
          {status === "sending" ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
          ) : (
            <><Send className="w-4 h-4" />Send Tokens</>
          )}
        </button>
      </div>
    </Card>
  )
}

// ─── Receive Tab ──────────────────────────────────────────────────────────────

function ReceiveTab({ partyId }: { partyId: string }) {
  const { copied, copy } = useCopy()

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-5">
        <ArrowDownLeft className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-semibold text-white/80">Receive CC Tokens</span>
      </div>

      {!partyId ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <ArrowDownLeft className="w-10 h-10 text-white/20" />
          <p className="text-white/50 text-sm">Connect your party to get your address</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-4 p-6 bg-white/[0.03] rounded-xl border border-white/[0.06]">
            <div className="w-28 h-28 rounded-2xl bg-white flex items-center justify-center">
              <div className="w-20 h-20 grid grid-cols-5 grid-rows-5 gap-0.5">
                {Array.from({ length: 25 }).map((_, i) => {
                  const pattern = [1,1,1,1,1, 1,0,0,0,1, 1,0,1,0,1, 1,0,0,0,1, 1,1,1,1,1]
                  return (
                    <div key={i} className={`rounded-[1px] ${pattern[i] ? "bg-black" : "bg-white"}`} />
                  )
                })}
              </div>
            </div>
            <p className="text-xs text-white/30 text-center">Share your Party ID to receive tokens</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/40 mb-1.5">Your Party ID</label>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="flex-1 text-xs font-mono text-white/60 break-all leading-relaxed">{partyId}</p>
              <button
                onClick={() => copy(partyId)}
                className="shrink-0 p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Copy"
              >
                {copied
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  : <Copy className="w-4 h-4 text-white/40" />}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-500/8 border border-blue-500/15">
            <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-400/80 leading-relaxed">
              Share this party ID with others to receive CC token transfers on Canton Network.
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── Party Tab ────────────────────────────────────────────────────────────────

function PartyTab({ onPartyGenerated }: { onPartyGenerated: (id: string) => void }) {
  const [displayName, setDisplayName] = useState("")
  const [handle, setHandle] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ partyId: string } | null>(null)
  const [error, setError] = useState("")
  const [manualId, setManualId] = useState("")
  const { copied, copy } = useCopy()

  const generate = async () => {
    if (!displayName.trim() || !handle.trim()) return
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const res = await fetch("/api/participants/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName.trim(),
          x_handle: handle.trim().replace(/^@/, ""),
          track: "BOTH",
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Registration failed" }))
        throw new Error(err.detail || "Registration failed")
      }
      const data = await res.json()
      const pid = data.wallet || data.party_id || data.partyId || ""
      setResult({ partyId: pid })
      onPartyGenerated(pid)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to allocate party")
    } finally {
      setLoading(false)
    }
  }

  const connectManual = () => {
    if (manualId.trim()) onPartyGenerated(manualId.trim())
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <span className="text-sm font-semibold text-white/80">Auto-Generate Canton Party</span>
        </div>
        <p className="text-xs text-white/30 mb-5 ml-8">
          Allocates a Canton party via the GINIE-VALIDATOR. The backend must be running.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-white/40 mb-1.5">Display Name</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Alice Dev"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/40 mb-1.5">X / Twitter Handle</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
              <input
                value={handle}
                onChange={e => setHandle(e.target.value)}
                placeholder="alice_canton"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors"
              />
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-400">{error}</p>
              </motion.div>
            )}
            {result && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-xs font-semibold text-emerald-400">Party allocated!</p>
                </div>
                <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2.5">
                  <p className="flex-1 text-[10px] font-mono text-white/60 break-all">{result.partyId}</p>
                  <button onClick={() => copy(result.partyId)} className="p-1 rounded hover:bg-white/10">
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white/40" />}
                  </button>
                </div>
                <a
                  href={`https://devnet.ccexplorer.io/parties/${encodeURIComponent(result.partyId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  View on CC Explorer
                  <span className="text-white/25 ml-1">· may take 10–20 min to appear</span>
                </a>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={generate}
            disabled={!displayName.trim() || !handle.trim() || loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-white/5 disabled:text-white/20 text-white font-semibold text-sm transition-all disabled:cursor-not-allowed"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Allocating…</> : <><User className="w-4 h-4" />Generate Party</>}
          </button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
            <ExternalLink className="w-3.5 h-3.5 text-white/50" />
          </div>
          <span className="text-sm font-semibold text-white/80">Paste Manually</span>
        </div>
        <p className="text-xs text-white/30 mb-4 ml-8">Get a party ID from CC Explorer and paste it below.</p>
        <div className="flex gap-2">
          <input
            value={manualId}
            onChange={e => setManualId(e.target.value)}
            placeholder="PAR::YOUR-VALIDATOR::1220…"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors font-mono"
          />
          <button
            onClick={connectManual}
            disabled={!manualId.trim()}
            className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-30 text-white text-sm font-semibold transition-colors whitespace-nowrap"
          >
            Connect
          </button>
        </div>
      </Card>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "assets", label: "Assets", icon: Layers },
  { id: "send", label: "Send", icon: Send },
  { id: "receive", label: "Receive", icon: ArrowDownLeft },
  { id: "party", label: "Party", icon: User },
]

export default function WalletPage() {
  const [partyId, setPartyId] = useState<string>("")
  const [isConnected, setIsConnected] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("assets")
  const [utxos, setUtxos] = useState<GrowTokenUtxo[]>([])
  const [loadingBalance, setLoadingBalance] = useState(false)
  const { copied, copy } = useCopy()

  // Restore party from storage
  useEffect(() => {
    const saved = localStorage.getItem("canton_party_id")
    if (saved) { setPartyId(saved); setIsConnected(true) }
  }, [])

  const disconnect = () => {
    setPartyId("")
    setIsConnected(false)
    setUtxos([])
    localStorage.removeItem("canton_party_id")
  }

  const handlePartyGenerated = (id: string) => {
    setPartyId(id)
    setIsConnected(true)
    localStorage.setItem("canton_party_id", id)
    setActiveTab("assets")
  }

  const fetchBalance = useCallback(async () => {
    if (!partyId) return
    setLoadingBalance(true)
    try {
      const pkg = process.env.NEXT_PUBLIC_CANTON_PACKAGE_ID || ""
      const res = await fetch("/api/canton/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateIds: [`${pkg}:GrowToken:GrowToken`],
          query: { owner: partyId },
        }),
      })
      if (!res.ok) throw new Error("Query failed")
      const data = await res.json()
      const contracts = Array.isArray(data) ? data : data.result ?? []
      setUtxos(
        contracts.map((c: { contractId: string; payload: { amount: string; owner: string } }) => ({
          contractId: c.contractId,
          amount: c.payload?.amount ?? "0",
          owner: c.payload?.owner ?? "",
        }))
      )
    } catch {
      setUtxos([])
    } finally {
      setLoadingBalance(false)
    }
  }, [partyId])

  useEffect(() => {
    if (isConnected && partyId) fetchBalance()
  }, [isConnected, partyId, fetchBalance])

  const totalBalance = utxos.reduce((s, u) => s + parseFloat(u.amount || "0"), 0)

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <NavigationV2 currentPage="wallet" />

      <main className="max-w-2xl mx-auto px-4 pt-28 pb-24">

        {/* ── Page Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold">
              <GradientText from="from-emerald-400" to="to-cyan-400">Smile</GradientText>
            </h1>
          </div>
          <p className="text-white/35 text-sm pl-[52px]">
            Canton Network wallet — manage CC tokens and your party identity
          </p>
        </motion.div>

        {/* ── Onboarding (not connected) ── */}
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.23, 1, 0.32, 1] }}
            className="mb-6"
          >
            <Card className="p-8 text-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-5">
                <Wallet className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Get started with Smile</h2>
              <p className="text-sm text-white/40 mb-8 max-w-xs mx-auto">
                Create a new Canton wallet or connect an existing party identity to manage CC tokens.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setActiveTab("party") }}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/15 hover:border-emerald-500/50 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                    <User className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-left w-full">
                    <p className="text-sm font-semibold text-white">Create New Wallet</p>
                    <p className="text-xs text-white/40 mt-0.5">Auto-generate a Canton party</p>
                  </div>
                </button>
                <button
                  onClick={() => { setActiveTab("party") }}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] hover:border-white/20 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/15 transition-colors">
                    <Download className="w-5 h-5 text-white/60" />
                  </div>
                  <div className="text-left w-full">
                    <p className="text-sm font-semibold text-white">Connect Wallet</p>
                    <p className="text-xs text-white/40 mt-0.5">Paste your party ID</p>
                  </div>
                </button>
              </div>
            </Card>
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <Info className="w-3.5 h-3.5 text-white/30 shrink-0 mt-0.5" />
              <p className="text-[11px] text-white/30 leading-relaxed">
                Smile runs on <span className="text-white/50">Canton DevNet</span>. Your party ID is your on-chain identity — it never leaves your device until you share it.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Connected Party Bar ── */}
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: [0.23, 1, 0.32, 1] }}
            className="mb-5"
          >
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-white/35 mb-0.5">Connected Party · Canton DevNet</p>
                  <p className="text-sm font-mono text-white/75 truncate">{partyId}</p>
                </div>
                <button onClick={() => copy(partyId)} title="Copy party ID" className="p-2 rounded-lg hover:bg-white/10 text-white/35 hover:text-white/70 transition-colors shrink-0">
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button onClick={disconnect} title="Disconnect" className="p-2 rounded-lg hover:bg-white/10 text-white/35 hover:text-red-400 transition-colors shrink-0">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── CC Explorer Verify Button ── */}
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
            className="mb-5"
          >
            <a
              href={`https://devnet.ccexplorer.io/parties/${encodeURIComponent(partyId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-cyan-500/15 border border-cyan-500/50 hover:bg-cyan-500/25 hover:border-cyan-400 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/25 flex items-center justify-center shrink-0">
                  <ExternalLink className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-cyan-300">Verify on CC Explorer</p>
                  <p className="text-[11px] text-cyan-500/70">Check if your party is live on Canton DevNet</p>
                </div>
              </div>
              <span className="text-xs text-cyan-400/60 font-mono shrink-0">devnet.ccexplorer.io →</span>
            </a>
          </motion.div>
        )}

        {/* ── Balance Hero (connected only) ── */}
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.14, ease: [0.23, 1, 0.32, 1] }}
            className="mb-5"
          >
            <Card className="p-6 text-center">
              <p className="text-xs font-medium text-white/30 mb-2 uppercase tracking-widest">Total Balance</p>
              <p className="text-5xl font-bold tabular-nums text-white leading-none mb-1">
                {loadingBalance
                  ? <span className="text-white/20">—</span>
                  : totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
                }
              </p>
              <p className="text-sm text-white/30 mt-2">Canton Coin (CC)</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <StatusBadge ok={true} label="Canton DevNet" />
                <span className="text-white/20 text-xs">·</span>
                <span className="text-xs text-white/25">{utxos.length} UTXO{utxos.length !== 1 ? "s" : ""}</span>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Quick Actions ── */}
        {isConnected && <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          {[
            { label: "Send", icon: Send, tab: "send" as Tab, color: "text-emerald-400" },
            { label: "Receive", icon: Download, tab: "receive" as Tab, color: "text-cyan-400" },
            { label: "Party", icon: User, tab: "party" as Tab, color: "text-violet-400" },
          ].map(({ label, icon: Icon, tab, color }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all ${
                activeTab === tab
                  ? "bg-white/10 border-white/20"
                  : "bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.06]"
              }`}
            >
              <Icon className={`w-5 h-5 ${color}`} />
              <span className="text-xs font-medium text-white/70">{label}</span>
            </button>
          ))}
        </motion.div>}

        {/* ── Tab Bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="flex gap-1 mb-5 p-1 bg-white/[0.04] rounded-xl border border-white/[0.07]"
        >
          {TABS.filter(t => isConnected || t.id === "party").map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === id
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/35 hover:text-white/60"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </motion.div>

        {/* ── Tab Content ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === "assets" && (
              <AssetsTab
                isConnected={isConnected}
                partyId={partyId}
                utxos={utxos}
                loading={loadingBalance}
                onRefresh={fetchBalance}
              />
            )}
            {activeTab === "send" && (
              <SendTab isConnected={isConnected} partyId={partyId} utxos={utxos} />
            )}
            {activeTab === "receive" && (
              <ReceiveTab partyId={partyId} />
            )}
            {activeTab === "party" && (
              <PartyTab onPartyGenerated={handlePartyGenerated} />
            )}
          </motion.div>
        </AnimatePresence>

      </main>

      <FooterV2 />
    </div>
  )
}
