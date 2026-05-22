"use client";

import { motion, useInView } from "motion/react";
import { useRef, type ReactNode } from "react";
import { RevealHeadline } from "@/components/reveal-headline";
import { Check } from "lucide-react";
import Link from "next/link";
import { ArrowChip } from "@/components/arrow-chip";

const easeOutExpo = [0.33, 1, 0.68, 1] as const;

const MILESTONES = [
  {
    id: "M1",
    title: "Canton Integration",
    cc: "12,000 CC",
    status: "active",
    timeline: "Months 1 – 2",
    deliverables: [
      "Canton JSON API v2 integration with JWT auth",
      "Canton Coin (CC) as primary settlement asset",
      "CIP-56 V1 & V2 interface compliance",
      "StreamAgreement, StreamPool, VestingStream contracts",
      "TypeScript SDK with Canton Wallet SDK hooks",
      "Dashboard UI: stream lifecycle management",
    ],
  },
  {
    id: "M2",
    title: "USDCx & Advanced Types",
    cc: "9,000 CC",
    status: "pending",
    timeline: "Months 3 – 4",
    deliverables: [
      "USDCx as second settlement asset",
      "MilestoneStream: deliverable-based escrow",
      "Non-prefunded rolling top-up streams",
      "Multi-asset stream portfolio view",
      "Automated testing across all contract types",
    ],
  },
  {
    id: "M3",
    title: "CIP-103 dApp API & AI",
    cc: "9,000 CC",
    status: "pending",
    timeline: "Months 5 – 6",
    deliverables: [
      "Full CIP-103 dApp API surface",
      "AI agent metered payment template",
      "Batch stream creation API",
      "Event subscriptions for stream state changes",
      "Security audit by external reviewer",
    ],
  },
  {
    id: "M4",
    title: "OSS Launch & Docs",
    cc: "9,000 CC",
    status: "pending",
    timeline: "Months 7 – 8",
    deliverables: [
      "Open-source repository with Apache 2.0 license",
      "Full developer documentation site",
      "Integration guides for Canton ecosystem apps",
      "Video walkthrough series",
      "Mainnet deployment guide",
    ],
  },
];

export function Milestones(): ReactNode {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.15 });

  return (
    <section
      ref={sectionRef}
      id="milestones"
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
              Funding Plan
            </motion.span>
          </div>
          <div className="col-span-7 col-start-6 max-[1100px]:col-span-12 max-[1100px]:col-start-1">
            <RevealHeadline
              delay={0.05}
              className="text-balance text-[clamp(2rem,4.2vw,4rem)] font-medium leading-[0.85] tracking-tight"
            >
              Four milestones. Eight months. 39,000 CC total.
            </RevealHeadline>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: easeOutExpo, delay: 0.18 }}
              className="mt-6 max-w-[60ch] text-xl font-light leading-snug text-foreground/60"
            >
              Each milestone pays on delivery of working, tested, auditable
              code. M1 is partially complete — 66 tests passing today.
            </motion.p>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-5">
          {MILESTONES.map((m, i) => (
            <motion.article
              key={m.id}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, ease: easeOutExpo, delay: 0.1 + i * 0.09 }}
              className={`relative flex flex-col rounded-2xl border p-9 transition-colors duration-500 ${
                m.status === "active"
                  ? "border-cyan-500/30 bg-cyan-500/[0.04] hover:bg-cyan-500/[0.07]"
                  : "border-foreground/[0.07] bg-foreground/[0.02] hover:bg-foreground/[0.045]"
              }`}
            >
              {m.status === "active" && (
                <span className="absolute top-5 right-5 text-[10px] font-mono uppercase tracking-widest text-cyan-400 border border-cyan-400/30 rounded-full px-2 py-0.5">
                  Active
                </span>
              )}
              <div className="flex items-start gap-4 mb-5">
                <span className="font-mono text-4xl font-light text-foreground/20">{m.id}</span>
                <div>
                  <h3 className="text-xl font-medium tracking-tight">{m.title}</h3>
                  <p className="text-sm text-foreground/45 mt-0.5">{m.timeline}</p>
                </div>
              </div>

              <div className="mb-5 flex items-baseline gap-2">
                <span className="text-3xl font-medium tabular-nums text-foreground">{m.cc}</span>
                <span className="text-sm text-foreground/40">Canton Coin</span>
              </div>

              <ul className="space-y-2.5 flex-1">
                {m.deliverables.map((d) => (
                  <li key={d} className="flex items-start gap-3 text-sm text-foreground/70">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-foreground/35" strokeWidth={1.6} />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: easeOutExpo, delay: 0.55 }}
          className="mt-12 flex items-center gap-4 flex-wrap"
        >
          <Link
            href="https://www.cctools.network/earn/growstreams-x-cctools"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-stretch gap-1"
          >
            <span className="px-5 py-3 rounded-md bg-foreground text-background text-xs font-medium tracking-widest uppercase">
              View Canton Campaign
            </span>
            <ArrowChip className="bg-foreground text-background" name="cta" />
          </Link>
          <p className="text-sm text-foreground/40 font-mono">
            growstreams-x-cctools · cctools.network
          </p>
        </motion.div>
      </div>
    </section>
  );
}
