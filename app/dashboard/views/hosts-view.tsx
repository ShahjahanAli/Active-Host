"use client";

import { useDashboard } from "../dashboard-context";
import { agentDot, statusBadge, inputCls, btnPrimary, btnSecondary } from "../shared";

export function HostsView() {
  const {
    hosts, selectedHostId, setSelectedHostId,
    counters, onCreateHost, setDeletingHostId,
    navigate,
  } = useDashboard();

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Create form */}
      <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Register New Host</h2>
        <form onSubmit={(e) => void onCreateHost(e)} className="space-y-3">
          <input name="name"    placeholder="Host name"           className={inputCls} required />
          <input name="address" placeholder="Address (IP / FQDN)" className={inputCls} required />
          <select name="environment" className={inputCls} defaultValue="production">
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </select>
          <input name="tags" placeholder="Tags (comma-separated)" className={inputCls} />
          <button type="submit" className={btnPrimary + " w-full"}>Create host</button>
        </form>
      </div>

      {/* Host list */}
      <div className="lg:col-span-3 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="text-sm font-semibold text-white mb-4">
          Your Hosts{" "}
          <span className="ml-1.5 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
            {counters.totalHosts}
          </span>
        </h2>
        {hosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-4xl mb-3">🖥️</span>
            <p className="text-slate-400">No hosts yet. Create your first one.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {hosts.map((host) => (
              <li
                key={host._id}
                className={`rounded-xl border transition ${
                  selectedHostId === host._id
                    ? "border-indigo-500/50 bg-indigo-500/5"
                    : "border-slate-800 bg-slate-800/30 hover:border-slate-700 hover:bg-slate-800/60"
                }`}
              >
                <div
                  className="flex items-start gap-3 px-4 pt-3.5 pb-2.5 cursor-pointer"
                  onClick={() => setSelectedHostId(host._id)}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pt-0.5">
                    {agentDot(host.agentStatus)}
                    <span className="font-medium text-slate-200 truncate">{host.name}</span>
                    <span
                      className={`text-[10px] rounded-full px-2 py-0.5 flex-shrink-0 ${
                        host.environment === "production"
                          ? "bg-rose-500/10 text-rose-400"
                          : host.environment === "staging"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {host.environment}
                    </span>
                  </div>
                  {statusBadge(host.agentStatus)}
                </div>
                <p className="px-4 pb-2 text-xs text-slate-500">{host.address}</p>
                {host.tags.length > 0 && (
                  <div className="px-4 pb-2.5 flex flex-wrap gap-1">
                    {host.tags.map((tag) => (
                      <span key={tag} className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-500">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 border-t border-slate-800/60 px-4 py-2">
                  <button
                    onClick={() => { setSelectedHostId(host._id); navigate("monitoring"); }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition"
                  >
                    📊 Monitor
                  </button>
                  <button
                    onClick={() => { setSelectedHostId(host._id); navigate("commands"); }}
                    className="text-[11px] text-slate-500 hover:text-slate-300 transition"
                  >
                    ⌨️ Commands
                  </button>
                  <button
                    onClick={() => { setSelectedHostId(host._id); navigate("docker"); }}
                    className="text-[11px] text-slate-500 hover:text-slate-300 transition"
                  >
                    🐳 Docker
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeletingHostId(host._id); }}
                    className="ml-auto text-[11px] text-slate-600 hover:text-red-400 transition"
                  >
                    🗑 Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
