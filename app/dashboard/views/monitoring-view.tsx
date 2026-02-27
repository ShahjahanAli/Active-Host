"use client";

import { useDashboard, HostMetrics } from "../dashboard-context";
import { agentDot, fmtBytes, fmtUptime, inputCls, btnSecondary, IconRefresh } from "../shared";

/* ─── Resource bar ───────────────────────────────────────────────── */
function ResourceBar({ label, pct, color, sub }: { label: string; pct: number; color: string; sub?: string }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-400">{label}</span>
        <span className={`text-xs font-semibold ${clamped >= 90 ? "text-red-400" : clamped >= 70 ? "text-amber-400" : "text-slate-300"}`}>
          {clamped.toFixed(1)}%
          {sub ? <span className="font-normal text-slate-600 ml-1">{sub}</span> : null}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

/* ─── Sparkline charts (pure SVG) ────────────────────────────────── */
function Sparkline({ data, stroke, gradId, maxVal }: { data: number[]; stroke: string; gradId: string; maxVal?: number }) {
  if (data.length < 2) return <div className="flex h-14 items-center justify-center text-xs text-slate-600">Collecting…</div>;
  const W = 400, H = 56, PAD = 4;
  const max = maxVal ?? Math.max(...data, 1);
  const toX = (i: number) => (i / (data.length - 1)) * W;
  const toY = (v: number) => H - PAD - ((v / max) * (H - PAD * 2));
  const pts = data.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 56 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill={`url(#${gradId})`} />
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={toX(data.length - 1)} cy={toY(data[data.length - 1])} r="3" fill={stroke} />
    </svg>
  );
}

