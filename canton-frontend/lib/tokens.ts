// Frontend token registry — mirrors api/src/config/tokens.mjs
// Provides token metadata, decimal conversion, and flow rate utilities

export interface TokenConfig {
  key: string;
  symbol: string;
  name: string;
  decimals: number;
  contractId: string;
  icon: string;
  category: 'stablecoin' | 'volatile' | 'native' | 'utility';
  isStablecoin: boolean;
  minBuffer: number;
  color: string;         // Tailwind color class for UI
  colorAccent: string;   // For backgrounds/rings
  comingSoon?: boolean;
  // Legacy alias kept for compatibility with code referencing tok.vara
  vara: string;
}

export const SUPPORTED_TOKENS: Record<string, TokenConfig> = {
  CC: {
    key: 'CC',
    symbol: 'CC',
    name: 'Canton Coin',
    decimals: 10,
    contractId: 'canton::token::cc',
    vara: 'canton::token::cc',
    icon: '/tokens/cc.svg',
    category: 'native',
    isStablecoin: false,
    minBuffer: 3600,
    color: 'text-emerald-400',
    colorAccent: 'emerald',
  },
  USDCx: {
    key: 'USDCx',
    symbol: 'USDCx',
    name: 'USD Coin (Canton)',
    decimals: 6,
    contractId: 'canton::token::usdcx',
    vara: 'canton::token::usdcx',
    icon: '/tokens/usdc.svg',
    category: 'stablecoin',
    isStablecoin: true,
    minBuffer: 3600,
    color: 'text-blue-400',
    colorAccent: 'blue',
  },
};

// ─── Lookup helpers ──────────────────────────────────────────

export function getToken(symbolOrKey: string): TokenConfig | null {
  if (!symbolOrKey) return null;
  const upper = symbolOrKey.toUpperCase();
  if (SUPPORTED_TOKENS[upper]) return SUPPORTED_TOKENS[upper];
  for (const tok of Object.values(SUPPORTED_TOKENS)) {
    if (tok.symbol.toUpperCase() === upper) return tok;
  }
  return null;
}

export function getTokenByVaraAddress(addressOrContractId: string): TokenConfig | null {
  if (!addressOrContractId) return null;
  const lower = addressOrContractId.toLowerCase();
  for (const tok of Object.values(SUPPORTED_TOKENS)) {
    if (tok.vara.toLowerCase() === lower || tok.contractId.toLowerCase() === lower) return tok;
  }
  return null;
}

export function listTokens(): TokenConfig[] {
  return Object.values(SUPPORTED_TOKENS);
}

export function listStablecoins(): TokenConfig[] {
  return listTokens().filter(t => t.isStablecoin);
}

export function listStreamableTokens(): TokenConfig[] {
  return listTokens().filter(t => !t.comingSoon);
}

// ─── Decimal conversion ──────────────────────────────────────

export function toBaseUnits(amount: string | number, decimals: number): bigint {
  const str = String(amount).trim();
  if (!str || str === '0') return BigInt(0);

  const negative = str.startsWith('-');
  const abs = negative ? str.slice(1) : str;
  const [intPart, fracPart = ''] = abs.split('.');
  const paddedFrac = fracPart.padEnd(decimals, '0').slice(0, decimals);
  const combined = (intPart || '0') + paddedFrac;
  const cleaned = combined.replace(/^0+/, '') || '0';
  const result = BigInt(cleaned);
  return negative ? -result : result;
}

export function toDisplayUnits(baseUnits: string | bigint | number, decimals: number): string {
  if (baseUnits == null) return '0';
  const val = BigInt(baseUnits);
  if (val === BigInt(0)) return '0';

  const negative = val < BigInt(0);
  const abs = negative ? -val : val;
  const str = abs.toString().padStart(decimals + 1, '0');
  const intPart = str.slice(0, str.length - decimals) || '0';
  const fracPart = str.slice(str.length - decimals);
  const trimmedFrac = fracPart.replace(/0+$/, '');
  const result = trimmedFrac ? `${intPart}.${trimmedFrac}` : intPart;
  return negative ? `-${result}` : result;
}

