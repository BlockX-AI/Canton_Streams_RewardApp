"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useWallet } from "@/lib/wallet-context";

const ease = [0.33, 1, 0.68, 1] as const;

const WALLETS = [
  {
    name: "Bron Wallet",
    desc: "Most popular Canton wallet — mobile + extension",
    icon: "🟡",
    url: "https://bron.app",
  },
  {
    name: "Nightly",
    desc: "Browser extension for Canton Network",
    icon: "🌙",
    url: "https://nightly.app",
  },
  {
    name: "Console Wallet",
    desc: "Web wallet — no install needed",
    icon: "⌨️",
    url: "https://wallet.canton.network",
  },
  {
    name: "C8 Wallet",
    desc: "Hardware-backed key management",
    icon: "🔐",
    url: "https://cantor8.com",
  },
];

const DEVNET_PARTY =
  "PAR::GINIE-VALIDATOR::1220f42cead6c3bf0443af1f0e51ee250afb48ee528756945ee2733cbfef62c10986";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function WalletModal({ open, onClose }: Props): ReactNode {
  const { status, partyId, extensionFound, connect, disconnect, setManualParty, error } =
    useWallet();
  const [manualInput, setManualInput] = useState("");
  const [tab, setTab] = useState<"wallet" | "manual">(
    extensionFound ? "wallet" : "manual"
  );
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleManualConnect = () => {
    if (!manualInput.trim()) return;
    setManualParty(manualInput);
    onClose();
  };

  const handleWalletConnect = async () => {
    await connect();
    if (status === "connected") onClose();
  };

  const handleDisconnect = () => {
    disconnect();
    setManualInput("");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            ref={backdropRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.35, ease }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-neutral-950 border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
                <h2 className="text-lg font-medium text-white">Canton Wallet</h2>
                <button
                  onClick={onClose}
                  className="text-white/40 hover:text-white/80 transition-colors text-xl leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {/* Connected state */}
              {status === "connected" && partyId ? (
                <div className="px-6 py-6 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-300 text-sm font-medium">Connected</span>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <p className="text-xs text-white/40 font-mono mb-1.5">Party ID</p>
                    <p className="text-sm font-mono text-white/90 break-all leading-relaxed">
                      {partyId}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        onClose();
                        window.location.href = "/dashboard";
                      }}
                      className="flex-1 py-2.5 bg-white text-neutral-900 rounded-lg text-sm font-medium hover:bg-white/90 transition-colors"
                    >
                      Open Dashboard
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="px-4 py-2.5 border border-white/20 rounded-lg text-sm text-white/60 hover:text-white hover:border-white/40 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Tabs */}
                  <div className="flex border-b border-white/10">
                    {[
                      { id: "wallet", label: "Canton Wallet" },
                      { id: "manual", label: "Manual / DevNet" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id as "wallet" | "manual")}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${
                          tab === t.id
                            ? "text-white border-b-2 border-cyan-400"
                            : "text-white/40 hover:text-white/60"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="px-6 py-5">
                    {/* Wallet tab */}
                    {tab === "wallet" && (
                      <div className="space-y-4">
                        {extensionFound ? (
                          <>
                            <p className="text-sm text-white/60">
                              Canton wallet extension detected. Connect to load your
                              party ID.
                            </p>
                            <button
                              onClick={handleWalletConnect}
                              disabled={status === "connecting"}
                              className="w-full py-3 bg-white text-neutral-900 rounded-xl font-medium text-sm hover:bg-white/90 disabled:opacity-50 transition-colors"
                            >
                              {status === "connecting"
                                ? "Connecting…"
                                : "Connect Wallet"}
                            </button>
                          </>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-sm text-white/50">
                              No Canton wallet detected. Install one to connect:
                            </p>
                            {WALLETS.map((w) => (
                              <a
                                key={w.name}
                                href={w.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-4 p-4 border border-white/10 rounded-xl hover:border-white/20 hover:bg-white/5 transition-all"
                              >
                                <span className="text-2xl">{w.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white">
                                    {w.name}
                                  </p>
                                  <p className="text-xs text-white/40 mt-0.5">
                                    {w.desc}
                                  </p>
                                </div>
                                <span className="text-white/30 text-sm">↗</span>
                              </a>
                            ))}
                          </div>
                        )}

                        {error && (
                          <p className="text-xs text-red-400 font-mono">{error}</p>
                        )}
                      </div>
                    )}

                    {/* Manual tab */}
                    {tab === "manual" && (
                      <div className="space-y-4">
                        <p className="text-sm text-white/50">
                          Enter a Canton party ID manually. Use the GINIE-VALIDATOR
                          for DevNet testing.
                        </p>
                        <textarea
                          rows={3}
                          value={manualInput}
                          onChange={(e) => setManualInput(e.target.value)}
                          placeholder="PAR::YOUR-VALIDATOR::1220..."
                          className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-400/50 font-mono resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleManualConnect}
                            disabled={!manualInput.trim()}
                            className="flex-1 py-2.5 bg-white text-neutral-900 rounded-lg text-sm font-medium hover:bg-white/90 disabled:opacity-40 transition-colors"
                          >
                            Connect Party
                          </button>
                          <button
                            onClick={() => setManualInput(DEVNET_PARTY)}
                            className="px-3 py-2.5 border border-white/20 rounded-lg text-xs text-white/50 hover:text-white hover:border-white/40 transition-colors whitespace-nowrap"
                          >
                            DevNet
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
