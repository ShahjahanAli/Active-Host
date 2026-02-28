"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDashboard, VIEW_PATHS, HOST_VIEWS, pathToView } from "./dashboard-context";
import {
  VIEW_TITLES, agentDot,
  IconGrid, IconServer, IconTerminal, IconKey, IconMonitor,
  IconBell, IconRocket, IconDocker, IconGlobe, IconLock, IconShield,
  IconClock, IconAlertTriangle, IconLogo, IconRefresh, IconCiCd, IconList,
  btnSecondary,
} from "./shared";

type NavItem = { label: string; href: string; icon: React.ReactNode; badge?: number };
type NavGroup = { label: string; items: NavItem[] };

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const {
    sidebarOpen, setSidebarOpen,
    selectedHost, selectedHostId, setSelectedHostId,
    hosts, counters,
    isBusy, autoRefresh, setAutoRefresh,
    refreshDashboard,
    toasts, setToasts,
    deletingHostId, setDeletingHostId,
    onDeleteHost,
    navigate,
  } = useDashboard();

  const currentView = pathToView(pathname);
  const { title, subtitle } = VIEW_TITLES[currentView];

  /* ── Nav groups ───────────────────────────────────────────────── */
  const navGroups: NavGroup[] = [
    {
      label: "Control Plane",
      items: [
        { label: "Overview",   href: VIEW_PATHS.overview,   icon: <IconGrid /> },
        { label: "Hosts",      href: VIEW_PATHS.hosts,      icon: <IconServer />,   badge: counters.totalHosts },
        { label: "Terminal",   href: VIEW_PATHS.terminal,   icon: <IconTerminal /> },
        { label: "Commands",   href: VIEW_PATHS.commands,   icon: <IconList />, badge: counters.runningCommands || undefined },
      ],
    },
    {
      label: "Monitoring",
      items: [
        { label: "Real-time",     href: VIEW_PATHS.monitoring,    icon: <IconMonitor /> },
        { label: "Notifications", href: VIEW_PATHS.notifications, icon: <IconBell /> },
      ],
    },
    {
      label: "Apps & Services",
      items: [
        { label: "Deploy Apps", href: VIEW_PATHS.apps,    icon: <IconRocket /> },
        { label: "Docker",      href: VIEW_PATHS.docker,  icon: <IconDocker /> },
      ],
    },
    {
      label: "Infrastructure",
      items: [
        { label: "Nginx & Domains", href: VIEW_PATHS.nginx,    icon: <IconGlobe /> },
        { label: "SSL / TLS",       href: VIEW_PATHS.ssl,      icon: <IconLock /> },
        { label: "Firewall (UFW)",   href: VIEW_PATHS.firewall, icon: <IconShield /> },
        { label: "Cron Jobs",        href: VIEW_PATHS.cron,     icon: <IconClock /> },
      ],
    },
    {
      label: "Security",
      items: [
        { label: "SSH Keys", href: VIEW_PATHS.ssh,      icon: <IconKey /> },
        { label: "Fail2ban", href: VIEW_PATHS.fail2ban, icon: <IconAlertTriangle /> },
      ],
    },
    {
      label: "CI / CD",
      items: [
        { label: "Projects",      href: VIEW_PATHS.projects, icon: <IconCiCd /> },
        { label: "Pipeline Runs", href: VIEW_PATHS.pipeline,  icon: <IconList /> },
      ],
    },
    {
      label: "Settings",
      items: [
        { label: "API Keys", href: VIEW_PATHS.keys, icon: <IconKey /> },
      ],
    },
  ];

  /* ── Sidebar ──────────────────────────────────────────────────── */
  const Sidebar = (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-800 bg-slate-950 transition-transform duration-200 lg:translate-x-0 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-800 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
          <IconLogo />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">RSM</p>
          <p className="text-[10px] text-slate-500">Control Plane</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs transition ${
                        active
                          ? "bg-indigo-500/10 text-indigo-400 font-medium"
                          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                      {item.badge != null && item.badge > 0 && (
                        <span
                          className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                            active ? "bg-indigo-500/20 text-indigo-300" : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* Stats mini-panel */}
        <div className="border-t border-slate-800 pt-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Online agents</span>
              <span className="font-semibold text-emerald-400">{counters.onlineHosts}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-slate-400">
              <span>Offline agents</span>
              <span className="font-semibold text-slate-500">{counters.offlineHosts}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-slate-400">
              <span>Active commands</span>
              <span className={`font-semibold ${counters.runningCommands > 0 ? "text-amber-400" : "text-slate-500"}`}>
                {counters.runningCommands}
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-800 p-4 space-y-3">
        {/* Active host chip */}
        {selectedHost && (
          <button
            onClick={() => { router.push(VIEW_PATHS.monitoring); setSidebarOpen(false); }}
            className="flex w-full items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-left hover:border-slate-700 transition"
          >
            {agentDot(selectedHost.agentStatus)}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-slate-300">{selectedHost.name}</p>
              <p className="text-[10px] text-slate-600 truncate">{selectedHost.address}</p>
            </div>
            <svg className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          </button>
        )}
        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/" />
          <div className="min-w-0">
            <p className="truncate text-xs text-slate-400">Signed in</p>
          </div>
        </div>
      </div>
    </aside>
  );

  /* ── Top bar ──────────────────────────────────────────────────── */
  const isHostView = HOST_VIEWS.includes(currentView);
  const TopBar = (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-800 bg-slate-950/90 px-5 backdrop-blur">
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        className="rounded-md p-1.5 text-slate-400 hover:text-white lg:hidden"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
        </svg>
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-white">{title}</h1>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>

      {/* Host context pill */}
      {isHostView && (
        <div className="hidden items-center gap-2 sm:flex">
          {selectedHost ? (
            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5">
              {agentDot(selectedHost.agentStatus)}
              <span className="max-w-32 truncate text-xs font-medium text-slate-200">{selectedHost.name}</span>
              <select
                value={selectedHostId}
                onChange={(e) => setSelectedHostId(e.target.value)}
                className="ml-0.5 bg-transparent text-[10px] text-slate-500 outline-none cursor-pointer hover:text-slate-300 transition"
              >
                {hosts.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
              </select>
            </div>
          ) : (
            <button
              onClick={() => navigate("hosts")}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs text-amber-400 hover:bg-amber-500/10 transition"
            >
              ⚠ Select a host
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setAutoRefresh((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition ${
            autoRefresh
              ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-400"
              : "border-slate-700 text-slate-500 hover:text-slate-300"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${autoRefresh ? "bg-indigo-400 animate-pulse" : "bg-slate-600"}`} />
          Auto-refresh
        </button>
        <button
          onClick={() => void refreshDashboard()}
          disabled={isBusy}
          className={btnSecondary + " flex items-center gap-1.5"}
        >
          <IconRefresh spinning={isBusy} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </header>
  );

  /* ── No-host banner ───────────────────────────────────────────── */
  const hostRequiredViews: typeof HOST_VIEWS = ["docker", "nginx", "ssl", "firewall", "cron", "ssh", "fail2ban", "apps", "terminal"];
  const needsHost = (hostRequiredViews as string[]).includes(currentView) && !selectedHostId;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Toast overlay */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 shadow-xl backdrop-blur transition-all text-sm ${
              t.type === "success" ? "border-emerald-500/30 bg-slate-900/95 text-emerald-300"
              : t.type === "error"  ? "border-red-500/30 bg-slate-900/95 text-red-300"
              : "border-slate-700 bg-slate-900/95 text-slate-300"
            }`}
          >
            <span>{t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}</span>
            <span>{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="ml-2 text-slate-600 hover:text-slate-300 text-xs"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Delete host confirm dialog */}
      {deletingHostId && (() => {
        const h = hosts.find((x) => x._id === deletingHostId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
              <h2 className="text-base font-semibold text-white mb-1">Delete host?</h2>
              <p className="text-sm text-slate-400 mb-4">
                This will permanently delete{" "}
                <span className="font-medium text-slate-200">{h?.name}</span> and all associated data.
                This cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeletingHostId(null)} className={btnSecondary}>Cancel</button>
                <button
                  onClick={() => void onDeleteHost(deletingHostId)}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-400"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {Sidebar}

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden lg:pl-60">
        {TopBar}
        <main className="flex-1 overflow-y-auto p-5 md:p-7">
          {/* No-host banner */}
          {needsHost && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3.5">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-300">No host selected</p>
                <p className="text-xs text-slate-500">Select a host to use this panel.</p>
              </div>
              <button
                onClick={() => navigate("hosts")}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition"
              >
                Go to Hosts →
              </button>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
