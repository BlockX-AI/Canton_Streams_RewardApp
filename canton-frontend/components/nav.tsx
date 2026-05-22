"use client";

import { motion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowChip } from "@/components/arrow-chip";
import { WalletModal } from "@/components/wallet-modal";
import { useWallet } from "@/lib/wallet-context";

const NAV_LINKS = [
  { label: "Protocol", href: "#product" },
  { label: "Features", href: "#pillars" },
  { label: "FAQ", href: "#faq" },
];

const APP_LINKS = [
  { label: "Campaigns", href: "/campaigns" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Claim", href: "/claim" },
];

const easeOutExpo = [0.33, 1, 0.68, 1] as const;

export function Nav({ delay }: { delay?: number }): ReactNode {
  const [menuOpen, setMenuOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const { status, partyId } = useWallet();
  const connected = status === "connected" && !!partyId;
  const navRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();

  const borderOpacity = useTransform(scrollY, [0, 80], [0, 1]);
  const bgOpacity     = useTransform(scrollY, [0, 80], [0, 0.85]);

  useEffect(() => {
    const unsub = scrollY.on("change", (v) => setAtTop(v < 10));
    return unsub;
  }, [scrollY]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  return (
    <motion.nav
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-50"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: easeOutExpo }}
    >
      <motion.div
        className="absolute inset-0 backdrop-blur-md"
        style={{ opacity: bgOpacity, backgroundColor: "var(--background)" }}
      />
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-px bg-foreground/10"
        style={{ opacity: borderOpacity }}
      />

      <div className="relative max-w-[1680px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-medium tracking-tight">
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 shrink-0" />
          <span className="text-foreground">GrowStreams</span>
          <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-widest text-foreground/40 border border-foreground/10 rounded px-1.5 py-0.5">
            Canton
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-sm text-foreground/65 hover:text-foreground transition-colors duration-300"
            >
              {l.label}
            </Link>
          ))}
          <div className="w-px h-4 bg-foreground/20" />
          {APP_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-sm text-cyan-400/80 hover:text-cyan-300 transition-colors duration-300"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600/20 border border-cyan-400/30 text-cyan-300 text-sm font-medium hover:bg-cyan-600/30 transition-colors"
          >
            Dashboard
          </Link>
          <button
            type="button"
            onClick={() => setWalletOpen(true)}
            className={`hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              connected
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
                : "border-white/20 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-white/30"}`} />
            {connected
              ? partyId!.slice(4, 20) + "…"
              : "Connect Wallet"}
          </button>
          <button
            type="button"
            className="md:hidden flex flex-col gap-1.5 p-2"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <span className={`block w-5 h-0.5 bg-foreground transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-5 h-0.5 bg-foreground transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-0.5 bg-foreground transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: easeOutExpo }}
          className="md:hidden absolute top-16 left-0 right-0 border-t border-foreground/10 bg-background/95 backdrop-blur-md px-6 py-4 flex flex-col gap-4"
        >
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="text-foreground/70 hover:text-foreground transition-colors py-1"
            >
              {l.label}
            </Link>
          ))}
          <div className="h-px bg-foreground/10 my-2" />
          {APP_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="text-cyan-400/80 hover:text-cyan-300 transition-colors py-1"
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={() => { setMenuOpen(false); setWalletOpen(true); }}
            className={`mt-2 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border ${
              connected
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : "border-foreground/20 bg-foreground/5 text-foreground/70"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-foreground/30"}`} />
            {connected ? `Connected: ${partyId!.slice(4, 20)}…` : "Connect Wallet"}
          </button>
          <Link
            href="/dashboard"
            onClick={() => setMenuOpen(false)}
            className="px-4 py-2.5 rounded-lg bg-cyan-600/20 border border-cyan-400/30 text-cyan-300 text-sm font-medium text-center"
          >
            Dashboard
          </Link>
        </motion.div>
      )}

      <WalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />
    </motion.nav>
  );
}