function SparklineDual({
  dataA, dataB, strokeA, strokeB, gradIdA, gradIdB, maxVal,
}: {
  dataA: number[]; dataB: number[]; strokeA: string; strokeB: string;
  gradIdA: string; gradIdB: string; maxVal?: number;
}) {
  if (dataA.length < 2 && dataB.length < 2)
    return <div className="flex h-14 items-center justify-center text-xs text-slate-600">Collecting…</div>;
  const W = 400, H = 56, PAD = 4;
  const max = maxVal ?? Math.max(...dataA, ...dataB, 1);
  const toX = (i: number, len: number) => len <= 1 ? 0 : (i / (len - 1)) * W;
  const toY = (v: number) => H - PAD - ((v / max) * (H - PAD * 2));
  const ptsA = dataA.map((v, i) => `${toX(i, dataA.length)},${toY(v)}`).join(" ");
  const ptsB = dataB.map((v, i) => `${toX(i, dataB.length)},${toY(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 56 }}>
      <defs>
        <linearGradient id={gradIdA} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeA} stopOpacity="0.20" />
          <stop offset="100%" stopColor={strokeA} stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id={gradIdB} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeB} stopOpacity="0.15" />
          <stop offset="100%" stopColor={strokeB} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {dataA.length >= 2 && <polygon points={`0,${H} ${ptsA} ${W},${H}`} fill={`url(#${gradIdA})`} />}
      {dataB.length >= 2 && <polygon points={`0,${H} ${ptsB} ${W},${H}`} fill={`url(#${gradIdB})`} />}
      {dataA.length >= 2 && <polyline points={ptsA} fill="none" stroke={strokeA} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />}
      {dataB.length >= 2 && <polyline points={ptsB} fill="none" stroke={strokeB} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />}
      {dataA.length >= 2 && <circle cx={toX(dataA.length - 1, dataA.length)} cy={toY(dataA[dataA.length - 1])} r="3" fill={strokeA} />}
      {dataB.length >= 2 && <circle cx={toX(dataB.length - 1, dataB.length)} cy={toY(dataB[dataB.length - 1])} r="3" fill={strokeB} />}
    </svg>
  );
}

function mAvg(arr: number[]) { return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0; }

/* ─── Main view ──────────────────────────────────────────────────── */
export function MonitoringView() {
  const {
    hosts, selectedHostId, setSelectedHostId,
    hostMetrics, metricsHistory, metricsLoading,
    refreshInterval, setRefreshInterval,
    loadHostMetrics, sseAlive, selectedHost,
  } = useDashboard();

  const cpuHistory   = metricsHistory.map((m) => m.cpu.usagePercent);
  const memHistory   = metricsHistory.map((m) => m.memory.usagePercent);
  const diskHistory  = metricsHistory.map((m) => m.disks[0]?.usagePercent ?? 0);
  const netRxHistory = metricsHistory.map((m) => m.network.reduce((s, n) => s + n.rxBytesPerSec, 0));
  const netTxHistory = metricsHistory.map((m) => m.network.reduce((s, n) => s + n.txBytesPerSec, 0));
  const maxNet = Math.max(...netRxHistory, ...netTxHistory, 1);

  const healthScore = hostMetrics
    ? Math.round(
        (100 - hostMetrics.cpu.usagePercent) * 0.35 +
        (100 - hostMetrics.memory.usagePercent) * 0.35 +
        (hostMetrics.disks.length > 0
          ? (100 - hostMetrics.disks.reduce((s, d) => s + d.usagePercent, 0) / hostMetrics.disks.length) * 0.30
          : 30),
      )
    : null;
  const healthColor = healthScore == null ? "" : healthScore >= 80 ? "#34d399" : healthScore >= 60 ? "#fbbf24" : "#f87171";
  const healthLabel = healthScore == null ? "" : healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Good" : healthScore >= 50 ? "Fair" : "Critical";

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48">
          <select
            value={selectedHostId}
            onChange={(e) => setSelectedHostId(e.target.value)}
            className={inputCls}
          >
            <option value="">Select a host to monitor…</option>
            {hosts.map((h) => (
              <option key={h._id} value={h._id}>{h.name} — {h.address}</option>
            ))}
          </select>
        </div>
        {selectedHostId && (
          <>
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-2 text-xs text-slate-400">
              <span>Interval:</span>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-transparent text-slate-300 outline-none cursor-pointer"
              >
                {[5, 15, 30, 60, 120].map((s) => (
                  <option key={s} value={s}>{s}s</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => void loadHostMetrics(selectedHostId)}
              disabled={metricsLoading}
              className={btnSecondary + " flex items-center gap-1.5"}
            >
              <IconRefresh spinning={metricsLoading} />
              Refresh
            </button>
            <span className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] ${
              sseAlive ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400" : "border-slate-700 text-slate-600"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${sseAlive ? "bg-emerald-400 animate-pulse" : "bg-slate-700"}`} />
              {sseAlive ? "SSE Live" : "SSE off"}
            </span>
          </>
        )}
      </div>

      {/* Empty states */}
      {!selectedHostId ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 py-20 text-center">
          <span className="text-4xl mb-3">📡</span>
          <p className="text-slate-400">Select a host to view its metrics.</p>
          <p className="text-xs text-slate-600 mt-1">Metrics are pushed by the agent every {refreshInterval}s.</p>
        </div>
      ) : !hostMetrics ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 py-20 text-center">
          <span className="text-4xl mb-3">{metricsLoading ? "⏳" : "📭"}</span>
          <p className="text-slate-400">{metricsLoading ? "Loading metrics…" : "No metrics yet for this host."}</p>
          <p className="text-xs text-slate-600 mt-1">The agent must be running to push metrics.</p>
        </div>
      ) : (
        <>
          {/* Health banner */}
          {healthScore !== null && (() => {
            const r = 28, circ = 2 * Math.PI * r;
            const dash = (Math.max(0, Math.min(100, healthScore)) / 100) * circ;
            return (
              <div className="flex flex-wrap items-center gap-5 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="relative flex-shrink-0">
                  <svg width="72" height="72" viewBox="0 0 72 72">
                    <circle cx="36" cy="36" r={r} fill="none" stroke="#1e293b" strokeWidth="5" />
                    <circle cx="36" cy="36" r={r} fill="none" stroke={healthColor} strokeWidth="5"
                      strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                      transform="rotate(-90 36 36)"
                      style={{ transition: "stroke-dasharray 0.8s ease" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold" style={{ color: healthColor }}>{healthScore}</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">System Health</p>
                  <p className="text-lg font-semibold" style={{ color: healthColor }}>{healthLabel}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {metricsHistory.length} snapshot{metricsHistory.length !== 1 ? "s" : ""} · last {new Date(hostMetrics.collectedAt).toLocaleTimeString()}
                  </p>
                </div>
                <div className="ml-auto flex flex-wrap gap-3">
                  {[
                    { label: "CPU",       val: `${hostMetrics.cpu.usagePercent.toFixed(0)}%`,    warn: hostMetrics.cpu.usagePercent > 80 },
                    { label: "RAM",       val: `${hostMetrics.memory.usagePercent.toFixed(0)}%`, warn: hostMetrics.memory.usagePercent > 80 },
                    { label: "Uptime",    val: fmtUptime(hostMetrics.uptimeSeconds),              warn: false },
                    { label: "Processes", val: hostMetrics.activeProcesses ? String(hostMetrics.activeProcesses) : "—", warn: false },
                    { label: "Load",      val: hostMetrics.load.avg1.toFixed(2),                 warn: hostMetrics.load.avg1 > hostMetrics.cpu.count },
                  ].map((chip) => (
                    <div key={chip.label} className={`rounded-lg border px-3 py-1.5 text-center ${chip.warn ? "border-red-500/30 bg-red-500/5" : "border-slate-700 bg-slate-800/40"}`}>
                      <p className={`text-xs font-semibold ${chip.warn ? "text-red-400" : "text-slate-200"}`}>{chip.val}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{chip.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* History charts */}
          <div className="grid gap-5 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">CPU over time</p>
                  <p className="text-xl font-bold text-indigo-400 mt-0.5">{hostMetrics.cpu.usagePercent.toFixed(1)}%</p>
                </div>
                {hostMetrics.cpu.usagePercent > 80 && (
                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400 ring-1 ring-inset ring-red-500/20">HIGH</span>
                )}
              </div>
              <Sparkline data={cpuHistory} stroke="#6366f1" gradId="spark-cpu" maxVal={100} />
              <div className="mt-2 flex justify-between text-[10px] text-slate-600">
                {cpuHistory.length > 1 ? (
                  <><span>Min {Math.min(...cpuHistory).toFixed(0)}%</span><span>Avg {mAvg(cpuHistory).toFixed(0)}%</span><span>Max {Math.max(...cpuHistory).toFixed(0)}%</span></>
                ) : <span>{cpuHistory.length} snapshot</span>}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Memory over time</p>
                  <p className="text-xl font-bold text-violet-400 mt-0.5">{hostMetrics.memory.usagePercent.toFixed(1)}%</p>
                </div>
                {hostMetrics.memory.usagePercent > 80 && (
                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400 ring-1 ring-inset ring-red-500/20">HIGH</span>
                )}
              </div>
              <Sparkline data={memHistory} stroke="#8b5cf6" gradId="spark-mem" maxVal={100} />
              <div className="mt-2 flex justify-between text-[10px] text-slate-600">
                {memHistory.length > 1 ? (
                  <><span>Min {Math.min(...memHistory).toFixed(0)}%</span><span>Avg {mAvg(memHistory).toFixed(0)}%</span><span>Max {Math.max(...memHistory).toFixed(0)}%</span></>
                ) : <span>{memHistory.length} snapshot</span>}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Network throughput</p>
                  <p className="text-xl font-bold text-emerald-400 mt-0.5">
                    ↓ {netRxHistory.length ? fmtBytes(netRxHistory[netRxHistory.length - 1]) : "0 B"}/s
                  </p>
                </div>
              </div>
              <SparklineDual
                dataA={netRxHistory} dataB={netTxHistory}
                strokeA="#34d399" strokeB="#6366f1"
                gradIdA="spark-rx" gradIdB="spark-tx"
                maxVal={maxNet}
              />
              <div className="mt-2 flex justify-between text-[10px]">
                <span className="text-emerald-500">↓ RX {netRxHistory.length ? fmtBytes(netRxHistory[netRxHistory.length - 1]) : "—"}/s</span>
                <span className="text-indigo-400">↑ TX {netTxHistory.length ? fmtBytes(netTxHistory[netTxHistory.length - 1]) : "—"}/s</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Disk over time</p>
                  <p className="text-xl font-bold text-cyan-400 mt-0.5">
                    {hostMetrics.disks[0] ? `${hostMetrics.disks[0].usagePercent.toFixed(1)}%` : "—"}
                  </p>
                </div>
                {(hostMetrics.disks[0]?.usagePercent ?? 0) > 85 && (
                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400 ring-1 ring-inset ring-red-500/20">HIGH</span>
                )}
              </div>
              <Sparkline data={diskHistory} stroke="#22d3ee" gradId="spark-disk" maxVal={100} />
              <div className="mt-2 flex justify-between text-[10px] text-slate-600">
                {diskHistory.length > 1 ? (
                  <><span>Min {Math.min(...diskHistory).toFixed(0)}%</span><span>Avg {mAvg(diskHistory).toFixed(0)}%</span><span>Max {Math.max(...diskHistory).toFixed(0)}%</span></>
                ) : <span>{diskHistory.length} snapshot</span>}
              </div>
            </div>
          </div>

          {/* Current resource gauges */}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">CPU</p>
                  <p className="text-2xl font-bold text-indigo-400 mt-1">{hostMetrics.cpu.usagePercent.toFixed(1)}%</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-indigo-500/30 bg-indigo-500/5">
                  <span className="text-xl">🖥️</span>
                </div>
              </div>
              <ResourceBar label="Usage" pct={hostMetrics.cpu.usagePercent} color="bg-indigo-500" />
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                <span>Cores: <span className="text-slate-300">{hostMetrics.cpu.count}</span></span>
                <span className="truncate" title={hostMetrics.cpu.model}>
                  Model: <span className="text-slate-300">{hostMetrics.cpu.model.split(" ").slice(0, 3).join(" ")}</span>
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Memory</p>
                  <p className="text-2xl font-bold text-violet-400 mt-1">{hostMetrics.memory.usagePercent.toFixed(1)}%</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-violet-500/30 bg-violet-500/5">
                  <span className="text-xl">💾</span>
                </div>
              </div>
              <ResourceBar label="Usage" pct={hostMetrics.memory.usagePercent} color="bg-violet-500"
                sub={`${fmtBytes(hostMetrics.memory.usedBytes)} / ${fmtBytes(hostMetrics.memory.totalBytes)}`}
              />
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                <span>Used: <span className="text-slate-300">{fmtBytes(hostMetrics.memory.usedBytes)}</span></span>
                <span>Free: <span className="text-slate-300">{fmtBytes(hostMetrics.memory.freeBytes)}</span></span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Disk</p>
                  <p className="text-2xl font-bold text-cyan-400 mt-1">
                    {hostMetrics.disks[0] ? `${hostMetrics.disks[0].usagePercent.toFixed(1)}%` : "—"}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-cyan-500/30 bg-cyan-500/5">
                  <span className="text-xl">💿</span>
                </div>
              </div>
              {hostMetrics.disks.length === 0 ? (
                <p className="text-xs text-slate-600 italic">No disk data.</p>
              ) : (
                hostMetrics.disks.map((disk) => (
                  <ResourceBar key={disk.mount} label={disk.mount} pct={disk.usagePercent} color="bg-cyan-500"
                    sub={`${fmtBytes(disk.usedBytes)} / ${fmtBytes(disk.totalBytes)}`}
                  />
                ))
              )}
            </div>
          </div>

          {/* Load averages + system info */}
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Load Averages</h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "1 min",  val: hostMetrics.load.avg1,  warn: hostMetrics.load.avg1  > hostMetrics.cpu.count },
                  { label: "5 min",  val: hostMetrics.load.avg5,  warn: hostMetrics.load.avg5  > hostMetrics.cpu.count },
                  { label: "15 min", val: hostMetrics.load.avg15, warn: hostMetrics.load.avg15 > hostMetrics.cpu.count },
                ].map((a) => (
                  <div key={a.label} className="rounded-lg border border-slate-800 bg-slate-800/40 p-3 text-center">
                    <p className={`text-xl font-bold ${a.warn ? "text-red-400" : "text-emerald-400"}`}>{a.val.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wide">{a.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <ResourceBar
                  label={`Load vs capacity (${hostMetrics.cpu.count} cores)`}
                  pct={(hostMetrics.load.avg1 / hostMetrics.cpu.count) * 100}
                  color={hostMetrics.load.avg1 > hostMetrics.cpu.count ? "bg-red-500" : "bg-emerald-500"}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <h2 className="text-sm font-semibold text-white mb-4">System Information</h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                {[
                  { label: "Hostname",    val: selectedHost?.name ?? "—" },
                  { label: "Address",     val: selectedHost?.address ?? "—" },
                  { label: "Environment", val: selectedHost?.environment ?? "—" },
                  { label: "Uptime",      val: fmtUptime(hostMetrics.uptimeSeconds) },
                  { label: "CPU cores",   val: String(hostMetrics.cpu.count) },
                  { label: "Total RAM",   val: fmtBytes(hostMetrics.memory.totalBytes) },
                  { label: "Processes",   val: hostMetrics.activeProcesses ? String(hostMetrics.activeProcesses) : "—" },
                  { label: "Last update", val: new Date(hostMetrics.collectedAt).toLocaleTimeString() },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="text-slate-600">{item.label}</dt>
                    <dd className="text-slate-300 mt-0.5 truncate">{item.val}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Network interfaces table */}
          {hostMetrics.network.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Network Interfaces</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {["Interface", "IP Address", "RX Total", "TX Total", "↓ RX /s", "↑ TX /s"].map((h) => (
                        <th key={h} className="pb-3 pr-5 text-[10px] font-medium uppercase tracking-wide text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {hostMetrics.network.map((iface) => (
                      <tr key={iface.interface} className="hover:bg-slate-800/20 transition">
                        <td className="py-2.5 pr-5 font-mono text-slate-300">{iface.interface}</td>
                        <td className="py-2.5 pr-5 text-slate-400">{iface.address ?? "—"}</td>
                        <td className="py-2.5 pr-5 text-slate-400">{iface.rxBytes ? fmtBytes(iface.rxBytes) : "—"}</td>
                        <td className="py-2.5 pr-5 text-slate-400">{iface.txBytes ? fmtBytes(iface.txBytes) : "—"}</td>
                        <td className="py-2.5 pr-5">
                          {iface.rxBytesPerSec > 0
                            ? <span className="text-emerald-400">{fmtBytes(iface.rxBytesPerSec)}/s</span>
                            : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="py-2.5">
                          {iface.txBytesPerSec > 0
                            ? <span className="text-indigo-400">{fmtBytes(iface.txBytesPerSec)}/s</span>
                            : <span className="text-slate-600">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
