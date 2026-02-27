"use client";

import { useState, useCallback } from "react";
import { runAgentCommand } from "../run-agent-command";

type Cls = { inputCls: string; btnPrimary: string; btnSecondary: string };

type Container = {
  ID: string; Names: string; Image: string;
  Status: string; State: string; Ports: string;
};

type Image = {
  Repository: string; Tag: string;
  Size: string; CreatedSince: string;
};

/* ─── Containers tab  ──────────────────────────────────────────── */
function ContainersTab({ hostId, cls }: { hostId: string; cls: Cls }) {
  const { inputCls, btnPrimary, btnSecondary } = cls;
  const [loading, setLoading]     = useState(false);
  const [containers, setContainers] = useState<Container[]>([]);
  const [logs, setLogs]           = useState("");
  const [logsFor, setLogsFor]     = useState("");
  const [output, setOutput]       = useState("");
  const [pullImage, setPullImage] = useState("");

  const loadContainers = useCallback(async () => {
    setLoading(true);
    const fmt = '{"ID":"{{.ID}}","Names":"{{.Names}}","Image":"{{.Image}}","Status":"{{.Status}}","State":"{{.State}}","Ports":"{{.Ports}}"}';
    const r = await runAgentCommand(hostId, `docker ps -a --format '${fmt}' 2>/dev/null || echo '{"error":"docker not found"}'`);
    const parsed: Container[] = [];
    for (const line of r.output.split("\n")) {
      try {
        const obj = JSON.parse(line.trim());
        if (!obj.error) parsed.push(obj as Container);
      } catch { /* skip */ }
    }
    setContainers(parsed);
    setOutput(parsed.length === 0 ? r.output : "");
    setLoading(false);
  }, [hostId]);

  const containerAction = async (name: string, action: "start" | "stop" | "restart" | "rm") => {
    setLoading(true);
    const r = await runAgentCommand(hostId, `docker ${action} ${name} 2>&1`);
    setOutput(r.output);
    await loadContainers();
    setLoading(false);
  };

  const fetchLogs = async (name: string) => {
    setLogsFor(name);
    setLoading(true);
    const r = await runAgentCommand(hostId, `docker logs --tail 100 ${name} 2>&1`);
    setLogs(r.output);
    setLoading(false);
  };

  const pullImg = async () => {
    if (!pullImage.trim()) return;
    setLoading(true);
    const r = await runAgentCommand(hostId, `docker pull ${pullImage.trim()} 2>&1`, 120_000);
    setOutput(r.output);
    await loadContainers();
    setLoading(false);
  };

  const stateColor = (state: string) => {
    if (state === "running") return "bg-emerald-500/15 text-emerald-400 ring-emerald-500/20";
    if (state === "exited")  return "bg-red-500/15 text-red-400 ring-red-500/20";
    if (state === "paused")  return "bg-amber-500/15 text-amber-400 ring-amber-500/20";
    return "bg-slate-500/15 text-slate-400 ring-slate-500/20";
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button onClick={loadContainers} disabled={loading} className={`${btnSecondary} flex items-center gap-1.5`}>
          {loading ? "⏳" : "🐳"} Refresh
        </button>
        <div className="flex gap-2 ml-auto">
          <input value={pullImage} onChange={(e) => setPullImage(e.target.value)}
            placeholder="Pull image (e.g. nginx:latest)" className={`${inputCls} w-48`} />
          <button onClick={() => void pullImg()} disabled={loading || !pullImage} className={btnPrimary}>Pull</button>
        </div>
      </div>

      {containers.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800">
                  {["Name", "Image", "State", "Status", "Ports", "Actions"].map((h) => (
                    <th key={h} className="py-3 px-4 text-left text-[10px] uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {containers.map((c) => (
                  <tr key={c.ID} className="hover:bg-slate-800/20">
                    <td className="py-2.5 px-4 font-mono text-slate-300">{c.Names}</td>
                    <td className="py-2.5 px-4 text-slate-400">{c.Image}</td>
                    <td className="py-2.5 px-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${stateColor(c.State)}`}>{c.State}</span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 max-w-xs truncate">{c.Status}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-500 text-[10px] max-w-xs truncate">{c.Ports || "—"}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex gap-1">
                        {c.State !== "running" && (
                          <button onClick={() => void containerAction(c.Names, "start")} disabled={loading}
                            className="rounded px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] hover:bg-emerald-500/20">Start</button>
                        )}
                        {c.State === "running" && (
                          <button onClick={() => void containerAction(c.Names, "stop")} disabled={loading}
                            className="rounded px-1.5 py-0.5 bg-red-500/10 text-red-400 text-[10px] hover:bg-red-500/20">Stop</button>
                        )}
                        <button onClick={() => void containerAction(c.Names, "restart")} disabled={loading}
                          className="rounded px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] hover:bg-amber-500/20">Restart</button>
                        <button onClick={() => void fetchLogs(c.Names)} disabled={loading}
                          className="rounded px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] hover:bg-indigo-500/20">Logs</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {logsFor && logs && (
        <div className="rounded-xl border border-indigo-500/20 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-indigo-300">Logs: {logsFor}</p>
            <button onClick={() => { setLogs(""); setLogsFor(""); }} className="text-xs text-slate-500">✕ Close</button>
          </div>
          <pre className="text-[10px] font-mono text-slate-400 overflow-auto max-h-64 whitespace-pre-wrap">{logs}</pre>
        </div>
      )}

      {output && (
        <pre className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-[11px] font-mono text-slate-400 overflow-auto max-h-48 whitespace-pre-wrap">{output}</pre>
      )}
    </div>
  );
}

/* ─── Images tab ───────────────────────────────────────────────── */
function ImagesTab({ hostId, cls }: { hostId: string; cls: Cls }) {
  const { btnSecondary } = cls;
  const [loading, setLoading] = useState(false);
  const [images, setImages]   = useState<Image[]>([]);
  const [output, setOutput]   = useState("");

  const loadImages = useCallback(async () => {
    setLoading(true);
    const fmt = '{"Repository":"{{.Repository}}","Tag":"{{.Tag}}","Size":"{{.Size}}","CreatedSince":"{{.CreatedSince}}"}';
    const r = await runAgentCommand(hostId, `docker images --format '${fmt}' 2>/dev/null`);
    const parsed: Image[] = [];
    for (const line of r.output.split("\n")) {
      try { const obj = JSON.parse(line.trim()); if (obj.Repository) parsed.push(obj); } catch { /* skip */ }
    }
    setImages(parsed);
    setOutput(parsed.length === 0 ? r.output : "");
    setLoading(false);
  }, [hostId]);

  const pruneImages = async () => {
    setLoading(true);
    const r = await runAgentCommand(hostId, "docker image prune -f 2>&1");
    setOutput(r.output);
    await loadImages();
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <button onClick={loadImages} disabled={loading} className={`${btnSecondary} flex items-center gap-1.5`}>
          {loading ? "⏳" : "🖼️"} Load Images
        </button>
        <button onClick={pruneImages} disabled={loading} className={`${btnSecondary} text-red-400`}>🗑️ Prune Unused</button>
      </div>

      {images.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                {["Repository", "Tag", "Size", "Created"].map((h) => (
                  <th key={h} className="py-3 px-4 text-left text-[10px] uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {images.map((img, i) => (
                <tr key={i} className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-4 font-mono text-slate-300">{img.Repository}</td>
                  <td className="py-2.5 px-4 font-mono text-indigo-300">{img.Tag}</td>
                  <td className="py-2.5 px-4 text-slate-400">{img.Size}</td>
                  <td className="py-2.5 px-4 text-slate-500">{img.CreatedSince}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {output && (
        <pre className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-[11px] font-mono text-slate-400 overflow-auto max-h-48 whitespace-pre-wrap">{output}</pre>
      )}
    </div>
  );
}

/* ─── Compose tab ──────────────────────────────────────────────── */
function ComposeTab({ hostId, cls }: { hostId: string; cls: Cls }) {
  const { inputCls, btnPrimary, btnSecondary } = cls;
  const [loading, setLoading] = useState(false);
  const [path, setPath]       = useState("/srv/compose/docker-compose.yml");
  const [output, setOutput]   = useState("");

  const compose = async (action: "up -d" | "down" | "pull" | "ps") => {
    setLoading(true);
    const dir = path.substring(0, path.lastIndexOf("/"));
    const r = await runAgentCommand(hostId, `cd ${dir} && docker compose ${action} 2>&1`, 180_000);
    setOutput(r.output);
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">Docker Compose</h3>
        <input value={path} onChange={(e) => setPath(e.target.value)}
          placeholder="/srv/app/docker-compose.yml" className={inputCls} />
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void compose("up -d")} disabled={loading} className={btnPrimary}>▶ Up -d</button>
          <button onClick={() => void compose("down")}  disabled={loading} className={`${btnSecondary} text-red-400`}>■ Down</button>
          <button onClick={() => void compose("pull")}  disabled={loading} className={btnSecondary}>⬇ Pull</button>
          <button onClick={() => void compose("ps")}    disabled={loading} className={btnSecondary}>📋 PS</button>
        </div>
      </div>

      {output && (
        <pre className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-[11px] font-mono text-slate-400 overflow-auto max-h-64 whitespace-pre-wrap">{output}</pre>
      )}
    </div>
  );
}

/* ─── MAIN EXPORT ─────────────────────────────────────────────── */
type Tab = "containers" | "images" | "compose";

export function DockerView(props: { hostId: string } & Cls) {
  const { hostId, ...cls } = props;
  const [tab, setTab] = useState<Tab>("containers");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "containers", label: "Containers", icon: "📦" },
    { id: "images",     label: "Images",     icon: "🖼️" },
    { id: "compose",    label: "Compose",    icon: "🔧" },
  ];

  if (!hostId) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 py-20 text-center">
        <span className="text-4xl mb-3">🐳</span>
        <p className="text-slate-400">Select a host to manage Docker.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-1 w-fit">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition ${tab === t.id ? "bg-indigo-500/15 text-indigo-400" : "text-slate-500 hover:text-slate-300"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {tab === "containers" && <ContainersTab hostId={hostId} cls={cls} />}
      {tab === "images"     && <ImagesTab     hostId={hostId} cls={cls} />}
      {tab === "compose"    && <ComposeTab    hostId={hostId} cls={cls} />}
    </div>
  );
}
