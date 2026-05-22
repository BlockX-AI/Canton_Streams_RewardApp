"use client";

import { motion, useInView } from "motion/react";
import { useRef, type ReactNode } from "react";
import { RevealHeadline } from "@/components/reveal-headline";

const easeOutExpo = [0.33, 1, 0.68, 1] as const;

const STATS = [
  { value: "4,300+",  label: "Campaign Participants",  sub: "CCTools × GrowStreams earn campaign" },
  { value: "7,233",   label: "Upvotes Received",       sub: "Organic community validation" },
  { value: "1,317",   label: "Active Users",           sub: "On growstreams.xyz" },
  { value: "66 / 66", label: "Tests Passing",          sub: "Canton 3.4.11 · Daml SDK 3.4" },
  { value: "6",       label: "Live Use Cases",         sub: "LP, Vesting, Billing, Payroll, Milestones, AI" },
  { value: "< 2s",    label: "Avg Settlement Time",    sub: "On-ledger, no off-chain relay" },
];

export function LiveStats(): ReactNode {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.2 });

  return (
    <section
      ref={sectionRef}
      id="evidence"
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
              Live Evidence
            </motion.span>
          </div>
          <div className="col-span-7 col-start-6 max-[1100px]:col-span-12 max-[1100px]:col-start-1">
            <RevealHeadline
              delay={0.05}
              className="text-balance text-[clamp(2rem,4.2vw,4rem)] font-medium leading-[0.85] tracking-tight"
            >
              Real demand. Real tests. Real users.
            </RevealHeadline>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: easeOutExpo, delay: 0.18 }}
              className="mt-6 max-w-[60ch] text-xl font-light leading-snug text-foreground/60"
            >
              The demand exists without the infrastructure. GrowStreams closes
              that gap — with working code, not a whitepaper.
            </motion.p>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px border border-foreground/[0.06] rounded-2xl overflow-hidden">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: easeOutExpo, delay: 0.1 + i * 0.07 }}
              className="bg-foreground/[0.02] hover:bg-foreground/[0.045] transition-colors duration-500 p-8 lg:p-10"
            >
              <p className="text-4xl lg:text-5xl font-medium tracking-tight tabular-nums text-foreground">
                {stat.value}
              </p>
              <p className="mt-3 text-base font-medium text-foreground/80">{stat.label}</p>
              <p className="mt-1 text-sm text-foreground/40">{stat.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
