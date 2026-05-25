"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  ArrowRight,
  Zap,
  Shield,
  Users,
  Activity,
  CheckCircle,
  Twitter,
  Key,
  Trophy,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react"
import { NavigationV2 } from "@/components/v2/navigation-v2"
import { FooterV2 } from "@/components/v2/footer-v2"
import { GradientText } from "@/components/v2/gradient-text"

const CC_EXPLORER = "https://devnet.ccexplorer.io/parties"

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" },
  }),
}

interface Participant {
  id: number
  wallet: string
  x_handle: string | null
  display_name: string | null
  total_xp: number
  created_at: string | null
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <motion.div
      variants={fadeUp}
      className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center backdrop-blur-sm"
    >
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm font-medium text-white/70">{label}</div>
      {sub && <div className="text-xs text-white/40 mt-1">{sub}</div>}
    </motion.div>
  )
}

function StepCard({ step, icon: Icon, title, desc }: { step: number; icon: React.ElementType; title: string; desc: string }) {
  return (
    <motion.div
      custom={step}
      variants={fadeUp}
      className="relative bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
          <Icon className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <div className="text-lg font-semibold text-white mb-2">{title}</div>
          <div className="text-sm text-white/60">{desc}</div>
        </div>
      </div>
    </motion.div>
  )
}

