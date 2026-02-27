"use client";

import { useDashboard } from "../dashboard-context";
import { agentDot, inputCls, btnPrimary, btnSecondary } from "../shared";

export function KeysView() {
  const {
    hosts, selectedHostId, setSelectedHostId, selectedHost,
    lastApiKey, linuxSnippet, windowsSnippet,
    onGenerateKey, copyText, status,
  } = useDashboard();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Host selector + key gen */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Select Host &amp; Generate Key</h2>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs text-slate-500">Host</label>
          <select
            value={selectedHostId}
            onChange={(e) => setSelectedHostId(e.target.value)}
            className={inputCls}
          >
            <option value="">Select a host…</option>
            {hosts.map((h) => (
              <option key={h._id} value={h._id}>{h.name} — {h.address}</option>
            ))}
          </select>
        </div>

        {selectedHost && (
          <div className="mb-4 rounded-lg border border-slate-800 bg-slate-800/40 p-4 text-xs space-y-2">
            <div className="grid grid-cols-2 gap-2 text-slate-400">
              <span className="text-slate-600">Name</span>        <span>{selectedHost.name}</span>
              <span className="text-slate-600">Address</span>     <span>{selectedHost.address}</span>
              <span className="text-slate-600">Environment</span> <span>{selectedHost.environment}</span>
              <span className="text-slate-600">Status</span>
              <span className="flex items-center gap-1">
                {agentDot(selectedHost.agentStatus)} {selectedHost.agentStatus}
              </span>
            </div>
            <div className="pt-1 border-t border-slate-700">
              <span className="text-slate-600 block mb-1">Agent ID</span>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate text-slate-300">{selectedHost.agentId}</code>
                <button
                  onClick={() => void copyText(selectedHost.agentId)}
                  className={btnSecondary + " text-xs py-1 px-2"}
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => void onGenerateKey()}
          disabled={!selectedHostId}
          className={btnPrimary + " w-full"}
        >
          Generate API key
        </button>

        {lastApiKey && (
          <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-xs text-amber-400 mb-2 flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              Shown once — copy immediately
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all text-xs text-slate-300">{lastApiKey}</code>
              <button
                onClick={() => void copyText(lastApiKey)}
                className={btnSecondary + " text-xs py-1 px-2 flex-shrink-0"}
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {status && <p className="mt-3 text-xs text-slate-500">{status}</p>}
      </div>

      {/* Install snippets */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Agent Install Snippets</h2>
        <div className="space-y-4">
          {[
            { label: "Linux / macOS",        snippet: linuxSnippet },
            { label: "Windows PowerShell",   snippet: windowsSnippet },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-800 bg-slate-900/80 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
                <span className="text-xs font-medium text-slate-400">{item.label}</span>
                <button
                  onClick={() => void copyText(item.snippet)}
                  className={btnSecondary + " py-1 px-2.5 text-[11px]"}
                >
                  Copy
                </button>
              </div>
              <pre className="max-h-48 overflow-auto p-4 text-[11px] leading-relaxed text-slate-400 font-mono whitespace-pre-wrap">
                {item.snippet}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
