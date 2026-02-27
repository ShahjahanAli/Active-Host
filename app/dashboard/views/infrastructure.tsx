"use client";

import { useState, useCallback } from "react";
import { runAgentCommand } from "../run-agent-command";

type Cls = { inputCls: string; btnPrimary: string; btnSecondary: string };

/* ─── NGINX TAB ─────────────────────────────────────────────── */
function NginxTab({ hostId, cls }: { hostId: string; cls: Cls }) {
  const { inputCls, btnPrimary, btnSecondary } = cls;
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [sites, setSites] = useState<{ name: string; enabled: boolean }[]>([]);
  const [domain, setDomain] = useState("");
  const [rootPath, setRootPath] = useState("/var/www/html");
  const [phpFpm, setPhpFpm] = useState(false);

  const loadSites = useCallback(async () => {
    setLoading(true);
    const r = await runAgentCommand(
      hostId,
      `echo "=AVAIL=" && ls /etc/nginx/sites-available 2>/dev/null && echo "=ENABLED=" && ls /etc/nginx/sites-enabled 2>/dev/null`,
    );
    setOutput(r.output);
    if (r.success) {
      const avail = r.output.split("=AVAIL=")[1]?.split("=ENABLED=")[0]?.trim().split("\n").filter(Boolean) ?? [];
      const enabled = new Set((r.output.split("=ENABLED=")[1]?.trim().split("\n").filter(Boolean)) ?? []);
      setSites(avail.map((name) => ({ name: name.trim(), enabled: enabled.has(name.trim()) })));
    }
    setLoading(false);
  }, [hostId]);

  const createVHost = async () => {
    if (!domain) return;
    const cfg = phpFpm
      ? `server { listen 80; server_name ${domain} www.${domain}; root ${rootPath}; index index.php index.html; location / { try_files $uri $uri/ /index.php?$args; } location ~ \\.php$ { include snippets/fastcgi-php.conf; fastcgi_pass unix:/run/php/php-fpm.sock; } }`
      : `server { listen 80; server_name ${domain} www.${domain}; root ${rootPath}; index index.html; location / { try_files $uri $uri/ =404; } }`;
    setLoading(true);
    const cmd = `echo '${cfg}' | sudo tee /etc/nginx/sites-available/${domain} > /dev/null && sudo ln -sf /etc/nginx/sites-available/${domain} /etc/nginx/sites-enabled/${domain} && sudo nginx -t && sudo systemctl reload nginx && echo "OK: vhost created"`;
    const r = await runAgentCommand(hostId, cmd);
    setOutput(r.output);
    await loadSites();
    setLoading(false);
  };

  const toggleSite = async (name: string, enabled: boolean) => {
    const cmd = enabled
      ? `sudo rm /etc/nginx/sites-enabled/${name} && sudo systemctl reload nginx && echo "Disabled"`
      : `sudo ln -sf /etc/nginx/sites-available/${name} /etc/nginx/sites-enabled/${name} && sudo nginx -t && sudo systemctl reload nginx && echo "Enabled"`;
    setLoading(true);
    const r = await runAgentCommand(hostId, cmd);
    setOutput(r.output);
    await loadSites();
    setLoading(false);
  };

  const reloadNginx = async () => {
    setLoading(true);
    const r = await runAgentCommand(hostId, "sudo nginx -t && sudo systemctl reload nginx && echo 'Nginx reloaded successfully'");
    setOutput(r.output);
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <button onClick={loadSites} disabled={loading} className={`${btnSecondary} flex items-center gap-1.5`}>
          {loading ? "⏳" : "🔄"} Load sites
        </button>
        <button onClick={reloadNginx} disabled={loading} className={btnSecondary}>
          ↺ Reload Nginx
        </button>
      </div>

      {sites.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                {["Virtual Host", "Status", "Actions"].map((h) => (
                  <th key={h} className="py-3 px-4 text-left text-[10px] uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sites.map((site) => (
                <tr key={site.name} className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-4 font-mono text-slate-300">{site.name}</td>
                  <td className="py-2.5 px-4">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${site.enabled ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/20" : "bg-slate-500/15 text-slate-400 ring-slate-700"}`}>
                      {site.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <button onClick={() => void toggleSite(site.name, site.enabled)} disabled={loading}
                      className={`${btnSecondary} py-1 px-2.5 text-[11px]`}>
                      {site.enabled ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">Create Virtual Host</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" className={inputCls} />
          <input value={rootPath} onChange={(e) => setRootPath(e.target.value)} placeholder="/var/www/html" className={inputCls} />
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
          <input type="checkbox" checked={phpFpm} onChange={(e) => setPhpFpm(e.target.checked)} className="rounded" />
          Include PHP-FPM configuration
        </label>
        <button onClick={() => void createVHost()} disabled={loading || !domain} className={btnPrimary}>
          Create VHost
        </button>
      </div>

      {output && (
        <pre className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-[11px] font-mono text-slate-400 overflow-auto max-h-48 whitespace-pre-wrap">{output}</pre>
      )}
    </div>
  );
}

/* ─── SSL TAB ────────────────────────────────────────────────── */
function SSLTab({ hostId, cls }: { hostId: string; cls: Cls }) {
  const { inputCls, btnPrimary, btnSecondary } = cls;
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [forceWww, setForceWww] = useState(true);

  const listCerts = async () => {
    setLoading(true);
    const r = await runAgentCommand(hostId, "sudo certbot certificates 2>/dev/null || echo 'certbot not installed'");
    setOutput(r.output);
    setLoading(false);
  };

  const issueCert = async () => {
    if (!domain || !email) return;
    const domains = forceWww ? `-d ${domain} -d www.${domain}` : `-d ${domain}`;
    setLoading(true);
    const cmd = `sudo certbot --nginx ${domains} --non-interactive --agree-tos -m ${email} 2>&1`;
    const r = await runAgentCommand(hostId, cmd, 120_000);
    setOutput(r.output);
    setLoading(false);
  };

  const renewAll = async () => {
    setLoading(true);
    const r = await runAgentCommand(hostId, "sudo certbot renew --non-interactive 2>&1", 120_000);
    setOutput(r.output);
    setLoading(false);
  };

  const dryRun = async () => {
    setLoading(true);
    const r = await runAgentCommand(hostId, "sudo certbot renew --dry-run 2>&1", 90_000);
    setOutput(r.output);
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button onClick={listCerts} disabled={loading} className={btnSecondary}>🔒 List Certificates</button>
        <button onClick={renewAll}  disabled={loading} className={btnSecondary}>↺ Renew All</button>
        <button onClick={dryRun}    disabled={loading} className={`${btnSecondary} text-slate-500`}>🧪 Dry Run</button>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">Issue New Certificate (Let&apos;s Encrypt)</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" className={inputCls} />
          <input value={email}  onChange={(e) => setEmail(e.target.value)}  placeholder="admin@example.com" className={inputCls} />
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
          <input type="checkbox" checked={forceWww} onChange={(e) => setForceWww(e.target.checked)} className="rounded" />
          Include www.{domain || "domain.com"}
        </label>
        <button onClick={() => void issueCert()} disabled={loading || !domain || !email} className={btnPrimary}>
          {loading ? "Issuing…" : "Issue Certificate"}
        </button>
      </div>

      {output && (
        <pre className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-[11px] font-mono text-slate-400 overflow-auto max-h-64 whitespace-pre-wrap">{output}</pre>
      )}
    </div>
  );
}

/* ─── FIREWALL TAB ───────────────────────────────────────────── */
type UfwRule = { num: number; to: string; action: string; from: string; comment?: string };

function FirewallTab({ hostId, cls }: { hostId: string; cls: Cls }) {
  const { inputCls, btnPrimary, btnSecondary } = cls;
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [rules, setRules] = useState<UfwRule[]>([]);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [port, setPort] = useState("");
  const [proto, setProto] = useState("tcp");
  const [action, setAction] = useState("allow");
  const [fromIp, setFromIp] = useState("any");

  const parseRules = (text: string): UfwRule[] => {
    const lines = text.split("\n");
    const out: UfwRule[] = [];
    for (const line of lines) {
      const m = line.match(/^\[ ?(\d+)\]\s+(\S+)\s+(ALLOW|DENY|REJECT|LIMIT)\s+(.*)/i);
      if (m) {
        out.push({ num: parseInt(m[1]), to: m[2], action: m[3], from: m[4].trim() });
      }
    }
    return out;
  };

  const loadRules = useCallback(async () => {
    setLoading(true);
    const r = await runAgentCommand(hostId, "sudo ufw status numbered 2>/dev/null");
    setOutput(r.output);
    if (r.success) {
      setEnabled(!r.output.toLowerCase().includes("inactive"));
      setRules(parseRules(r.output));
    }
    setLoading(false);
  }, [hostId]);

  const toggleUfw = async () => {
    setLoading(true);
    const cmd = enabled ? "sudo ufw --force disable" : "sudo ufw --force enable";
    const r = await runAgentCommand(hostId, cmd);
    setOutput(r.output);
    await loadRules();
    setLoading(false);
  };

  const addRule = async () => {
    if (!port) return;
    const target = fromIp === "any" ? "" : ` from ${fromIp} to any`;
    const cmd = `sudo ufw ${action} ${fromIp !== "any" ? `from ${fromIp} to any port` : ""} ${port}/${proto}${fromIp !== "any" ? "" : ""} && echo "Rule added"`;
    const simpleCmd = `sudo ufw ${action} ${port}/${proto} && echo "Rule added: ${action} ${port}/${proto}"`;
    setLoading(true);
    const r = await runAgentCommand(hostId, fromIp === "any" ? simpleCmd : `sudo ufw ${action} from ${fromIp} to any port ${port} proto ${proto} && echo "Rule added"`);
    setOutput(r.output);
    await loadRules();
    setLoading(false);
    void target;
    void cmd;
  };

  const deleteRule = async (num: number) => {
    setLoading(true);
    const r = await runAgentCommand(hostId, `echo y | sudo ufw delete ${num} && echo "Rule deleted"`);
    setOutput(r.output);
    await loadRules();
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={loadRules} disabled={loading} className={`${btnSecondary} flex items-center gap-1.5`}>
          {loading ? "⏳" : "🛡️"} Load Rules
        </button>
        {enabled !== null && (
          <button onClick={() => void toggleUfw()} disabled={loading}
            className={`${enabled ? "border-red-500/30 bg-red-500/5 text-red-400" : "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"} rounded-lg border px-3 py-2 text-xs font-medium transition`}>
            {enabled ? "🔴 Disable Firewall" : "🟢 Enable Firewall"}
          </button>
        )}
        {enabled !== null && (
          <span className={`text-xs px-2 py-1 rounded-full ${enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            UFW {enabled ? "Active" : "Inactive"}
          </span>
        )}
      </div>

      {rules.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                {["#", "Port / To", "Action", "From", ""].map((h) => (
                  <th key={h} className="py-3 px-4 text-left text-[10px] uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rules.map((rule) => (
                <tr key={rule.num} className="hover:bg-slate-800/20">
                  <td className="py-2 px-4 text-slate-600">{rule.num}</td>
                  <td className="py-2 px-4 font-mono text-slate-300">{rule.to}</td>
                  <td className="py-2 px-4">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${rule.action.toLowerCase() === "allow" ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/20" : "bg-red-500/15 text-red-400 ring-red-500/20"}`}>
                      {rule.action}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-slate-400">{rule.from}</td>
                  <td className="py-2 px-4">
                    <button onClick={() => void deleteRule(rule.num)} disabled={loading}
                      className="text-xs text-red-400 hover:text-red-300">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">Add Rule</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input value={port}   onChange={(e) => setPort(e.target.value)}   placeholder="Port (e.g. 80)" className={inputCls} />
          <select value={proto}  onChange={(e) => setProto(e.target.value)}  className={inputCls}>
            <option value="tcp">TCP</option><option value="udp">UDP</option><option value="any">Any</option>
          </select>
          <select value={action} onChange={(e) => setAction(e.target.value)} className={inputCls}>
            <option value="allow">Allow</option><option value="deny">Deny</option><option value="reject">Reject</option>
          </select>
          <input value={fromIp} onChange={(e) => setFromIp(e.target.value)} placeholder="From IP (or 'any')" className={inputCls} />
        </div>
        <button onClick={() => void addRule()} disabled={loading || !port} className={btnPrimary}>Add Rule</button>
      </div>

      {output && (
        <pre className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-[11px] font-mono text-slate-400 overflow-auto max-h-48 whitespace-pre-wrap">{output}</pre>
      )}
    </div>
  );
}

/* ─── CRON JOBS TAB ──────────────────────────────────────────── */
type CronJob = { raw: string; schedule: string; command: string; index: number };

const CRON_PRESETS = [
  { label: "Every minute",   value: "* * * * *"      },
  { label: "Every hour",     value: "0 * * * *"      },
  { label: "Every day 2am",  value: "0 2 * * *"      },
  { label: "Every Sunday",   value: "0 3 * * 0"      },
  { label: "1st of month",   value: "0 0 1 * *"      },
  { label: "Custom…",        value: "__custom__"      },
];

function CronTab({ hostId, cls }: { hostId: string; cls: Cls }) {
  const { inputCls, btnPrimary, btnSecondary } = cls;
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [preset, setPreset] = useState("0 2 * * *");
  const [customSchedule, setCustomSchedule] = useState("");
  const [newCmd, setNewCmd] = useState("");
  const [allLines, setAllLines] = useState<string[]>([]);

  const parseCron = (text: string): CronJob[] => {
    return text
      .split("\n")
      .map((line, i) => ({ raw: line, index: i, line: line.trim() }))
      .filter((l) => l.line && !l.line.startsWith("#"))
      .map((l) => {
        const parts = l.line.split(/\s+/);
        if (parts.length < 6) return null;
        return { raw: l.line, index: l.index, schedule: parts.slice(0, 5).join(" "), command: parts.slice(5).join(" ") };
      })
      .filter(Boolean) as CronJob[];
  };

  const loadCron = useCallback(async () => {
    setLoading(true);
    const r = await runAgentCommand(hostId, `crontab -l 2>/dev/null || echo ""`);
    setOutput("");
    if (r.success) {
      const lines = r.output.split("\n");
      setAllLines(lines);
      setJobs(parseCron(r.output));
    }
    setLoading(false);
  }, [hostId]);

  const addJob = async () => {
    const sched = preset === "__custom__" ? customSchedule : preset;
    if (!sched || !newCmd) return;
    const newLine = `${sched} ${newCmd}`;
    const newCrontab = [...allLines.filter((l) => l.trim()), newLine].join("\n") + "\n";
    setLoading(true);
    const r = await runAgentCommand(hostId, `printf '${newCrontab.replace(/'/g, "'\\''")}' | crontab - && echo "Job added"`);
    setOutput(r.output);
    await loadCron();
    setLoading(false);
  };

  const removeJob = async (job: CronJob) => {
    const remaining = allLines.filter((l) => l.trim() !== job.raw.trim());
    const newCrontab = remaining.join("\n") + "\n";
    setLoading(true);
    const r = await runAgentCommand(hostId, `printf '${newCrontab.replace(/'/g, "'\\''")}' | crontab - && echo "Job removed"`);
    setOutput(r.output);
    await loadCron();
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <button onClick={loadCron} disabled={loading} className={`${btnSecondary} flex items-center gap-1.5`}>
        {loading ? "⏳" : "⏰"} Load Cron Jobs
      </button>

      {jobs.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                {["Schedule", "Command", ""].map((h) => (
                  <th key={h} className="py-3 px-4 text-left text-[10px] uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {jobs.map((job, i) => (
                <tr key={i} className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-4 font-mono text-indigo-300 whitespace-nowrap">{job.schedule}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-400 max-w-xs truncate">{job.command}</td>
                  <td className="py-2.5 px-4">
                    <button onClick={() => void removeJob(job)} disabled={loading}
                      className="text-xs text-red-400 hover:text-red-300">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {jobs.length === 0 && !loading && (
        <p className="text-sm text-slate-500">No cron jobs found. Load or add one below.</p>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">Add Cron Job</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <select value={preset} onChange={(e) => setPreset(e.target.value)} className={inputCls}>
            {CRON_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>{p.label} {p.value !== "__custom__" ? `(${p.value})` : ""}</option>
            ))}
          </select>
          {preset === "__custom__" && (
            <input value={customSchedule} onChange={(e) => setCustomSchedule(e.target.value)}
              placeholder="* * * * * (min hr dom mon dow)" className={inputCls} />
          )}
        </div>
        <input value={newCmd} onChange={(e) => setNewCmd(e.target.value)}
          placeholder="/usr/bin/php /var/www/artisan schedule:run >> /dev/null 2>&1" className={inputCls} />
        <button onClick={() => void addJob()} disabled={loading || !newCmd} className={btnPrimary}>
          Add Job
        </button>
      </div>

      {output && (
        <pre className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-[11px] font-mono text-slate-400 overflow-auto max-h-32 whitespace-pre-wrap">{output}</pre>
      )}
    </div>
  );
}

/* ─── MAIN EXPORT ─────────────────────────────────────────────── */
type Tab = "nginx" | "ssl" | "firewall" | "cron";

export function InfrastructureView(props: { hostId: string; initialTab?: Tab } & Cls) {
  const { hostId, initialTab, ...cls } = props;
  const [tab, setTab] = useState<Tab>(initialTab ?? "nginx");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "nginx",    label: "Nginx & Domains", icon: "🌐" },
    { id: "ssl",      label: "SSL / TLS",        icon: "🔒" },
    { id: "firewall", label: "Firewall (UFW)",    icon: "🛡️" },
    { id: "cron",     label: "Cron Jobs",         icon: "⏰" },
  ];

  if (!hostId) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 py-20 text-center">
        <span className="text-4xl mb-3">🖥️</span>
        <p className="text-slate-400">Select a host to manage infrastructure.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${tab === t.id ? "bg-indigo-500/15 text-indigo-400" : "text-slate-500 hover:text-slate-300"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {tab === "nginx"    && <NginxTab    hostId={hostId} cls={cls} />}
      {tab === "ssl"      && <SSLTab      hostId={hostId} cls={cls} />}
      {tab === "firewall" && <FirewallTab hostId={hostId} cls={cls} />}
      {tab === "cron"     && <CronTab     hostId={hostId} cls={cls} />}
    </div>
  );
}
