'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Waves, Play, Pause, Square, ArrowDownToLine, RefreshCw,
  CheckCircle, AlertCircle, LayoutDashboard, GitBranch,
  Users, Clock, Trophy, Coins, ChevronRight, Activity,
} from 'lucide-react';

type PartyName = 'Alice' | 'Bob' | 'Carol' | 'Admin';
type Tab = 'dashboard' | 'streams' | 'pool' | 'vesting' | 'milestones';

interface CContract {
  contractId: string;
  templateId: string;
  shortName: string;
  payload: Record<string, unknown>;
}

const S = (s: unknown) => String(s ?? '');
const N = (s: unknown) => parseFloat(S(s)) || 0;
const shortParty = (id: string) => id.split('::')[0];
const fmtGROW = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(2)}k` : n.toFixed(4);
const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }); } catch { return s; } };

function calcAccrual(p: Record<string, unknown>, now: Date): number {
  if (S(p.status) !== 'Active') return 0;
  const elapsed = (now.getTime() - new Date(S(p.lastUpdate)).getTime()) / 1000;
  const available = N(p.deposited) - N(p.withdrawn);
  return Math.max(0, Math.min(N(p.flowRate) * elapsed, available));
}

function fmtRemaining(p: Record<string, unknown>, now: Date): string {
  if (S(p.status) !== 'Active') return S(p.status);
  const rem = N(p.deposited) - N(p.withdrawn) - calcAccrual(p, now);
  const rate = N(p.flowRate);
  if (rem <= 0) return 'Depleted';
  if (rate === 0) return '∞';
  const s = rem / rate;
  if (s > 86400) return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
  if (s > 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`;
}

async function queryAll(party: PartyName): Promise<CContract[]> {
  const res = await fetch('/api/canton/query', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ party }),
  });
  const d = await res.json();
  return (d.result ?? []) as CContract[];
}

