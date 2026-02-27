"use client";

import { useState, useCallback } from "react";
import { runAgentCommand } from "../run-agent-command";

type Cls = { inputCls: string; btnPrimary: string; btnSecondary: string };

/* ─── SSH KEYS TAB ───────────────────────────────────────────── */
type SshKey = { type: string; key: string; comment: string; fingerprint: string };

function parseKeys(text: string): SshKey[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const parts = l.split(/\s+/);
      const type    = parts[0] ?? "";
      const key     = parts[1] ?? "";
      const comment = parts.slice(2).join(" ");
      const fingerprint = key.length > 12 ? `…${key.slice(-8)}` : key;
      return { type, key, comment, fingerprint };
    });
}

function SSHKeysTab({ hostId, cls }: { hostId: string; cls: Cls }) {
  const { inputCls, btnPrimary, btnSecondary } = cls;
  const [loading, setLoading] = useState(false);
  const [output, setOutput]   = useState("");
  const [keys, setKeys]       = useState<SshKey[]>([]);
  const [newKey, setNewKey]   = useState("");
  const [rawKeys, setRawKeys] = useState<string[]>([]);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    const r = await runAgentCommand(hostId, "cat ~/.ssh/authorized_keys 2>/dev/null || echo ''");
    setOutput("");
    if (r.success) {
      setRawKeys(r.output.split("\n"));
      setKeys(parseKeys(r.output));
    } else {
      setOutput(r.output);
    }
    setLoading(false);
  }, [hostId]);

  const addKey = async () => {
    const trimmed = newKey.trim();
    if (!trimmed) return;
    setLoading(true);
    const cmd = `mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '${trimmed.replace(/'/g, "'\\''")}' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo "Key added"`;
    const r = await runAgentCommand(hostId, cmd);
    setOutput(r.output);
    if (r.success) setNewKey("");
    await loadKeys();
    setLoading(false);
  };

  const removeKey = async (key: SshKey) => {
    const escaped = key.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const cmd = `sed -i '/${escaped.substring(0, 20)}/d' ~/.ssh/authorized_keys && echo "Key removed"`;
    setLoading(true);
    const r = await runAgentCommand(hostId, cmd);
    setOutput(r.output);
    await loadKeys();
    setLoading(false);
    void rawKeys;
  };

  return (
    <div className="space-y-5">
      <button onClick={loadKeys} disabled={loading} className={`${btnSecondary} flex items-center gap-1.5`}>
        {loading ? "⏳" : "🔑"} Load Authorized Keys
      </button>

      {keys.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                {["Type", "Comment / Label", "Key ending", ""].map((h) => (
                  <th key={h} className="py-3 px-4 text-left text-[10px] uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {keys.map((k, i) => (
                <tr key={i} className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-4 text-indigo-300 font-mono">{k.type}</td>
                  <td className="py-2.5 px-4 text-slate-300 max-w-xs truncate">{k.comment || <span className="text-slate-600 italic">unnamed</span>}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-500">{k.fingerprint}</td>
                  <td className="py-2.5 px-4">
                    <button onClick={() => void removeKey(k)} disabled={loading}
                      className="text-xs text-red-400 hover:text-red-300">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {keys.length === 0 && !loading && (
        <p className="text-sm text-slate-500">No authorized keys found. Load keys or add one below.</p>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">Add Public Key</h3>
        <textarea
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          rows={3}
          placeholder="ssh-rsa AAAA… or ssh-ed25519 AAAA…"
          className={`${inputCls} font-mono resize-none`}
        />
        <button onClick={() => void addKey()} disabled={loading || !newKey.trim()} className={btnPrimary}>
          Add Key
        </button>
      </div>

      {output && (
        <pre className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-[11px] font-mono text-slate-400 overflow-auto max-h-32 whitespace-pre-wrap">{output}</pre>
      )}
    </div>
  );
}

/* ─── FAIL2BAN TAB ───────────────────────────────────────────── */
type Jail = { name: string; banned: number; failed: number; bannedIps: string[] };

function Fail2banTab({ hostId, cls }: { hostId: string; cls: Cls }) {
  const { btnSecondary } = cls;
  const [loading, setLoading] = useState(false);
  const [output, setOutput]   = useState("");
  const [jails, setJails]     = useState<Jail[]>([]);
  const [unbanIp, setUnbanIp] = useState("");
  const [unbanJail, setUnbanJail] = useState("sshd");

  const parseJailStatus = (text: string, jailName: string): Jail => {
    const banned  = parseInt(text.match(/Currently banned:\s+(\d+)/)?.[1] ?? "0");
    const failed  = parseInt(text.match(/Currently failed:\s+(\d+)/)?.[1] ?? "0");
    const ipLine  = text.match(/Banned IP list:\s+(.*)/)?.[1] ?? "";
    const bannedIps = ipLine.trim() ? ipLine.trim().split(/\s+/) : [];
    return { name: jailName, banned, failed, bannedIps };
  };

  const loadStatus = useCallback(async () => {
    setLoading(true);
    const r = await runAgentCommand(hostId, "sudo fail2ban-client status 2>/dev/null || echo 'fail2ban not installed'");
    if (!r.success || r.output.includes("not installed")) {
      setOutput(r.output);
      setLoading(false);
      return;
    }
    // Extract jail list
    const jailLine = r.output.match(/Jail list:\s+(.*)/)?.[1] ?? "";
    const jailNames = jailLine.split(",").map((j) => j.trim()).filter(Boolean);

    // Get status for each jail
    const results: Jail[] = [];
    for (const name of jailNames.slice(0, 10)) {
      const r2 = await runAgentCommand(hostId, `sudo fail2ban-client status ${name} 2>/dev/null`);
      if (r2.success) results.push(parseJailStatus(r2.output, name));
    }
    setJails(results);
    setOutput("");
    setLoading(false);
  }, [hostId]);

  const unban = async () => {
    if (!unbanIp || !unbanJail) return;
    setLoading(true);
    const r = await runAgentCommand(hostId, `sudo fail2ban-client set ${unbanJail} unbanip ${unbanIp}`);
    setOutput(r.output);
    await loadStatus();
    setLoading(false);
  };

  const totalBanned = jails.reduce((s, j) => s + j.banned, 0);

  return (
    <div className="space-y-5">
      <button onClick={loadStatus} disabled={loading} className={`${btnSecondary} flex items-center gap-1.5`}>
        {loading ? "⏳" : "🚨"} Load Fail2ban Status
      </button>

      {jails.length > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
              <p className="text-2xl font-bold text-red-400">{totalBanned}</p>
              <p className="text-xs text-slate-500 mt-1">Total Banned IPs</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
              <p className="text-2xl font-bold text-slate-300">{jails.length}</p>
              <p className="text-xs text-slate-500 mt-1">Active Jails</p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">{jails.reduce((s, j) => s + j.failed, 0)}</p>
              <p className="text-xs text-slate-500 mt-1">Current Failures</p>
            </div>
          </div>

          {/* Per-jail table */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800">
                  {["Jail", "Failed", "Banned", "Banned IPs"].map((h) => (
                    <th key={h} className="py-3 px-4 text-left text-[10px] uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {jails.map((jail) => (
                  <tr key={jail.name} className="hover:bg-slate-800/20">
                    <td className="py-2.5 px-4 font-mono text-indigo-300">{jail.name}</td>
                    <td className="py-2.5 px-4 text-amber-400">{jail.failed}</td>
                    <td className="py-2.5 px-4 text-red-400 font-semibold">{jail.banned}</td>
                    <td className="py-2.5 px-4 text-slate-400 font-mono text-[10px] max-w-xs truncate">
                      {jail.bannedIps.join(", ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Unban */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">Unban IP</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <input value={unbanIp} onChange={(e) => setUnbanIp(e.target.value)}
            placeholder="1.2.3.4" className="col-span-2 w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition" />
          <input value={unbanJail} onChange={(e) => setUnbanJail(e.target.value)}
            placeholder="Jail name (e.g. sshd)" className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition" />
        </div>
        <button onClick={() => void unban()} disabled={loading || !unbanIp}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50">
          Unban
        </button>
      </div>

      {output && (
        <pre className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-[11px] font-mono text-slate-400 overflow-auto max-h-48 whitespace-pre-wrap">{output}</pre>
      )}
    </div>
  );
}

/* ─── MAIN EXPORT ─────────────────────────────────────────────── */
type Tab = "ssh" | "fail2ban";

export function SecurityView(props: { hostId: string; initialTab?: Tab } & Cls) {
  const { hostId, initialTab, ...cls } = props;
  const [tab, setTab] = useState<Tab>(initialTab ?? "ssh");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "ssh",      label: "SSH Keys",  icon: "🔑" },
    { id: "fail2ban", label: "Fail2ban",  icon: "🚨" },
  ];

  if (!hostId) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 py-20 text-center">
        <span className="text-4xl mb-3">🔐</span>
        <p className="text-slate-400">Select a host to manage security.</p>
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
      {tab === "ssh"      && <SSHKeysTab  hostId={hostId} cls={cls} />}
      {tab === "fail2ban" && <Fail2banTab hostId={hostId} cls={cls} />}
    </div>
  );
}
