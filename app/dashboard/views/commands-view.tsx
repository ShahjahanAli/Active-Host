"use client";

import { useDashboard } from "../dashboard-context";
import { statusBadge, timeAgo, inputCls, btnPrimary, btnSecondary, IconRefresh } from "../shared";

export function CommandsView() {
  const {
    hosts, selectedHostId, setSelectedHostId,
    commands, selectedCommand, selectedCommandId, setSelectedCommandId,
    commandInput, setCommandInput,
    onQueueCommand, loadCommands,
    status, copyText,
  } = useDashboard();

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Control panel */}
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Run Command</h2>

          <div className="mb-3">
            <label className="mb-1.5 block text-xs text-slate-500">Target host</label>
            <select
              value={selectedHostId}
              onChange={(e) => setSelectedHostId(e.target.value)}
              className={inputCls}
            >
              <option value="">Select a host…</option>
              {hosts.map((h) => (
                <option key={h._id} value={h._id}>
                  {h.name} ({h.agentStatus === "online" ? "●" : "○"} {h.agentStatus})
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="mb-1.5 block text-xs text-slate-500">Command</label>
            <input
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void onQueueCommand(); }}
              placeholder="e.g. df -h"
              className={inputCls + " font-mono"}
            />
          </div>

          <div className="mb-4 flex flex-wrap gap-1.5">
            {["uname -a", "df -h", "uptime", "free -m", "ps aux", "netstat -tlnp"].map((cmd) => (
              <button
                key={cmd}
                onClick={() => setCommandInput(cmd)}
                className="rounded border border-slate-700 px-2 py-1 text-[11px] font-mono text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
              >
                {cmd}
              </button>
            ))}
          </div>

          <button onClick={() => void onQueueCommand()} disabled={!selectedHostId} className={btnPrimary + " w-full"}>
            Queue command
          </button>

          {status && (
            <p className="mt-3 rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2 text-xs text-slate-400">
              {status}
            </p>
          )}
        </div>

        {/* Selected command output */}
        {selectedCommand && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white">Command Output</h2>
              <div className="flex items-center gap-2">
                {(selectedCommand.status === "running" || selectedCommand.status === "queued") && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400 ring-1 ring-inset ring-amber-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Live
                  </span>
                )}
                {statusBadge(selectedCommand.status)}
              </div>
            </div>
            <p className="text-xs font-mono text-slate-500 mb-3 truncate">{selectedCommand.command}</p>
            {selectedCommand.error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400 mb-3">
                {selectedCommand.error}
              </div>
            )}
            {selectedCommand.output ? (
              <div className="relative">
                <pre className="max-h-64 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs leading-relaxed text-slate-300 font-mono whitespace-pre-wrap">
                  {selectedCommand.output}
                </pre>
                <button
                  onClick={() => void copyText(selectedCommand.output ?? "")}
                  className="absolute right-2 top-2 rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400 hover:text-white transition"
                >
                  Copy
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-600 italic">No output yet.</p>
            )}
          </div>
        )}
      </div>

      {/* History table */}
      <div className="lg:col-span-3 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Command History</h2>
          <button
            onClick={() => void (selectedHostId && loadCommands(selectedHostId))}
            className={btnSecondary + " flex items-center gap-1.5 text-xs"}
          >
            <IconRefresh />
            Refresh
          </button>
        </div>
        {commands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl mb-3">📋</span>
            <p className="text-slate-400 text-sm">No commands yet for this host.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800">
                  {["Time", "Command", "Status", "Error"].map((h) => (
                    <th key={h} className="pb-3 pr-4 font-medium text-slate-500 uppercase tracking-wide text-[10px]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {commands.map((cmd) => (
                  <tr
                    key={cmd._id}
                    onClick={() => setSelectedCommandId(cmd._id)}
                    className={`cursor-pointer transition hover:bg-slate-800/30 ${
                      selectedCommandId === cmd._id ? "bg-indigo-500/5" : ""
                    }`}
                  >
                    <td className="py-2.5 pr-4 text-slate-500 whitespace-nowrap">
                      {cmd.createdAt ? timeAgo(cmd.createdAt) : "-"}
                    </td>
                    <td className="py-2.5 pr-4 max-w-xs">
                      <code className="text-slate-300 truncate block">{cmd.command}</code>
                    </td>
                    <td className="py-2.5 pr-4">{statusBadge(cmd.status)}</td>
                    <td className="py-2.5 max-w-xs text-slate-500 truncate">{cmd.error || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
