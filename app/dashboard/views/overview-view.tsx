"use client";

import { useDashboard } from "../dashboard-context";
import { agentDot, fmtUptime, statusBadge, timeAgo, btnSecondary } from "../shared";

export function OverviewView() {
  const {
    hosts, selectedHost, hostMetrics, commands,
    counters, navigate, setSelectedHostId,
    setSelectedCommandId,
  } = useDashboard();

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Hosts",    value: counters.totalHosts,
            color: "text-indigo-400",  border: "border-indigo-500/20",  bg: "bg-indigo-500/5",  icon: "🖥️",
            sub: `${counters.onlineHosts} on / ${counters.offlineHosts} off`,
          },
          {
            label: "Online Agents",  value: counters.onlineHosts,
            color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/5", icon: "🟢",
            sub: counters.totalHosts > 0 ? `${Math.round((counters.onlineHosts / counters.totalHosts) * 100)}% availability` : "—",
          },
          {
            label: "Offline Agents", value: counters.offlineHosts,
            color: counters.offlineHosts > 0 ? "text-red-400" : "text-slate-400",
            border: counters.offlineHosts > 0 ? "border-red-500/20" : "border-slate-700",
            bg: counters.offlineHosts > 0 ? "bg-red-500/5" : "bg-slate-800/30", icon: "⚫",
            sub: counters.offlineHosts > 0 ? "needs attention" : "all healthy",
          },
          {
            label: "Active Commands", value: counters.runningCommands,
            color: "text-amber-400",   border: "border-amber-500/20",   bg: "bg-amber-500/5",   icon: "⚡",
            sub: `${counters.completedCommands} completed`,
          },
        ].map((card) => (
          <div key={card.label} className={`rounded-xl border ${card.border} ${card.bg} p-5`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">{card.label}</p>
                <p className={`mt-2 text-3xl font-bold ${card.color}`}>{card.value}</p>
                <p className="mt-1 text-[11px] text-slate-500">{card.sub}</p>
              </div>
              <span className="text-2xl">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Live metrics strip */}
      {hostMetrics && selectedHost && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-5 py-3.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mr-1">Live:</span>
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            {agentDot(selectedHost.agentStatus)}
            <span className="font-medium text-slate-200">{selectedHost.name}</span>
          </span>
          <span className="h-4 w-px bg-slate-800" />
          {[
            { label: "CPU",  val: `${hostMetrics.cpu.usagePercent.toFixed(0)}%`,    warn: hostMetrics.cpu.usagePercent > 80 },
            { label: "RAM",  val: `${hostMetrics.memory.usagePercent.toFixed(0)}%`, warn: hostMetrics.memory.usagePercent > 80 },
            { label: "Disk", val: hostMetrics.disks[0] ? `${hostMetrics.disks[0].usagePercent.toFixed(0)}%` : "—", warn: (hostMetrics.disks[0]?.usagePercent ?? 0) > 85 },
            { label: "Load", val: hostMetrics.load.avg1.toFixed(2), warn: hostMetrics.load.avg1 > hostMetrics.cpu.count },
            { label: "Up",   val: fmtUptime(hostMetrics.uptimeSeconds), warn: false },
          ].map((chip) => (
            <span
              key={chip.label}
              className={`rounded-md border px-2 py-0.5 text-[11px] ${
                chip.warn ? "border-red-500/30 bg-red-500/5 text-red-400" : "border-slate-800 bg-slate-800/40 text-slate-300"
              }`}
            >
              <span className="text-slate-500">{chip.label} </span>{chip.val}
            </span>
          ))}
          <button onClick={() => navigate("monitoring")} className="ml-auto text-xs text-indigo-400 hover:text-indigo-300">
            Full monitoring →
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Host status panel */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Host Fleet</h2>
            <button onClick={() => navigate("hosts")} className="text-xs text-indigo-400 hover:text-indigo-300">
              View all →
            </button>
          </div>
          {hosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="text-3xl mb-2">🖥️</span>
              <p className="text-sm text-slate-500">No hosts yet</p>
              <button onClick={() => navigate("hosts")} className="mt-3 text-xs text-indigo-400 hover:text-indigo-300">
                Add a host →
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {hosts.slice(0, 6).map((host) => (
                <li
                  key={host._id}
                  onClick={() => { setSelectedHostId(host._id); navigate("hosts"); }}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-800 bg-slate-800/30 px-3 py-2.5 transition hover:border-slate-700 hover:bg-slate-800/60"
                >
                  {agentDot(host.agentStatus)}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-200">{host.name}</p>
                    <p className="truncate text-xs text-slate-500">{host.address}</p>
                  </div>
                  <span className={`text-[10px] rounded-full px-2 py-0.5 ${host.environment === "production" ? "bg-rose-500/10 text-rose-400" : "bg-slate-800 text-slate-500"}`}>
                    {host.environment}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent commands */}
        <div className="lg:col-span-3 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent Commands</h2>
            <button onClick={() => navigate("commands")} className="text-xs text-indigo-400 hover:text-indigo-300">
              View all →
            </button>
          </div>
          {commands.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="text-3xl mb-2">📋</span>
              <p className="text-sm text-slate-500">No commands run yet</p>
              <button onClick={() => navigate("commands")} className="mt-3 text-xs text-indigo-400 hover:text-indigo-300">
                Run a command →
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {commands.slice(0, 6).map((cmd) => (
                <li
                  key={cmd._id}
                  onClick={() => { setSelectedCommandId(cmd._id); navigate("commands"); }}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-800 bg-slate-800/30 px-3 py-2.5 transition hover:border-slate-700 hover:bg-slate-800/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-mono text-slate-300">{cmd.command}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{cmd.createdAt ? timeAgo(cmd.createdAt) : "—"}</p>
                  </div>
                  {statusBadge(cmd.status)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="mb-4 text-sm font-semibold text-white">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "🖥️ Add Host",     view: "hosts"       as const, needsHost: false },
            { label: "⌨️ Run Command",  view: "commands"    as const, needsHost: true  },
            { label: "📊 Monitoring",   view: "monitoring"  as const, needsHost: true  },
            { label: "🐳 Docker",       view: "docker"      as const, needsHost: true  },
            { label: "🌐 Nginx",        view: "nginx"       as const, needsHost: true  },
            { label: "🛡️ Firewall",    view: "firewall"    as const, needsHost: true  },
            { label: "🔐 SSH Keys",     view: "ssh"         as const, needsHost: true  },
            { label: "🚀 Deploy App",   view: "apps"        as const, needsHost: true  },
          ].map((a) => (
            <button
              key={a.view}
              onClick={() => navigate(a.view)}
              disabled={a.needsHost && !selectedHost}
              className={btnSecondary + " flex items-center gap-2 text-xs"}
            >
              {a.label}
            </button>
          ))}
        </div>
        {!selectedHost && (
          <p className="mt-3 text-[11px] text-slate-600">
            Select a host from the Hosts panel to enable host-specific actions.
          </p>
        )}
      </div>
    </div>
  );
}
