"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

const ease = [0.23, 1, 0.32, 1] as const

function HamburgerIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <div className="w-5 h-4 relative flex flex-col justify-between cursor-pointer">
      <motion.span
        className="block h-0.5 w-full origin-center rounded-full bg-white"
        animate={isOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.25, ease }}
      />
      <motion.span
        className="block h-0.5 w-full origin-center rounded-full bg-white"
        animate={isOpen ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.15 }}
      />
      <motion.span
        className="block h-0.5 w-full origin-center rounded-full bg-white"
        animate={isOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.25, ease }}
      />
    </div>
  )
}

export function NavigationV2({ currentPage = "home" }: { currentPage?: string }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  void currentPage

  return (
    <>
      {/* Frosted blur gradient layer */}
      <div
        className="fixed top-0 left-0 w-full h-24 z-40 pointer-events-none"
        style={{
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          maskImage: "linear-gradient(black 0%, black 40%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(black 0%, black 40%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      {/* Desktop */}
      <header className="hidden md:block fixed top-0 left-0 right-0 z-50 mix-blend-exclusion">
        <div className="mx-auto flex h-20 w-full items-center justify-between px-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease }}
          >
            <Link href="/wallet" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
                <span className="text-black text-xs font-bold leading-none">S</span>
              </div>
              <span className="text-xl font-semibold tracking-tight text-white">Smile</span>
            </Link>
          </motion.div>

        </div>
      </header>

      {/* Mobile */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 mix-blend-exclusion">
        <div className="flex h-16 w-full items-center justify-between px-6">
          <Link href="/wallet" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
              <span className="text-black text-[10px] font-bold leading-none">S</span>
            </div>
            <span className="text-lg font-semibold text-white">Smile</span>
          </Link>
          <button
            className="p-2 -mr-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            <HamburgerIcon isOpen={mobileOpen} />
          </button>
        </div>
      </header>

      {/* Mobile full-screen menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-50 bg-neutral-950"
          >
            <div className="flex h-16 items-center justify-between px-6">
              <Link
                href="/wallet"
                className="flex items-center gap-2"
                onClick={() => setMobileOpen(false)}
              >
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
                  <span className="text-black text-[10px] font-bold leading-none">S</span>
                </div>
                <span className="text-lg font-semibold text-white">Smile</span>
              </Link>
              <button className="p-2 -mr-2" onClick={() => setMobileOpen(false)}>
                <HamburgerIcon isOpen={true} />
              </button>
            </div>

            <nav className="px-6 pt-4">
              <Link
                href="/wallet"
                onClick={() => setMobileOpen(false)}
                className="block py-5 text-2xl font-semibold text-white border-b border-white/10"
              >
                Wallet
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