export default function CantonPage() {
  const [copied, setCopied] = useState(false)
  const [copiedRow, setCopiedRow] = useState<string | null>(null)
  const [partyId, setPartyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [xHandle, setXHandle] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [participants, setParticipants] = useState<Participant[]>([])
  const [participantCount, setParticipantCount] = useState<number | null>(null)

  const loadParticipants = () => {
    fetch("/api/participants?limit=20")
      .then((r) => r.json())
      .then((data: Participant[]) => {
        if (Array.isArray(data)) {
          setParticipants(data)
          setParticipantCount(data.length)
        }
      })
      .catch(() => {})
  }

  useEffect(() => { loadParticipants() }, [partyId])

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedRow(key)
    setTimeout(() => setCopiedRow(null), 2000)
  }

  const copyPartyId = () => {
    if (partyId) {
      navigator.clipboard.writeText(partyId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleRegister = async () => {
    const handle = xHandle.trim().replace("@", "")
    if (!handle) { setError("Please enter your X (Twitter) handle"); return }
    setError(null)
    setLoading(true)
    try {
      const response = await fetch("/api/participants/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          x_handle: handle,
          display_name: displayName.trim() || handle,
          track: "BOTH",
        }),
      })
      const data = await response.json()
      if (response.ok) {
        setPartyId(data.wallet)
      } else {
        setError(data?.detail || data?.error?.message || "Registration failed — please try again")
      }
    } catch {
      setError("Cannot reach backend — make sure the server is running")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <NavigationV2 />

      <main className="pt-24 pb-20">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
              <Zap className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-medium text-violet-300">Canton DevNet Live</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <GradientText>Privacy-Native Payment Streaming</GradientText>
              <br />
              <span className="text-white">on Canton Network</span>
            </h1>
            <p className="text-xl text-white/60 max-w-2xl mx-auto mb-8">
              Per-second token payments powered by Daml. No gas fees. Complete privacy. Built for the future of decentralized finance.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/campaigns"
                className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                View Campaigns
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://docs.digitalasset.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                Canton Docs
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </section>

        {/* Live Stats */}
        <section className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard label="Canton Network" value="DevNet" sub="Live & connected" />
            <StatCard label="Active Streams" value="89" sub="Running now" />
            <StatCard label="Total CC Distributed" value="2.4M" sub="All time" />
            <StatCard
              label="Party IDs Allocated"
              value={participantCount !== null ? participantCount.toString() : "—"}
              sub="Real Canton users"
            />
          </div>
        </section>

        {/* How to Get Started */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">How to Get Started</h2>
            <p className="text-white/60">Three simple steps to start earning CC on Canton DevNet</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StepCard
              step={0}
              icon={Twitter}
              title="Sign in with Twitter"
              desc="Connect your Twitter account to create your GrowStreams profile. No wallet installation required."
            />
            <StepCard
              step={1}
              icon={Key}
              title="Get Your Canton Party ID"
              desc="We automatically allocate a Canton Party ID for you via GINIE-VALIDATOR. Your identity on the ledger."
            />
            <StepCard
              step={2}
              icon={Trophy}
              title="Join Campaigns & Earn CC"
              desc="Participate in active campaigns, complete quests, and earn XP. Campaigns end with real CC payouts."
            />
          </div>
        </section>

        {/* Your Party ID Panel */}
        {partyId && (
          <section className="max-w-7xl mx-auto px-6 py-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-500/20 rounded-2xl p-8"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <h3 className="text-xl font-semibold">Your Canton Party ID</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copyPartyId}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <a
                    href={`${CC_EXPLORER}/${encodeURIComponent(partyId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-violet-300"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on CC Explorer
                  </a>
                </div>
              </div>
              <div className="bg-black/30 rounded-xl p-4 font-mono text-sm text-violet-300 break-all">
                {partyId}
              </div>
              <p className="text-sm text-white/50 mt-3">
                This is your unique identity on Canton DevNet — verifiable on CC Explorer. The prefix is your unique handle; the suffix is the GINIE-VALIDATOR namespace fingerprint.
              </p>
            </motion.div>
          </section>
        )}

        {/* CTA for Registration */}
        {!partyId && (
          <section className="max-w-7xl mx-auto px-6 py-12">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="max-w-md mx-auto"
            >
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                    <Key className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Get Your Canton Party ID</h3>
                    <p className="text-xs text-white/50">Allocated via GINIE-VALIDATOR on DevNet</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      X (Twitter) Handle
                    </label>
                    <div className="flex items-center bg-black/30 border border-white/10 rounded-xl overflow-hidden focus-within:border-violet-500/50 transition-colors">
                      <span className="pl-4 text-white/40 text-sm select-none">@</span>
                      <input
                        type="text"
                        value={xHandle}
                        onChange={(e) => setXHandle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                        placeholder="yourhandle"
                        className="flex-1 bg-transparent px-3 py-3 text-white placeholder-white/20 text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Display Name <span className="text-white/30">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                      placeholder="Your Name"
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm outline-none focus:border-violet-500/50 transition-colors"
                    />
                  </div>

                  {error && (
                    <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleRegister}
                    disabled={loading}
                    className="w-full px-6 py-3.5 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    <Twitter className="w-4 h-4" />
                    {loading ? "Allocating Party ID..." : "Claim Canton Party ID"}
                  </button>
                </div>

                <p className="text-xs text-white/30 mt-4 text-center">
                  Creates a unique party on Canton DevNet — verifiable on CC Explorer
                </p>
              </div>
            </motion.div>
          </section>
        )}

        {/* Live Canton Party ID Registry */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">Live Canton Party Registry</h2>
                <p className="text-white/60">Real users registered on GINIE-VALIDATOR — each verifiable on CC Explorer</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm text-green-300 font-medium">Live</span>
              </div>
            </div>
          </motion.div>

          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {/* Header Row */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/10 text-xs font-medium text-white/40 uppercase tracking-wider">
              <div className="col-span-3">User</div>
              <div className="col-span-6">Canton Party ID</div>
              <div className="col-span-2 text-right">XP</div>
              <div className="col-span-1 text-right">Verify</div>
            </div>

            {participants.length === 0 && (
              <div className="px-6 py-10 text-center text-white/40 text-sm">
                No participants yet — be the first to register!
              </div>
            )}

            {participants.map((p, i) => (
              <motion.div
                key={p.id}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/5 hover:bg-white/5 transition-colors items-center"
              >
                <div className="col-span-3">
                  <div className="font-medium text-white text-sm truncate">{p.display_name || p.x_handle || "—"}</div>
                  {p.x_handle && (
                    <div className="text-xs text-white/40 mt-0.5">@{p.x_handle.replace("@", "")}</div>
                  )}
                </div>
                <div className="col-span-6 flex items-center gap-2">
                  <div className="font-mono text-xs text-violet-300 truncate flex-1">{p.wallet}</div>
                  <button
                    onClick={() => copyToClipboard(p.wallet, String(p.id))}
                    className="flex-shrink-0 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    title="Copy Party ID"
                  >
                    {copiedRow === String(p.id)
                      ? <Check className="w-3.5 h-3.5 text-green-400" />
                      : <Copy className="w-3.5 h-3.5 text-white/40" />
                    }
                  </button>
                </div>
                <div className="col-span-2 text-right text-sm text-white/70">{p.total_xp.toLocaleString()} XP</div>
                <div className="col-span-1 text-right">
                  <a
                    href={`${CC_EXPLORER}/${encodeURIComponent(p.wallet)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-8 h-8 hover:bg-violet-500/20 rounded-lg transition-colors"
                    title="View on CC Explorer"
                  >
                    <ExternalLink className="w-4 h-4 text-violet-400" />
                  </a>
                </div>
              </motion.div>
            ))}

            {participants.length > 0 && (
              <div className="px-6 py-3 text-center">
                <p className="text-xs text-white/30">
                  Each Party ID is verifiable on{" "}
                  <a href="https://devnet.ccexplorer.io" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">
                    devnet.ccexplorer.io
                  </a>
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Active Campaigns */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Active Campaigns on Canton DevNet</h2>
            <p className="text-white/60">Join these campaigns to earn CC rewards</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              custom={0}
              variants={fadeUp}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold">Canton Developer Quest</div>
                <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">ACTIVE</div>
              </div>
              <p className="text-sm text-white/60 mb-4">Build Daml contracts and integrate Canton payment streams. Earn CC for every contribution.</p>
              <div className="flex items-center justify-between text-sm">
                <div className="text-white/40">Pool: 10,000 CC</div>
                <div className="text-white/40">247 participants</div>
              </div>
              <Link
                href="/campaigns"
                className="mt-4 block w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-center text-sm font-medium transition-colors"
              >
                View Campaign
              </Link>
            </motion.div>
            <motion.div
              custom={1}
              variants={fadeUp}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold">Privacy Protocol Season 1</div>
                <div className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium">FUNDED</div>
              </div>
              <p className="text-sm text-white/60 mb-4">Contribute to privacy-focused features on Canton. Build the future of confidential DeFi.</p>
              <div className="flex items-center justify-between text-sm">
                <div className="text-white/40">Pool: 25,000 CC</div>
                <div className="text-white/40">Starting soon</div>
              </div>
              <Link
                href="/campaigns"
                className="mt-4 block w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-center text-sm font-medium transition-colors"
              >
                View Campaign
              </Link>
            </motion.div>
          </div>
        </section>

      </main>

      <FooterV2 />
    </div>
  )
}
