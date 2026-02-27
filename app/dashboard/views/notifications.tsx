"use client";

import { useState, useEffect } from "react";

type Cls = { inputCls: string; btnPrimary: string; btnSecondary: string };

const EVENTS = [
  { id: "agent_offline",        label: "Agent goes offline" },
  { id: "agent_online",         label: "Agent comes online" },
  { id: "high_cpu",             label: "CPU usage > 90%" },
  { id: "high_memory",          label: "Memory usage > 90%" },
  { id: "high_disk",            label: "Disk usage > 90%" },
  { id: "command_failed",       label: "Command fails" },
  { id: "command_completed",    label: "Command completes" },
];

const WEBHOOK_TYPES = [
  { id: "discord",   label: "Discord",   icon: "🎮" },
  { id: "slack",     label: "Slack",     icon: "💬" },
  { id: "telegram",  label: "Telegram",  icon: "✈️" },
  { id: "generic",   label: "Generic",   icon: "🔗" },
];

type Webhook = {
  _id: string;
  name: string;
  url: string;
  type: string;
  events: string[];
  active: boolean;
};

export function NotificationsView(cls: Cls) {
  const { inputCls, btnPrimary, btnSecondary } = cls;
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading]   = useState(false);
  const [status, setStatus]     = useState("");
  const [adding, setAdding]     = useState(false);

  // Form state
  const [name, setName]         = useState("");
  const [url, setUrl]           = useState("");
  const [type, setType]         = useState("generic");
  const [events, setEvents]     = useState<string[]>(["agent_offline", "high_cpu"]);

  const load = async () => {
    setLoading(true);
    const r = await fetch("/api/notifications");
    if (r.ok) { const d = await r.json(); setWebhooks(d.webhooks ?? []); }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const addWebhook = async () => {
    if (!name || !url) return;
    setLoading(true);
    const r = await fetch("/api/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, url, type, events }),
    });
    if (r.ok) {
      setStatus("Webhook added");
      setAdding(false);
      setName(""); setUrl(""); setEvents(["agent_offline"]);
      await load();
    } else {
      const d = await r.json();
      setStatus(d.message ?? "Failed to add webhook");
    }
    setLoading(false);
  };

  const deleteWebhook = async (id: string) => {
    setLoading(true);
    await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
    await load();
    setLoading(false);
  };

  const testWebhook = async (webhook: Webhook) => {
    setStatus("Sending test payload…");
    try {
      const payload = buildPayload(webhook.type, {
        event: "test",
        message: `Test notification from Remote Server Manager — webhook "${webhook.name}"`,
        timestamp: new Date().toISOString(),
      });
      const r = await fetch(webhook.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      setStatus(r.ok ? "✅ Test payload delivered" : `❌ Server responded ${r.status}`);
    } catch {
      setStatus("❌ Failed to deliver — check the URL and CORS policy");
    }
  };

  function buildPayload(webhookType: string, data: Record<string, string>) {
    if (webhookType === "discord") {
      return { content: null, embeds: [{ title: data.event, description: data.message, color: 5814783, timestamp: data.timestamp }] };
    }
    if (webhookType === "slack") {
      return { text: `*${data.event}*\n${data.message}` };
    }
    return data; // generic / telegram forward
  }

  const toggleEvent = (id: string) => {
    setEvents((prev) => prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{webhooks.length} webhook{webhooks.length !== 1 ? "s" : ""} configured</p>
        <button onClick={() => setAdding((v) => !v)} className={btnPrimary}>
          {adding ? "Cancel" : "+ Add Webhook"}
        </button>
      </div>

      {status && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-xs text-slate-400">{status}</div>
      )}

      {/* Add form */}
      {adding && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">New Webhook</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. Discord Alerts)" className={inputCls} />
            <input value={url}  onChange={(e) => setUrl(e.target.value)}  placeholder="Webhook URL" className={inputCls} />
          </div>
          <div className="flex flex-wrap gap-2">
            {WEBHOOK_TYPES.map((t) => (
              <button key={t.id} onClick={() => setType(t.id)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition ${type === t.id ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-400" : "border-slate-700 text-slate-500 hover:text-slate-300"}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-2">Trigger on:</p>
            <div className="flex flex-wrap gap-2">
              {EVENTS.map((ev) => (
                <label key={ev.id} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={events.includes(ev.id)} onChange={() => toggleEvent(ev.id)} className="rounded" />
                  <span className="text-xs text-slate-400">{ev.label}</span>
                </label>
              ))}
            </div>
          </div>
          <button onClick={() => void addWebhook()} disabled={loading || !name || !url} className={btnPrimary}>
            Save Webhook
          </button>
        </div>
      )}

      {/* Webhook list */}
      {loading && webhooks.length === 0 && (
        <div className="text-center py-8 text-slate-500">Loading…</div>
      )}

      {!loading && webhooks.length === 0 && !adding && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 py-16 text-center">
          <span className="text-4xl mb-3">🔔</span>
          <p className="text-slate-400">No webhooks configured.</p>
          <p className="text-xs text-slate-600 mt-1">Add a Discord, Slack or Telegram webhook to receive alerts.</p>
        </div>
      )}

      <div className="space-y-3">
        {webhooks.map((wh) => (
          <div key={wh._id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span>{WEBHOOK_TYPES.find((t) => t.id === wh.type)?.icon ?? "🔗"}</span>
                  <p className="text-sm font-semibold text-white">{wh.name}</p>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ring-1 ring-inset ${wh.active ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/20" : "bg-slate-700 text-slate-500 ring-slate-600"}`}>
                    {wh.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 truncate">{wh.url}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {wh.events.map((ev) => (
                    <span key={ev} className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                      {EVENTS.find((e) => e.id === ev)?.label ?? ev}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => void testWebhook(wh)} disabled={loading} className={`${btnSecondary} py-1 px-2.5 text-[11px]`}>
                  Test
                </button>
                <button onClick={() => void deleteWebhook(wh._id)} disabled={loading}
                  className="rounded-lg border border-red-500/30 bg-red-500/5 px-2.5 py-1 text-[11px] text-red-400 hover:bg-red-500/10 transition">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
