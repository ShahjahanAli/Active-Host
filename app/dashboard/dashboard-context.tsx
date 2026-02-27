"use client";

import {
  createContext,
  FormEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { View } from "./shared";

/* ─── Types ──────────────────────────────────────────────────────── */
export type Host = {
  _id: string;
  name: string;
  address: string;
  environment: string;
  tags: string[];
  agentId: string;
  agentStatus: "online" | "offline";
  lastHeartbeatAt: string | null;
};

export type Command = {
  _id: string;
  command: string;
  status: string;
  output?: string;
  error?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type { View } from "./shared";

export type HostMetrics = {
  _id: string;
  collectedAt: string;
  cpu: { count: number; model: string; usagePercent: number };
  memory: { totalBytes: number; freeBytes: number; usedBytes: number; usagePercent: number };
  disks: { mount: string; totalBytes: number; freeBytes: number; usedBytes: number; usagePercent: number }[];
  network: { interface: string; address: string | null; rxBytes: number; txBytes: number; rxBytesPerSec: number; txBytesPerSec: number }[];
  load: { avg1: number; avg5: number; avg15: number };
  uptimeSeconds: number;
  activeProcesses: number;
};

type Toast = { id: string; message: string; type: "success" | "error" | "info" };

/* ─── URL path map (view → URL) ──────────────────────────────────── */
export const VIEW_PATHS: Record<View, string> = {
  overview:      "/dashboard",
  hosts:         "/dashboard/hosts",
  commands:      "/dashboard/commands",
  monitoring:    "/dashboard/monitoring",
  keys:          "/dashboard/keys",
  notifications: "/dashboard/notifications",
  apps:          "/dashboard/apps",
  docker:        "/dashboard/docker",
  nginx:         "/dashboard/nginx",
  ssl:           "/dashboard/ssl",
  firewall:      "/dashboard/firewall",
  cron:          "/dashboard/cron",
  ssh:           "/dashboard/ssh",
  fail2ban:      "/dashboard/fail2ban",
  projects:      "/dashboard/projects",
  pipeline:      "/dashboard/pipeline",
};

/** Map a URL pathname back to a View (falls back to "overview") */
export function pathToView(pathname: string): View {
  const found = (Object.entries(VIEW_PATHS) as [View, string][]).find(
    ([, path]) => path === pathname,
  );
  return found?.[0] ?? "overview";
}

/** Views that require a selected host to be useful */
export const HOST_VIEWS: View[] = [
  "monitoring", "commands", "docker", "nginx", "ssl",
  "firewall", "cron", "ssh", "fail2ban", "apps",
];

/* ─── Context shape ──────────────────────────────────────────────── */
type DashboardCtx = {
  hosts: Host[];
  selectedHostId: string;
  setSelectedHostId: (id: string) => void;
  selectedHost: Host | null;
  lastApiKey: string;
  commandInput: string;
  setCommandInput: (v: string) => void;
  commands: Command[];
  selectedCommandId: string;
  setSelectedCommandId: (id: string) => void;
  status: string;
  isBusy: boolean;
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean | ((prev: boolean) => boolean)) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  hostMetrics: HostMetrics | null;
  metricsHistory: HostMetrics[];
  metricsLoading: boolean;
  refreshInterval: number;
  setRefreshInterval: (v: number) => void;
  toasts: Toast[];
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>;
  deletingHostId: string | null;
  setDeletingHostId: (id: string | null) => void;
  sseAlive: boolean;
  selectedCommand: Command | null;
  counters: {
    totalHosts: number;
    onlineHosts: number;
    offlineHosts: number;
    runningCommands: number;
    completedCommands: number;
  };
  trendCpu: number | null;
  trendMem: number | null;
  linuxSnippet: string;
  windowsSnippet: string;
  loadHosts: () => Promise<void>;
  loadCommands: (hostId: string) => Promise<void>;
  loadHostMetrics: (hostId: string) => Promise<void>;
  refreshDashboard: () => Promise<void>;
  onCreateHost: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  onGenerateKey: () => Promise<void>;
  onQueueCommand: () => Promise<void>;
  copyText: (value: string) => Promise<void>;
  addToast: (message: string, type?: "success" | "error" | "info") => void;
  onDeleteHost: (hostId: string) => Promise<void>;
  navigate: (view: View) => void;
};

/* ─── Create context ─────────────────────────────────────────────── */
const DashboardContext = createContext<DashboardCtx | null>(null);

/* ─── Provider ───────────────────────────────────────────────────── */
export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [hosts, setHosts]                               = useState<Host[]>([]);
  const [selectedHostId, setSelectedHostId]             = useState("");
  const [lastApiKey, setLastApiKey]                     = useState("");
  const [commandInput, setCommandInput]                 = useState("uname -a");
  const [commands, setCommands]                         = useState<Command[]>([]);
  const [selectedCommandId, setSelectedCommandId]       = useState("");
  const [status, setStatus]                             = useState("");
  const [isBusy, setIsBusy]                             = useState(false);
  const [autoRefresh, setAutoRefresh]                   = useState(true);
  const [sidebarOpen, setSidebarOpen]                   = useState(false);
  const [hostMetrics, setHostMetrics]                   = useState<HostMetrics | null>(null);
  const [metricsHistory, setMetricsHistory]             = useState<HostMetrics[]>([]);
  const [metricsLoading, setMetricsLoading]             = useState(false);
  const [refreshInterval, setRefreshInterval]           = useState(30);
  const sseRef                                          = useRef<EventSource | null>(null);
  const [toasts, setToasts]                             = useState<Toast[]>([]);
  const [deletingHostId, setDeletingHostId]             = useState<string | null>(null);

  /* ----- Derived -------------------------------------------------- */
  const selectedHost = useMemo(
    () => hosts.find((h) => h._id === selectedHostId) ?? null,
    [hosts, selectedHostId],
  );

  const selectedCommand = useMemo(
    () => commands.find((c) => c._id === selectedCommandId) ?? commands[0] ?? null,
    [commands, selectedCommandId],
  );

  const counters = useMemo(() => {
    const onlineHosts = hosts.filter((h) => h.agentStatus === "online").length;
    const runningCommands = commands.filter((c) => c.status === "running" || c.status === "queued").length;
    const completedCommands = commands.filter((c) => c.status === "completed").length;
    return {
      totalHosts: hosts.length,
      onlineHosts,
      offlineHosts: Math.max(hosts.length - onlineHosts, 0),
      runningCommands,
      completedCommands,
    };
  }, [hosts, commands]);

  const trendCpu = metricsHistory.length >= 2
    ? metricsHistory[metricsHistory.length - 1].cpu.usagePercent
      - metricsHistory[Math.max(0, metricsHistory.length - 6)].cpu.usagePercent
    : null;
  const trendMem = metricsHistory.length >= 2
    ? metricsHistory[metricsHistory.length - 1].memory.usagePercent
      - metricsHistory[Math.max(0, metricsHistory.length - 6)].memory.usagePercent
    : null;
  const sseAlive =
    (!!sseRef.current && sseRef.current.readyState === EventSource.CONNECTING) ||
    (!!sseRef.current && sseRef.current.readyState === 1 /* OPEN */);

  /* ----- Install snippets ----------------------------------------- */
  const linuxSnippet = selectedHost
    ? [
        "git clone https://github.com/your-org/remoteservermanager.git",
        "cd remoteservermanager/server-agent",
        "cp .env.example .env",
        `echo AGENT_ID=${selectedHost.agentId} >> .env`,
        `echo AGENT_API_KEY=${lastApiKey || "<generate_key_first>"} >> .env`,
        "npm install && npm run build && npm start",
      ].join("\n")
    : "Select a host to generate the install snippet.";

  const windowsSnippet = selectedHost
    ? [
        "git clone https://github.com/your-org/remoteservermanager.git",
        "cd remoteservermanager/server-agent",
        "copy .env.example .env",
        `$env:AGENT_ID='${selectedHost.agentId}'`,
        `$env:AGENT_API_KEY='${lastApiKey || "<generate_key_first>"}'`,
        "npm install; npm run build; npm start",
      ].join("\n")
    : "Select a host to generate the install snippet.";

  /* ----- Data loading --------------------------------------------- */
  async function loadHosts(): Promise<void> {
    const res = await fetch("/api/hosts");
    const data = await res.json();
    if (!res.ok) { setStatus(data.message ?? "Failed to load hosts"); return; }
    setHosts(data.hosts ?? []);
    if (!selectedHostId && data.hosts?.length) setSelectedHostId(data.hosts[0]._id);
  }

  async function loadCommands(hostId: string): Promise<void> {
    const res = await fetch(`/api/commands?hostId=${encodeURIComponent(hostId)}&limit=30`);
    const data = await res.json();
    if (!res.ok) { setStatus(data.message ?? "Failed to load commands"); return; }
    setCommands(data.commands ?? []);
    if (!selectedCommandId && data.commands?.length) setSelectedCommandId(data.commands[0]._id);
  }

  const loadHostMetrics = useCallback(async (hostId: string): Promise<void> => {
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
    setMetricsLoading(true);
    setMetricsHistory([]);
    setHostMetrics(null);

    try {
      const res = await fetch(`/api/hosts/${hostId}/metrics`);
      const data = await res.json();
      if (res.ok && data.metrics?.length) {
        const sorted = [...(data.metrics as HostMetrics[])].reverse();
        setMetricsHistory(sorted);
        setHostMetrics(sorted[sorted.length - 1]);
      }
    } catch { /* non-fatal */ }
    setMetricsLoading(false);

    const sse = new EventSource(`/api/hosts/${hostId}/metrics/stream`);
    sseRef.current = sse;
    sse.onmessage = (e) => {
      try {
        const snap = JSON.parse(e.data) as HostMetrics;
        setHostMetrics(snap);
        setMetricsHistory((prev) => {
          const next = [...prev.filter((m) => m._id !== snap._id), snap]
            .sort((a, b) => new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime())
            .slice(-60);
          return next;
        });
      } catch { /* malformed */ }
    };
    sse.onerror = () => { sse.close(); };
  }, []);

  async function refreshDashboard(): Promise<void> {
    setIsBusy(true);
    await loadHosts();
    if (selectedHostId) await loadCommands(selectedHostId);
    setIsBusy(false);
  }

  /* ----- Effects --------------------------------------------------- */
  useEffect(() => { void refreshDashboard(); }, []); // eslint-disable-line
  useEffect(() => () => { sseRef.current?.close(); }, []);

  useEffect(() => {
    if (!selectedHostId) { setCommands([]); setHostMetrics(null); setMetricsHistory([]); return; }
    void loadCommands(selectedHostId);
    void loadHostMetrics(selectedHostId);
  }, [selectedHostId]); // eslint-disable-line

  useEffect(() => {
    if (!autoRefresh || !selectedHostId) return;
    const timer = setInterval(() => {
      void loadCommands(selectedHostId);
      void loadHosts();
      if (!sseRef.current || sseRef.current.readyState === EventSource.CLOSED) {
        void loadHostMetrics(selectedHostId);
      }
    }, refreshInterval * 1000);
    return () => clearInterval(timer);
  }, [autoRefresh, selectedHostId, loadHostMetrics, refreshInterval]); // eslint-disable-line

  // Auto-poll while commands are active
  useEffect(() => {
    const hasActive = commands.some((c) => c.status === "running" || c.status === "queued");
    if (!hasActive || !selectedHostId) return;
    const timer = setInterval(() => void loadCommands(selectedHostId), 3000);
    return () => clearInterval(timer);
  }, [commands, selectedHostId]); // eslint-disable-line

  /* ----- Actions --------------------------------------------------- */
  async function onCreateHost(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name:        String(fd.get("name") ?? ""),
      address:     String(fd.get("address") ?? ""),
      environment: String(fd.get("environment") ?? "production"),
      tags:        String(fd.get("tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    };
    const res = await fetch("/api/hosts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { addToast(data.message ?? "Failed to create host", "error"); return; }
    addToast("Host created successfully", "success");
    setSelectedHostId(data.host._id);
    await loadHosts();
    e.currentTarget.reset();
  }

  async function onGenerateKey(): Promise<void> {
    if (!selectedHostId) { addToast("Select a host first", "error"); return; }
    const res = await fetch(`/api/hosts/${selectedHostId}/keys`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) { addToast(data.message ?? "Failed to generate API key", "error"); return; }
    setLastApiKey(data.apiKey);
    addToast("API key generated — copy it now, it won't be shown again.", "success");
  }

  async function onQueueCommand(): Promise<void> {
    if (!selectedHostId || !commandInput.trim()) {
      addToast("Select a host and enter a command", "error");
      return;
    }
    const res = await fetch("/api/commands", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hostId: selectedHostId, command: commandInput }),
    });
    const data = await res.json();
    if (!res.ok) { addToast(data.message ?? "Failed to queue command", "error"); return; }
    setSelectedCommandId(data.command._id);
    await loadCommands(selectedHostId);
    addToast("Command queued", "info");
  }

  async function copyText(value: string): Promise<void> {
    try { await navigator.clipboard.writeText(value); addToast("Copied to clipboard", "success"); }
    catch { addToast("Copy failed — please copy manually", "error"); }
  }

  function addToast(message: string, type: "success" | "error" | "info" = "info") {
    const id = String(Date.now() + Math.random());
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  async function onDeleteHost(hostId: string): Promise<void> {
    setDeletingHostId(null);
    const res = await fetch(`/api/hosts?id=${hostId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { addToast(data.message ?? "Failed to delete host", "error"); return; }
    addToast("Host deleted", "success");
    if (selectedHostId === hostId) { setSelectedHostId(""); setCommands([]); }
    await loadHosts();
  }

  function navigate(view: View) {
    router.push(VIEW_PATHS[view]);
  }

  /* ----- Provide --------------------------------------------------- */
  return (
    <DashboardContext.Provider
      value={{
        hosts, selectedHostId, setSelectedHostId, selectedHost,
        lastApiKey, commandInput, setCommandInput,
        commands, selectedCommandId, setSelectedCommandId,
        status, isBusy, autoRefresh, setAutoRefresh,
        sidebarOpen, setSidebarOpen,
        hostMetrics, metricsHistory, metricsLoading,
        refreshInterval, setRefreshInterval,
        toasts, setToasts, deletingHostId, setDeletingHostId,
        sseAlive, selectedCommand, counters, trendCpu, trendMem,
        linuxSnippet, windowsSnippet,
        loadHosts, loadCommands, loadHostMetrics, refreshDashboard,
        onCreateHost, onGenerateKey, onQueueCommand,
        copyText, addToast, onDeleteHost, navigate,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

/* ─── Hook ───────────────────────────────────────────────────────── */
export function useDashboard(): DashboardCtx {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
