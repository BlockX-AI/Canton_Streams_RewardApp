"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { type ReactNode } from "react";
import { ShaderCanvas } from "@/components/shader-canvas";
import { Nav } from "@/components/nav";
import { ArrowChip } from "@/components/arrow-chip";

const easeOutExpo = [0.33, 1, 0.68, 1] as const;

const HEADLINE_LINES = [
  "Privacy-Native",
  "Payment Streaming",
  "for Canton.",
] as const;

export function Hero(): ReactNode {
  return (
    <section
      id="hero"
      className="relative w-full min-h-screen flex flex-col overflow-hidden bg-neutral-950"
    >
      <div aria-hidden className="absolute inset-0">
        <ShaderCanvas />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60"
      />

      <Nav />

      <div className="relative flex-1 flex flex-col justify-center px-6 lg:px-10 max-w-[1680px] mx-auto w-full pt-24 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOutExpo, delay: 0.1 }}
          className="mb-8 flex items-center gap-3 flex-wrap"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm px-3.5 py-1.5 text-xs font-mono text-white/70 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            66/66 Tests Passing · Canton 3.4.11
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3.5 py-1.5 text-xs font-mono text-cyan-300/80 uppercase tracking-widest">
            CIP-56 · CIP-103 · Daml SDK
          </span>
        </motion.div>

        <motion.h1
          className="text-white max-w-4xl text-[clamp(3rem,8vw,7.5rem)] font-medium leading-[0.9] tracking-tight"
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.09, delayChildren: 0.25 }}
        >
          {HEADLINE_LINES.map((line) => (
            <span key={line} className="block overflow-hidden pb-[0.04em]">
              <motion.span
                className="block will-change-transform"
                variants={{
                  hidden:  { y: "110%" },
                  visible: { y: "0%" },
                }}
                transition={{ duration: 1, ease: easeOutExpo }}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </motion.h1>

        <motion.p
          className="mt-8 max-w-xl text-xl font-light leading-relaxed text-white/60"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easeOutExpo, delay: 0.65 }}
        >
          Open-source streaming primitive for Canton Network. Every obligation
          flows exactly as it accrues — on-ledger, private, deterministic.
          No credit risk, no batch settlement lag.
        </motion.p>

        <motion.div
          className="mt-10 flex items-center gap-3 flex-wrap"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easeOutExpo, delay: 0.75 }}
        >
          <Link href="/dashboard" className="group inline-flex items-stretch gap-1">
            <span className="px-5 py-3 rounded-md bg-white text-neutral-900 text-xs font-medium tracking-widest uppercase">
              Try Dashboard
            </span>
            <ArrowChip className="bg-white text-neutral-900" name="cta" />
          </Link>

          <a
            href="https://github.com/BlockX-AI/GrowStreams"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-stretch gap-1"
          >
            <span className="px-5 py-3 rounded-md border border-white/20 text-white text-xs font-medium tracking-widest uppercase hover:border-white/40 transition-colors">
              View on GitHub
            </span>
            <ArrowChip className="border border-white/20 text-white hover:border-white/40 transition-colors" />
          </a>
        </motion.div>

        <motion.div
          className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easeOutExpo, delay: 0.9 }}
        >
          {[
            { value: "4,300+", label: "Campaign Participants" },
            { value: "7,233",  label: "Upvotes on CCTools" },
            { value: "66/66",  label: "Tests Passing" },
            { value: "6",      label: "Live Use Cases" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-medium text-white tabular-nums">{s.value}</p>
              <p className="mt-1 text-xs font-mono text-white/40 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none"
      />
    </section>
  );
}
