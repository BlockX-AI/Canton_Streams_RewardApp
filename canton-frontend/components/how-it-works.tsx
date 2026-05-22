"use client";

import { motion, useInView } from "motion/react";
import { useRef, type ReactNode } from "react";
import { RevealHeadline } from "@/components/reveal-headline";

const easeOutExpo = [0.33, 1, 0.68, 1] as const;

const STEPS = [
  {
    n: "01",
    title: "Create Stream",
    body: "Sender deposits tokens into a StreamAgreement contract. Contract records sender, receiver, flow rate (GROW/s), deposit amount, and creation timestamp.",
    code: "Create StreamAgreement { flowRate = 0.001, deposited = 86.4 }",
  },
  {
    n: "02",
    title: "Accrue Continuously",
    body: "No transactions required while the stream runs. Accrued = (Ledger Time − Last Settled) × Rate. Both parties compute the same number independently from on-chain state.",
    code: "Accrued = Δt × 0.001 GROW/s  →  deterministic, private",
  },
  {
    n: "03",
    title: "Settle On Demand",
    body: "Receiver exercises Withdraw anytime. One transaction moves exactly the accrued amount, updates the settlement timestamp, and leaves the stream running.",
    code: "Exercise Withdraw  →  Δ tokens transferred, state updated",
  },
  {
    n: "04",
    title: "Lifecycle Controls",
    body: "Sender can Pause, Resume, or Stop. Mutual cancellation returns remaining deposit. Renewal extends the stream. All state transitions are enforced by Daml — no admin keys.",
    code: "Pause | Resume | Stop | MutualCancel | Renew | TopUp",
  },
];

const STANDARDS = [
  { label: "CIP-56 V1 & V2", desc: "Asset-agnostic. Any compliant token works without changes to streaming logic." },
  { label: "CIP-103 dApp API", desc: "All lifecycle operations exposed over JSON-RPC. CIP-103 wallets work out of the box." },
  { label: "Canton Wallet SDK", desc: "UI components and hooks for stream creation, withdrawal, and status display." },
  { label: "Daml SDK 3.4.11",  desc: "On-ledger enforcement via Daml templates. No off-chain smart contract runner needed." },
];

export function HowItWorks(): ReactNode {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.1 });

  return (
    <section
      ref={sectionRef}
      id="protocol"
      className="relative w-full bg-background text-foreground"
    >
      <div className="max-w-[1680px] mx-auto px-6 lg:px-10 py-28 lg:py-36">
        <div className="grid grid-cols-12 gap-x-10 gap-y-6 max-[850px]:grid-cols-1">
          <div className="col-span-3 max-[1100px]:col-span-12 pt-2">
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: easeOutExpo }}
              className="inline-flex items-center rounded-md border border-foreground/[0.08] px-3.5 py-1.5 font-mono text-xs uppercase tracking-widest text-foreground/70"
            >
              Protocol
            </motion.span>
          </div>
          <div className="col-span-7 col-start-6 max-[1100px]:col-span-12 max-[1100px]:col-start-1">
            <RevealHeadline
              delay={0.05}
              className="text-balance text-[clamp(2rem,4.2vw,4rem)] font-medium leading-[0.85] tracking-tight"
            >
              On-ledger. Private. Deterministic.
            </RevealHeadline>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: easeOutExpo, delay: 0.18 }}
              className="mt-6 max-w-[60ch] text-xl font-light leading-snug text-foreground/60"
            >
              Four transactions handle a full streaming lifecycle — no relayer,
              no oracle, no cron job. The accrual formula is computed from
              on-chain state, reproducible by any authorized party.
            </motion.p>
          </div>
        </div>

        <div className="mt-20 space-y-px">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, x: -16 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.7, ease: easeOutExpo, delay: 0.1 + i * 0.09 }}
              className="grid grid-cols-12 gap-x-10 max-[850px]:grid-cols-1 border border-foreground/[0.06] rounded-2xl p-8 lg:p-10 hover:border-foreground/[0.12] transition-colors duration-500 bg-foreground/[0.01]"
            >
              <div className="col-span-1 max-[850px]:col-span-full">
                <span className="font-mono text-3xl font-light text-foreground/20">{step.n}</span>
              </div>
              <div className="col-span-4 max-[850px]:col-span-full">
                <h3 className="text-xl font-medium tracking-tight mt-1">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-foreground/55">{step.body}</p>
              </div>
              <div className="col-span-6 col-start-7 max-[850px]:col-span-full max-[850px]:mt-4 flex items-center">
                <pre className="w-full rounded-xl bg-foreground/[0.04] border border-foreground/[0.06] px-5 py-4 text-xs font-mono text-foreground/70 overflow-x-auto whitespace-pre-wrap">
                  {step.code}
                </pre>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-24">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: easeOutExpo, delay: 0.5 }}
            className="font-mono text-xs uppercase tracking-widest text-foreground/50 mb-8"
          >
            Standards Alignment
          </motion.p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STANDARDS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7, ease: easeOutExpo, delay: 0.55 + i * 0.07 }}
                className="rounded-2xl border border-foreground/[0.07] p-6 bg-foreground/[0.02] hover:bg-foreground/[0.045] transition-colors duration-500"
              >
                <p className="font-mono text-sm font-medium text-foreground">{s.label}</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/50">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
