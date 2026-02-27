"use client";

import { useCallback, useEffect, useState } from "react";
import { inputCls, btnPrimary, btnSecondary } from "../shared";

/* ─── Types ─────────────────────────────────────────────────────── */
type ProcessManager = "pm2" | "systemd" | "docker";

type Project = {
  _id: string;
  name: string;
  gitRepo: string;
  gitBranch: string;
  workDir: string;
  processManager: ProcessManager;
  processName: string;
  nginxEnabled: boolean;
  domain?: string;
  webhookSecret: string;
  hostId: string;
  createdAt?: string;
};

type Host = { _id: string; name: string; address: string };

/* ─── Helpers ────────────────────────────────────────────────────── */
function pmBadge(pm: ProcessManager) {
  const map: Record<ProcessManager, string> = {
    pm2: "bg-green-500/10 text-green-400 ring-green-500/20",
    systemd: "bg-sky-500/10 text-sky-400 ring-sky-500/20",
    docker: "bg-cyan-500/10 text-cyan-400 ring-cyan-500/20",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${map[pm]}`}>
      {pm}
    </span>
  );
}

/* ─── Component ──────────────────────────────────────────────────── */
export function ProjectsView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deploying, setDeploying] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const loadProjects = useCallback(async () => {
    const [pRes, hRes] = await Promise.all([fetch("/api/projects"), fetch("/api/hosts")]);
    const [pData, hData] = await Promise.all([pRes.json(), hRes.json()]);
    setProjects(pData.projects ?? []);
    setHosts(hData.hosts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void loadProjects(); }, [loadProjects]);

  async function onDeploy(projectId: string) {
    setDeploying(projectId);
    setMessage(null);
    const res = await fetch(`/api/projects/${projectId}/deploy`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
    const data = await res.json();
    setDeploying(null);
    if (res.ok) {
      setMessage({ text: `Pipeline started (run ${data.pipelineRunId})`, ok: true });
    } else {
      setMessage({ text: data.message ?? "Deploy failed", ok: false });
    }
  }

  async function onDelete(projectId: string) {
    if (!confirm("Delete this project?")) return;
    await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p._id !== projectId));
  }

  const hostName = (id: string) => hosts.find((h) => h._id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Manage CI/CD projects — each project maps a Git repo to a remote host and process manager.
        </p>
        <button onClick={() => setShowForm((v) => !v)} className={btnPrimary}>
          {showForm ? "Cancel" : "+ New Project"}
        </button>
      </div>

      {message && (
        <div className={`rounded-lg px-4 py-3 text-sm ${message.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
          {message.text}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <CreateProjectForm
          hosts={hosts}
          onCreated={(p) => { setProjects((prev) => [p, ...prev]); setShowForm(false); }}
        />
      )}

      {/* List */}
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-slate-500 text-sm">
          No projects yet. Click <strong>+ New Project</strong> to get started.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <div key={p._id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-200 truncate">{p.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{p.gitRepo}</p>
                </div>
                {pmBadge(p.processManager)}
              </div>

              <div className="text-xs space-y-1 text-slate-400">
                <div className="flex gap-2">
                  <span className="text-slate-600 w-16 shrink-0">Branch</span>
                  <span className="truncate">{p.gitBranch}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-600 w-16 shrink-0">Host</span>
                  <span className="truncate">{hostName(p.hostId)}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-600 w-16 shrink-0">Dir</span>
                  <span className="truncate font-mono">{p.workDir}</span>
                </div>
                {p.nginxEnabled && p.domain && (
                  <div className="flex gap-2">
                    <span className="text-slate-600 w-16 shrink-0">Domain</span>
                    <span className="truncate">{p.domain}</span>
                  </div>
                )}
              </div>

              {/* Webhook URL hint */}
              <div className="rounded-md bg-slate-800/50 px-3 py-2 text-[10px] text-slate-500 font-mono truncate">
                POST /api/webhooks/github
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  disabled={deploying === p._id}
                  onClick={() => onDeploy(p._id)}
                  className={`${btnPrimary} flex-1 text-center text-xs py-1.5`}
                >
                  {deploying === p._id ? "Deploying…" : "▶ Deploy"}
                </button>
                <button
                  onClick={() => onDelete(p._id)}
                  className={`${btnSecondary} text-xs py-1.5 px-3 text-red-400 border-red-900/50 hover:bg-red-500/10`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Create form ─────────────────────────────────────────────────── */
function CreateProjectForm({ hosts, onCreated }: { hosts: Host[]; onCreated: (p: Project) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pm, setPm] = useState<ProcessManager>("pm2");
  const [nginxEnabled, setNginxEnabled] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const fd = new FormData(e.currentTarget);
    const payload = {
      name:              fd.get("name"),
      hostId:            fd.get("hostId"),
      gitRepo:           fd.get("gitRepo"),
      gitBranch:         fd.get("gitBranch") || "main",
      workDir:           fd.get("workDir"),
      installCmd:        fd.get("installCmd") || undefined,
      buildCmd:          fd.get("buildCmd") || undefined,
      testCmd:           fd.get("testCmd") || undefined,
      skipTests:         fd.get("skipTests") === "on",
      processManager:    pm,
      processName:       fd.get("processName"),
      dockerComposeFile: pm === "docker" ? (fd.get("dockerComposeFile") || "docker-compose.yml") : undefined,
      nginxEnabled,
      domain:            nginxEnabled ? (fd.get("domain") || undefined) : undefined,
      nginxPort:         nginxEnabled ? Number(fd.get("nginxPort") || 3000) : undefined,
    };
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(JSON.stringify(data.message)); return; }
    onCreated(data.project as Project);
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 space-y-5">
      <h3 className="text-sm font-semibold text-slate-200">New Project</h3>

      {err && <p className="text-xs text-red-400 rounded-lg bg-red-500/10 px-3 py-2">{err}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Project name" name="name" placeholder="my-app" required />
        <div className="space-y-1.5">
          <label className="block text-xs text-slate-400">Host</label>
          <select name="hostId" required className={inputCls}>
            <option value="">— select host —</option>
            {hosts.map((h) => <option key={h._id} value={h._id}>{h.name} ({h.address})</option>)}
          </select>
        </div>
        <Field label="Git repo (HTTPS clone URL)" name="gitRepo" placeholder="https://github.com/you/repo.git" required />
        <Field label="Branch" name="gitBranch" placeholder="main" />
        <Field label="Work directory" name="workDir" placeholder="/srv/my-app" required />
        <Field label="Install command" name="installCmd" placeholder="npm ci" />
        <Field label="Build command" name="buildCmd" placeholder="npm run build" />
        <Field label="Test command" name="testCmd" placeholder="npm test" />
      </div>

      <div className="flex items-center gap-2">
        <input id="skip-tests" type="checkbox" name="skipTests" className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-indigo-500" />
        <label htmlFor="skip-tests" className="text-xs text-slate-400">Skip tests</label>
      </div>

      {/* Process manager */}
      <div className="space-y-1.5">
        <label className="block text-xs text-slate-400">Process manager</label>
        <div className="flex gap-2">
          {(["pm2", "systemd", "docker"] as ProcessManager[]).map((m) => (
            <button key={m} type="button" onClick={() => setPm(m)}
              className={`rounded-lg px-4 py-1.5 text-xs border transition ${pm === m ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "border-slate-700 text-slate-400 hover:border-slate-600"}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={pm === "docker" ? "Service name" : "Process / service name"} name="processName" placeholder={pm === "pm2" ? "my-app" : pm === "systemd" ? "my-app.service" : "app"} required />
        {pm === "docker" && <Field label="Compose file" name="dockerComposeFile" placeholder="docker-compose.yml" />}
      </div>

      {/* Nginx */}
      <div className="border-t border-slate-800 pt-4 space-y-4">
        <div className="flex items-center gap-2">
          <input id="nginx-enable" type="checkbox" checked={nginxEnabled} onChange={(e) => setNginxEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-indigo-500" />
          <label htmlFor="nginx-enable" className="text-xs text-slate-400">Configure Nginx reverse proxy on first deploy</label>
        </div>
        {nginxEnabled && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Domain" name="domain" placeholder="myapp.example.com" />
            <Field label="Upstream port" name="nginxPort" placeholder="3000" type="number" />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? "Creating…" : "Create Project"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, name, placeholder, required, type = "text" }: {
  label: string; name: string; placeholder?: string; required?: boolean; type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs text-slate-400">{label}</label>
      <input type={type} name={name} placeholder={placeholder} required={required} className={inputCls} />
    </div>
  );
}
