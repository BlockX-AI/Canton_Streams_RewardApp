export function FooterV2() {
  return (
    <footer className="relative w-full overflow-hidden border-t border-white/10">
      <div className="mx-auto max-w-4xl px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
            <span className="text-black text-[10px] font-bold leading-none">S</span>
          </div>
          <span className="text-sm font-semibold text-white/70">Smile</span>
        </div>

        <p className="text-xs text-white/30">
          &copy; {new Date().getFullYear()} Smile Wallet. Built on Canton Network.
        </p>

        <div className="flex items-center gap-1.5 text-xs text-white/30">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          Canton DevNet
        </div>
      </div>
    </footer>
  )
}