async function doExercise(party: PartyName, templateId: string, contractId: string, choice: string, argument: Record<string, unknown> = {}) {
  const res = await fetch('/api/canton/exercise', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ party, templateId, contractId, choice, argument }),
  });
  return res.json();
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    Active:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    Paused:  'bg-amber-500/15  text-amber-400  border-amber-500/25',
    Stopped: 'bg-red-500/15    text-red-400    border-red-500/25',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cfg[status] ?? cfg.Stopped}`}>{status}</span>;
}

const CARD = 'rounded-xl border border-white/[0.07] bg-white/[0.03] p-5';
const BTN = (color: string) => `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-40 ${color}`;

function DashboardTab({ contracts, now }: { contracts: CContract[]; now: Date }) {
  const streams  = contracts.filter(c => c.shortName === 'StreamAgreement');
  const pools    = contracts.filter(c => c.shortName === 'StreamPool');
  const vestings = contracts.filter(c => c.shortName === 'VestingStream');
  const miles    = contracts.filter(c => c.shortName === 'MilestoneStream');
  const tokens   = contracts.filter(c => c.shortName === 'GrowToken');
  const totalGROW = tokens.reduce((sum, c) => sum + N(c.payload.amount), 0);
  const totalAccruing = streams.filter(c => S(c.payload.status) === 'Active').reduce((sum, c) => sum + calcAccrual(c.payload, now), 0);

  const stats = [
    { label: 'Active Streams',      value: streams.filter(c => S(c.payload.status) === 'Active').length,  icon: <Activity className="w-5 h-5" />,   color: 'text-cyan-400',    bg: 'from-cyan-500/10'   },
    { label: 'StreamPool Members',  value: pools.reduce((s, c) => s + ((c.payload.memberStates as unknown[]) ?? []).length, 0), icon: <Users className="w-5 h-5" />,     color: 'text-purple-400',  bg: 'from-purple-500/10' },
    { label: 'Vesting Schedules',   value: vestings.length,                                                icon: <Clock className="w-5 h-5" />,      color: 'text-blue-400',    bg: 'from-blue-500/10'   },
    { label: 'Milestone Streams',   value: miles.length,                                                   icon: <Trophy className="w-5 h-5" />,     color: 'text-amber-400',   bg: 'from-amber-500/10'  },
    { label: 'GROW Balance',        value: `${fmtGROW(totalGROW)} GROW`,                                   icon: <Coins className="w-5 h-5" />,      color: 'text-emerald-400', bg: 'from-emerald-500/10'},
    { label: 'Accruing Now',        value: `${fmtGROW(totalAccruing)} GROW`,                               icon: <GitBranch className="w-5 h-5" />, color: 'text-rose-400',    bg: 'from-rose-500/10'   },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map(s => (
          <div key={s.label} className={`${CARD} bg-gradient-to-br ${s.bg} to-transparent`}>
            <div className={`${s.color} mb-3`}>{s.icon}</div>
            <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-gray-500 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className={CARD}>
        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> Live Contract Activity
        </h3>
        {contracts.length === 0 ? (
          <p className="text-gray-600 text-sm py-6 text-center">No contracts visible — try a different party</p>
        ) : (
          <div className="space-y-2">
            {contracts.slice(0, 8).map(c => (
              <div key={c.contractId} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-sm text-gray-300">{c.shortName}</span>
                  {Boolean(c.payload.status) && <StatusBadge status={S(c.payload.status)} />}
                </div>
                <span className="text-xs text-gray-600 font-mono">{c.contractId.slice(0, 16)}…</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StreamsTab({ contracts, party, now, onAction }: {
  contracts: CContract[]; party: PartyName; now: Date;
  onAction: (label: string, fn: () => Promise<unknown>) => void;
}) {
  const streams = contracts.filter(c => c.shortName === 'StreamAgreement');

  if (streams.length === 0) return (
    <div className={`${CARD} text-center py-16`}>
      <Waves className="w-10 h-10 mx-auto mb-3 text-gray-700" />
      <p className="text-gray-500">No streams visible for {party}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {streams.map(c => {
        const p = c.payload;
        const accrued = calcAccrual(p, now);
        const totalOut = N(p.withdrawn) + accrued;
        const pct = N(p.deposited) > 0 ? Math.min((totalOut / N(p.deposited)) * 100, 100) : 0;
        const isActive = S(p.status) === 'Active';
        const isPaused = S(p.status) === 'Paused';
        const tpl = 'StreamCore:StreamAgreement';
        const receiver = shortParty(S(p.receiver));

        return (
          <div key={c.contractId} className={CARD}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-semibold">Stream #{S(p.streamId)}</span>
                  <StatusBadge status={S(p.status)} />
                </div>
                <p className="text-xs text-gray-500 font-mono">
                  {shortParty(S(p.sender))} <ChevronRight className="w-3 h-3 inline" /> {shortParty(S(p.receiver))}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Flow Rate</p>
                <p className="text-xl font-bold text-cyan-400 tabular-nums">{parseFloat(S(p.flowRate)).toFixed(2)}<span className="text-sm text-gray-500"> GROW/s</span></p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Deposited',   val: `${fmtGROW(N(p.deposited))} GROW`, c: 'text-white'        },
                { label: 'Withdrawn',   val: `${fmtGROW(N(p.withdrawn))} GROW`, c: 'text-gray-300'     },
                { label: 'Accrued Now', val: `${fmtGROW(accrued)} GROW`,         c: 'text-cyan-400'     },
                { label: 'Remaining',   val: fmtRemaining(p, now),               c: isActive ? 'text-emerald-400' : 'text-amber-400' },
              ].map(s => (
                <div key={s.label} className="bg-black/20 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                  <p className={`text-sm font-semibold tabular-nums ${s.c}`}>{s.val}</p>
                </div>
              ))}
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Streamed</span><span>{pct.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${pct}%`, background: isActive ? 'linear-gradient(90deg,#06b6d4,#22d3ee)' : isPaused ? '#d97706' : '#ef4444' }} />
              </div>
            </div>

            <p className="text-xs text-gray-700 font-mono mb-3 truncate">{c.contractId.slice(0, 56)}…</p>

            <div className="flex gap-2 flex-wrap">
              {party === receiver && isActive && accrued > 0.001 && (
                <button className={BTN('bg-cyan-600 hover:bg-cyan-500 text-white')}
                  onClick={() => onAction('Withdraw', () => doExercise(party, tpl, c.contractId, 'Withdraw'))}>
                  <ArrowDownToLine className="w-3.5 h-3.5" /> Withdraw {fmtGROW(accrued)} GROW
                </button>
              )}
              {party === 'Alice' && isActive && (
                <button className={BTN('bg-amber-600/80 hover:bg-amber-500 text-white')}
                  onClick={() => onAction('Pause', () => doExercise(party, tpl, c.contractId, 'Pause'))}>
                  <Pause className="w-3.5 h-3.5" /> Pause
                </button>
              )}
              {party === 'Alice' && isPaused && (
                <button className={BTN('bg-emerald-600/80 hover:bg-emerald-500 text-white')}
                  onClick={() => onAction('Resume', () => doExercise(party, tpl, c.contractId, 'Resume'))}>
                  <Play className="w-3.5 h-3.5" /> Resume
                </button>
              )}
              {party === 'Alice' && S(p.status) !== 'Stopped' && (
                <button className={BTN('bg-red-700/70 hover:bg-red-600 text-white')}
                  onClick={() => { if (confirm('Stop permanently?')) onAction('Stop', () => doExercise(party, tpl, c.contractId, 'Stop')); }}>
                  <Square className="w-3.5 h-3.5" /> Stop
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PoolTab({ contracts, party, onAction }: {
  contracts: CContract[]; party: PartyName;
  onAction: (label: string, fn: () => Promise<unknown>) => void;
}) {
  const pools = contracts.filter(c => c.shortName === 'StreamPool');
  if (pools.length === 0) return (
    <div className={`${CARD} text-center py-16`}>
      <Users className="w-10 h-10 mx-auto mb-3 text-gray-700" />
      <p className="text-gray-500">No StreamPool contracts visible for {party}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {pools.map(c => {
        const p = c.payload;
        const members = (p.memberStates as Array<Record<string, unknown>>) ?? [];
        const totalUnits = members.reduce((s, m) => s + N(m.units), 0);
        return (
          <div key={c.contractId} className={CARD}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-lg font-semibold">Pool #{S(p.poolId)}</p>
                <p className="text-xs text-gray-500">Admin: {shortParty(S(p.admin))}</p>
              </div>
              <StatusBadge status={S(p.status)} />
            </div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Total Rate',    val: `${parseFloat(S(p.totalRate)).toFixed(2)} GROW/s` },
                { label: 'Deposited',     val: `${fmtGROW(N(p.deposited))} GROW` },
                { label: 'Distributed',   val: `${fmtGROW(N(p.totalWithdrawn))} GROW` },
              ].map(s => (
                <div key={s.label} className="bg-black/20 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                  <p className="text-sm font-semibold text-purple-300 tabular-nums">{s.val}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Members</p>
            <div className="space-y-2">
              {members.map((m, i) => {
                const share = totalUnits > 0 ? (N(m.units) / totalUnits) * 100 : 0;
                const mName = shortParty(S(m.party));
                const isMe = party === mName;
                return (
                  <div key={i} className="flex items-center justify-between bg-black/20 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-300">{mName[0]}</div>
                      <div>
                        <p className="text-sm font-medium">{mName} {isMe && <span className="text-xs text-purple-400">(you)</span>}</p>
                        <p className="text-xs text-gray-600">{share.toFixed(1)}% share · withdrawn {fmtGROW(N(m.withdrawn))} GROW</p>
                      </div>
                    </div>
                    {isMe && S(p.status) === 'Active' && (
                      <button className={BTN('bg-purple-600/80 hover:bg-purple-500 text-white text-xs')}
                        onClick={() => onAction('WithdrawMember', () => doExercise(party, 'StreamPool:StreamPool', c.contractId, 'WithdrawMember', { member: S(m.party) }))}>
                        <ArrowDownToLine className="w-3 h-3" /> Withdraw
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VestingTab({ contracts, party, onAction }: {
  contracts: CContract[]; party: PartyName;
  onAction: (label: string, fn: () => Promise<unknown>) => void;
}) {
  const vestings = contracts.filter(c => c.shortName === 'VestingStream');
  if (vestings.length === 0) return (
    <div className={`${CARD} text-center py-16`}>
      <Clock className="w-10 h-10 mx-auto mb-3 text-gray-700" />
      <p className="text-gray-500">No VestingStream contracts visible for {party}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {vestings.map(c => {
        const p = c.payload;
        const now = Date.now();
        const cliff = new Date(S(p.cliffTime)).getTime();
        const end = new Date(S(p.vestingEnd)).getTime();
        const pastCliff = now >= cliff;
        const vestFrac = end > cliff ? Math.min(Math.max((now - cliff) / (end - cliff), 0), 1) : 0;
        const vestedAmt = N(p.totalAmount) * vestFrac;
        const claimed = N(p.withdrawn ?? 0);
        const claimable = vestedAmt - claimed;
        const receiver = shortParty(S(p.receiver));

        return (
          <div key={c.contractId} className={CARD}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-lg font-semibold">Vesting #{S(p.vestingId)}</p>
                <p className="text-xs text-gray-500">{shortParty(S(p.sender))} → {receiver}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs border ${pastCliff ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-gray-500/15 text-gray-400 border-gray-500/25'}`}>
                {pastCliff ? 'Cliff Reached' : 'Pre-Cliff'}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Total',     val: `${fmtGROW(N(p.totalAmount))} GROW` },
                { label: 'Vested',    val: `${fmtGROW(vestedAmt)} GROW`        },
                { label: 'Claimed',   val: `${fmtGROW(claimed)} GROW`           },
                { label: 'Claimable', val: `${fmtGROW(Math.max(0, claimable))} GROW` },
              ].map(s => (
                <div key={s.label} className="bg-black/20 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                  <p className="text-sm font-semibold text-blue-300 tabular-nums">{s.val}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4 text-xs text-gray-500">
              <div>Cliff: <span className="text-gray-300">{fmtDate(S(p.cliffTime))}</span></div>
              <div>End: <span className="text-gray-300">{fmtDate(S(p.vestingEnd))}</span></div>
            </div>
            <div className="h-1.5 w-full bg-white/[0.05] rounded-full mb-4">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${vestFrac * 100}%` }} />
            </div>
            {party === receiver && pastCliff && claimable > 0.001 && (
              <button className={BTN('bg-blue-600/80 hover:bg-blue-500 text-white')}
                onClick={() => onAction('VestingWithdraw', () => doExercise(party, 'VestingStream:VestingStream', c.contractId, 'VestingWithdraw'))}>
                <ArrowDownToLine className="w-3.5 h-3.5" /> Claim {fmtGROW(claimable)} GROW
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MilestonesTab({ contracts, party, onAction }: {
  contracts: CContract[]; party: PartyName;
  onAction: (label: string, fn: () => Promise<unknown>) => void;
}) {
  const mileStreams = contracts.filter(c => c.shortName === 'MilestoneStream');
  if (mileStreams.length === 0) return (
    <div className={`${CARD} text-center py-16`}>
      <Trophy className="w-10 h-10 mx-auto mb-3 text-gray-700" />
      <p className="text-gray-500">No MilestoneStream contracts visible for {party}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {mileStreams.map(c => {
        const p = c.payload;
        const milestones = (p.milestones as Array<Record<string, unknown>>) ?? [];
        const done = milestones.filter(m => m.done === true).length;
        const sender = shortParty(S(p.sender));
        const receiver = shortParty(S(p.receiver));
        return (
          <div key={c.contractId} className={CARD}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-lg font-semibold">Milestone #{S(p.milestoneId)}</p>
                <p className="text-xs text-gray-500">{sender} → {receiver}</p>
              </div>
              <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-full">{done}/{milestones.length} done</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-black/20 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Total Deposited</p>
                <p className="text-sm font-semibold text-amber-300 tabular-nums">{fmtGROW(N(p.deposited))} GROW</p>
              </div>
              <div className="bg-black/20 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Progress</p>
                <p className="text-sm font-semibold text-amber-300">{milestones.length > 0 ? Math.round((done / milestones.length) * 100) : 0}%</p>
              </div>
            </div>
            <div className="space-y-2">
              {milestones.map((m, i) => (
                <div key={i} className={`flex items-center justify-between rounded-lg px-4 py-3 border ${m.done ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-black/20 border-white/[0.04]'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${m.done ? 'bg-emerald-500 text-white' : 'border border-gray-600 text-gray-600'}`}>
                      {m.done ? <CheckCircle className="w-3 h-3" /> : <span className="text-xs">{i + 1}</span>}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${m.done ? 'line-through text-gray-500' : ''}`}>{S(m.name)}</p>
                      <p className="text-xs text-gray-600">{fmtGROW(N(m.amount))} GROW</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {party === 'Admin' && !m.done && (
                      <button className={BTN('bg-amber-600/70 hover:bg-amber-500 text-white text-xs')}
                        onClick={() => onAction('ConfirmMilestone', () => doExercise('Admin', 'MilestoneStream:MilestoneStream', c.contractId, 'ConfirmMilestone', { milestoneName: S(m.name) }))}>
                        Confirm
                      </button>
                    )}
                    {m.done === true && (
                      <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">Token sent</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [party, setParty]       = useState<PartyName>('Alice');
  const [tab, setTab]           = useState<Tab>('dashboard');
  const [contracts, setContracts] = useState<CContract[]>([]);
  const [loading, setLoading]   = useState(true);
  const [flash, setFlash]       = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [acting, setActing]     = useState(false);
  const [now, setNow]           = useState(new Date());

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setContracts(await queryAll(party)); }
    catch (e) { setFlash({ type: 'err', text: e instanceof Error ? e.message : 'Fetch failed' }); }
    finally { setLoading(false); }
  }, [party]);

  useEffect(() => { refresh(); }, [refresh]);

  const onAction = useCallback((label: string, fn: () => Promise<unknown>) => {
    setActing(true);
    fn().then((r) => {
      const ok = (r as Record<string,unknown>).ok !== false;
      setFlash({ type: ok ? 'ok' : 'err', text: ok ? `${label} submitted on-chain` : `${label} failed: ${JSON.stringify((r as Record<string,unknown>).data ?? r)}` });
      if (ok) setTimeout(refresh, 1500);
    }).catch(e => setFlash({ type: 'err', text: String(e) }))
      .finally(() => { setActing(false); setTimeout(() => setFlash(null), 5000); });
  }, [refresh]);

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard',  label: 'Dashboard',  icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'streams',    label: 'Streams',    icon: <Waves className="w-4 h-4" /> },
    { id: 'pool',       label: 'Pool',       icon: <Users className="w-4 h-4" /> },
    { id: 'vesting',    label: 'Vesting',    icon: <Clock className="w-4 h-4" /> },
    { id: 'milestones', label: 'Milestones', icon: <Trophy className="w-4 h-4" /> },
  ];

  const PARTIES: PartyName[] = ['Alice', 'Bob', 'Carol', 'Admin'];

  return (
    <main className="min-h-screen" style={{ background: 'linear-gradient(160deg, #080c1e 0%, #0c1130 60%, #080c1e 100%)' }}>
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Waves className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">GrowStreams</h1>
              <p className="text-xs text-gray-500">Canton Network · Daml SDK 3.4.11</p>
            </div>
            <span className="hidden md:block px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-xs rounded-full border border-cyan-500/20">Live on LocalNet</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-xs font-medium">:7575</span>
            </div>
            <button onClick={refresh} disabled={loading || acting}
              className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-gray-400 hover:text-white transition-colors disabled:opacity-40">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Party Selector ── */}
        <div className="flex gap-2 mb-5">
          {PARTIES.map(p => (
            <button key={p} onClick={() => setParty(p)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${party === p ? 'bg-cyan-600 text-white' : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.07] border border-white/[0.06]'}`}>
              {p}
            </button>
          ))}
        </div>

        {/* ── Flash ── */}
        {flash && (
          <div className={`mb-4 px-4 py-3 rounded-lg flex items-center gap-2 text-sm ${flash.type === 'ok' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
            {flash.type === 'ok' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span className="truncate">{flash.text}</span>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-5 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${tab === t.id ? 'bg-cyan-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              {t.icon} <span className="hidden sm:block">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="text-center py-20">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3 text-cyan-500/60" />
            <p className="text-gray-500 text-sm">Querying Canton ledger…</p>
          </div>
        ) : (
          <>
            {tab === 'dashboard'  && <DashboardTab contracts={contracts} now={now} />}
            {tab === 'streams'    && <StreamsTab    contracts={contracts} party={party} now={now} onAction={onAction} />}
            {tab === 'pool'       && <PoolTab        contracts={contracts} party={party} onAction={onAction} />}
            {tab === 'vesting'    && <VestingTab     contracts={contracts} party={party} onAction={onAction} />}
            {tab === 'milestones' && <MilestonesTab  contracts={contracts} party={party} onAction={onAction} />}
          </>
        )}

        {/* ── Footer ── */}
        <div className="mt-10 pt-5 border-t border-white/[0.05] flex items-center justify-between text-xs text-gray-700">
          <span>GrowStreams · Canton Dev Fund · 31/31 tests passing</span>
          <span>Daml SDK 3.4.11 · {contracts.length} contracts loaded</span>
        </div>
      </div>
    </main>
  );
}
