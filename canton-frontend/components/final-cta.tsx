"use client";

import { motion, useInView } from "motion/react";
import { useRef, type ReactNode } from "react";
import { ArrowChip } from "@/components/arrow-chip";
import { ShaderCanvas } from "@/components/shader-canvas";
import Link from "next/link";

const easeOutExpo = [0.33, 1, 0.68, 1] as const;

const HEADLINE_LINES = ["The future of", "institutional rewards."] as const;

export function FinalCta(): ReactNode {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.35 });

  return (
    <section
      ref={sectionRef}
      id="get-started"
      className="relative w-full bg-background text-foreground"
    >
      <div className="max-w-[1680px] mx-auto px-6 lg:px-10 pb-28 lg:pb-36">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, ease: easeOutExpo }}
          className="relative overflow-hidden rounded-3xl min-h-[520px] max-[850px]:min-h-[420px]"
          style={{ background: "#040e1a" }}
        >
          <div aria-hidden className="absolute inset-0">
            <ShaderCanvas />
          </div>

          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/10"
          />

          <div className="relative h-full flex flex-col justify-between p-14 max-[850px]:p-8 min-h-[inherit] text-white">
            <motion.h2
              className="max-w-[16ch] text-[clamp(2.5rem,6vw,5.5rem)] font-medium leading-[0.95] tracking-tight"
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              transition={{ staggerChildren: 0.12, delayChildren: 0.15 }}
            >
              {HEADLINE_LINES.map((line) => (
                <span key={line} className="block overflow-hidden pb-[0.05em]">
                  <motion.span
                    className="block will-change-transform"
                    variants={{ hidden: { y: "110%" }, visible: { y: "0%" } }}
                    transition={{ duration: 1, ease: easeOutExpo }}
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
            </motion.h2>

            <div className="flex items-end justify-between gap-8 max-[850px]:flex-col max-[850px]:items-start mt-10">
              <motion.p
                className="max-w-xl text-2xl max-[850px]:text-base font-light tracking-tight leading-snug text-white/70"
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, ease: easeOutExpo, delay: 0.6 }}
              >
                Canton Network is built for institutional finance. Stream Rewards
                brings continuous payment streaming to regulated contributors —
                compliant, private, and automated.
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-3 shrink-0"
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, ease: easeOutExpo, delay: 0.7 }}
              >
                <Link href="/campaigns" className="group inline-flex items-stretch gap-1">
                  <span className="px-5 py-3 rounded-md bg-white text-neutral-900 text-xs font-medium tracking-widest uppercase border border-neutral-900/[0.08]">
                    View Campaigns
                  </span>
                  <ArrowChip className="bg-white text-neutral-900" name="cta" />
                </Link>
                <Link
                  href="/claim"
                  className="group inline-flex items-stretch gap-1"
                >
                  <span className="px-5 py-3 rounded-md border border-white/25 text-white text-xs font-medium tracking-widest uppercase hover:border-white/50 transition-colors">
                    Claim Rewards
                  </span>
                  <ArrowChip className="border border-white/25 text-white" name="cta" />
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
