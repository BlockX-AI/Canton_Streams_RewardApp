"use client";

import Link from "next/link";
import { ArrowChip } from "@/components/arrow-chip";
import type { ReactNode } from "react";

const PROTOCOL_LINKS = [
  { label: "Protocol",     href: "#product" },
  { label: "Features",     href: "#pillars" },
  { label: "FAQ",          href: "#faq" },
];

const COMMUNITY_LINKS = [
  { label: "CCTools Campaign", href: "https://www.cctools.network/earn/growstreams-x-cctools" },
  { label: "Live Product",     href: "https://growstreams.xyz" },
  { label: "Twitter / X",      href: "https://x.com/GrowwStreams" },
  { label: "GitHub",           href: "https://github.com/BlockX-AI" },
];

const RESOURCES_LINKS = [
  { label: "Canton Proposal",  href: "#milestones" },
  { label: "Evidence Folder",  href: "https://github.com/BlockX-AI/GrowStreams" },
  { label: "Daml SDK 3.4.11",  href: "https://docs.daml.com" },
  { label: "CIP-56 Standard",  href: "#protocol" },
  { label: "CIP-103 dApp API", href: "#protocol" },
];

export function Footer(): ReactNode {
  return (
    <footer
      id="contact"
      className="min-[851px]:sticky min-[851px]:bottom-0 z-0 bg-background text-foreground flex flex-col"
    >
      <div className="mx-auto w-full max-w-[1680px] px-6 lg:px-10 pt-24 lg:pt-32">
        <span className="inline-flex items-center rounded-md border border-foreground/[0.08] px-3.5 py-1.5 font-mono text-xs uppercase tracking-widest text-foreground/70">
          Get in touch
        </span>
        <div className="mt-6 text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-medium tracking-tighter leading-[0.95] max-w-5xl">
          <p className="block">Build on Canton.</p>
          <p className="block text-foreground/55">Stream every obligation.</p>
        </div>
        <div className="mt-12">
          <Link
            href="https://x.com/GrowwStreams"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-stretch gap-1"
          >
            <span className="px-5 py-3 rounded-md bg-foreground text-background text-xs font-medium tracking-widest uppercase">
              @GrowwStreams
            </span>
            <ArrowChip className="bg-foreground text-background" />
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1680px] px-6 lg:px-10 mt-24 lg:mt-32 py-16 lg:py-20 grid grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
        <div className="col-span-2 lg:col-span-4">
          <Link href="/" className="inline-flex items-center gap-3 text-xl font-medium tracking-tight">
            <span
              aria-hidden
              className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500"
            />
            GrowStreams
          </Link>
          <p className="mt-4 text-foreground/55 max-w-xs leading-relaxed">
            Privacy-native payment streaming for Canton Network. On-ledger,
            private, deterministic. 66 tests passing today.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-foreground/40">66/66 tests · Canton 3.4.11</span>
          </div>
        </div>

        <FooterColumn title="Protocol"   links={PROTOCOL_LINKS} />
        <FooterColumn title="Community"  links={COMMUNITY_LINKS} external />
        <FooterColumn title="Resources"  links={RESOURCES_LINKS} />
      </div>

      <div className="mt-auto">
        <div className="mx-auto w-full max-w-[1680px] px-6 lg:px-10 py-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between text-sm text-foreground/55">
          <p>© 2025 BlockX AI Ltd. Open-source under Apache 2.0.</p>
          <div className="flex items-center gap-6 font-mono text-xs">
            <span className="text-foreground/30">GrowStreams · Canton Dev Fund Proposal</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

interface FooterColumnProps {
  title: string;
  links: ReadonlyArray<{ label: string; href: string }>;
  external?: boolean;
}

function FooterColumn({ title, links, external }: FooterColumnProps): ReactNode {
  return (
    <div className="col-span-1 lg:col-span-2">
      <h4 className="font-mono text-xs uppercase tracking-widest text-foreground/55 mb-5">
        {title}
      </h4>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="text-foreground/85 hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