export function formatDisplayAmount(baseUnits: string | bigint | number, decimals: number, maxFrac = 6): string {
  const display = toDisplayUnits(baseUnits, decimals);
  const num = parseFloat(display);
  if (isNaN(num) || num === 0) return '0';
  if (Math.abs(num) >= 0.0001) {
    const frac = Math.abs(num) >= 1_000_000 ? 2 : Math.abs(num) >= 1 ? Math.min(maxFrac, 4) : Math.min(maxFrac, 6);
    return fmtNumber(num, frac);
  }
  return '< 0.0001';
}

/** Format a display-unit number string with proper decimal formatting */
export function fmtDisplay(displayValue: string | number, maxFrac = 4): string {
  const num = typeof displayValue === 'string' ? parseFloat(displayValue) : displayValue;
  if (isNaN(num) || num === 0) return '0';
  const frac = Math.abs(num) >= 1_000_000 ? 2 : Math.abs(num) >= 1 ? maxFrac : 6;
  return fmtNumber(num, frac);
}

/** Format number with dot thousand separators and comma decimal separator */
function fmtNumber(num: number, maxFrac: number): string {
  const parts = num.toFixed(maxFrac).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const fracPart = parts[1] ? parts[1].replace(/0+$/, '') : '';
  return fracPart ? `${intPart},${fracPart}` : intPart;
}

// ─── Flow rate helpers ───────────────────────────────────────

export const INTERVALS: Record<string, number> = {
  second: 1,
  minute: 60,
  hour: 3600,
  day: 86400,
  week: 604800,
  month: 2592000,  // 30 days
  year: 31536000,  // 365 days
};

export const INTERVAL_LABELS: Record<string, string> = {
  second: '/sec',
  minute: '/min',
  hour: '/hr',
  day: '/day',
  week: '/wk',
  month: '/mo',
  year: '/yr',
};

export function flowRatePerInterval(
  baseFlowRatePerSecond: string | bigint,
  decimals: number,
  interval: string = 'month',
): string {
  const multiplier = BigInt(INTERVALS[interval] || 1);
  const perInterval = BigInt(baseFlowRatePerSecond) * multiplier;
  return toDisplayUnits(perInterval, decimals);
}

export function flowRateFromInterval(
  amountPerInterval: string | number,
  decimals: number,
  interval: string = 'month',
): bigint {
  const baseTotal = toBaseUnits(amountPerInterval, decimals);
  const divisor = BigInt(INTERVALS[interval] || 1);
  return baseTotal / divisor;
}

export function formatFlowRate(
  baseFlowRatePerSecond: string | bigint,
  decimals: number,
  interval: string = 'month',
): string {
  const display = flowRatePerInterval(baseFlowRatePerSecond, decimals, interval);
  const num = parseFloat(display);
  if (isNaN(num) || num === 0) return `0${INTERVAL_LABELS[interval] || ''}`;
  const suffix = INTERVAL_LABELS[interval] || '';
  if (num >= 1000) return `${fmtNumber(num, 2)}${suffix}`;
  if (num >= 1) return `${fmtNumber(num, 4)}${suffix}`;
  if (num >= 0.0001) return `${fmtNumber(num, 6)}${suffix}`;
  return `< 0.0001${suffix}`;
}

export function calculateMinDeposit(baseFlowRatePerSecond: string | bigint, minBufferSeconds = 3600): bigint {
  return BigInt(baseFlowRatePerSecond) * BigInt(minBufferSeconds);
}

export function calculateBufferSeconds(remainingDeposit: string | bigint, baseFlowRatePerSecond: string | bigint): number {
  const rate = BigInt(baseFlowRatePerSecond);
  if (rate === BigInt(0)) return Infinity;
  return Number(BigInt(remainingDeposit) / rate);
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return 'Depleted';
  if (!isFinite(seconds)) return '\u221e';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.floor(seconds)}s`;
}

export function truncAddress(addr: string): string {
  if (!addr || addr.length < 16) return addr || '\u2014';
  return addr.slice(0, 8) + '...' + addr.slice(-6);
}
