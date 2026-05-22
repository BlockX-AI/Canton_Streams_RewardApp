"use client";

import { motion, useInView } from "motion/react";
import { useRef, type ReactNode } from "react";
import { RevealHeadline } from "@/components/reveal-headline";
import {
  Users, Clock, Zap, Building2, DollarSign, Bot,
} from "lucide-react";

const easeOutExpo = [0.33, 1, 0.68, 1] as const;

const USE_CASES = [
  {
    icon: <Users className="w-5 h-5" />,
    tag:  "StreamPool",
    title: "LP Incentive Distribution",
    body:  "Distribute liquidity rewards continuously across pool members. Share-weighted streaming to hundreds of parties from a single contract — no cron jobs, no batch settlement.",
    color: "text-purple-400",
    bg:    "from-purple-500/8",
  },
  {
    icon: <Clock className="w-5 h-5" />,
    tag:  "VestingStream",
    title: "Token Vesting with Cliff",
    body:  "Employee and investor vesting with cliff enforcement on-ledger. Post-cliff, tokens stream continuously rather than unlocking in monthly chunks. Cliff date, end date, and total amount stored in Daml.",
    color: "text-blue-400",
    bg:    "from-blue-500/8",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    tag:  "StreamAgreement",
    title: "Continuous Billing & Subscriptions",
    body:  "Replace monthly invoices with per-second billing. A SaaS platform streams 0.0000003 CC per second. The receiver withdraws accrued amounts anytime. Payer can pause or cancel on notice.",
    color: "text-cyan-400",
    bg:    "from-cyan-500/8",
  },
  {
    icon: <Building2 className="w-5 h-5" />,
    tag:  "StreamAgreement",
    title: "Payroll Streaming",
    body:  "Salary accrues by the second, not the fortnight. Employees can access earned pay any time. On Canton, stream terms are visible only to employer and employee — not the market.",
    color: "text-emerald-400",
    bg:    "from-emerald-500/8",
  },
  {
    icon: <DollarSign className="w-5 h-5" />,
    tag:  "MilestoneStream",
    title: "Milestone-Based Escrow",
    body:  "Fund a contractor once; release tranches as deliverables are confirmed. Each milestone maps to an on-ledger amount. Admin confirms delivery; tokens flow immediately. No escrow agent.",
    color: "text-amber-400",
    bg:    "from-amber-500/8",
  },
  {
    icon: <Bot className="w-5 h-5" />,
    tag:  "StreamAgreement",
    title: "AI Agent Metered Payments",
    body:  "An autonomous agent streams payment while a service is consumed. The service provider can read accrued balance on-chain to decide whether to keep serving. No pre-authorisation call required.",
    color: "text-rose-400",
    bg:    "from-rose-500/8",
  },
];

export function UseCases(): ReactNode {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.15 });

  return (
    <section
      ref={sectionRef}
      id="use-cases"
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
              Use Cases
            </motion.span>
          </div>
          <div className="col-span-7 col-start-6 max-[1100px]:col-span-12 max-[1100px]:col-start-1">
            <RevealHeadline
              delay={0.05}
              className="text-balance text-[clamp(2rem,4.2vw,4rem)] font-medium leading-[0.85] tracking-tight"
            >
              Six contract types. One streaming primitive.
            </RevealHeadline>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: easeOutExpo, delay: 0.18 }}
              className="mt-6 max-w-[60ch] text-xl font-light leading-snug text-foreground/60"
            >
              Each use case is a live Daml contract — not a mockup. Every flow
              was tested against Canton 3.4.11 with real token movements between
              four parties.
            </motion.p>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {USE_CASES.map((uc, i) => (
            <motion.article
              key={uc.title}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: easeOutExpo, delay: 0.1 + i * 0.08 }}
              className={`group relative rounded-2xl border border-foreground/[0.07] bg-gradient-to-br ${uc.bg} to-transparent p-8 hover:border-foreground/[0.14] transition-colors duration-500`}
            >
              <div className={`mb-4 ${uc.color}`}>{uc.icon}</div>
              <span className="font-mono text-xs text-foreground/35 uppercase tracking-widest">
                {uc.tag}
              </span>
              <h3 className="mt-2 text-lg font-medium tracking-tight">{uc.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-foreground/55">{uc.body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
