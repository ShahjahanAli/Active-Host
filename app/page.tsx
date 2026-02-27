import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import { AuthRedirect } from "./auth-redirect";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
      <AuthRedirect />

      {/* ── NAV ──────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/[0.06] bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 shadow-lg shadow-indigo-500/30">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 6 0m-6 0H3.375A1.875 1.875 0 0 1 1.5 12.375V9.75m3.75 4.5V9.75m0 0A1.875 1.875 0 0 1 3.375 7.875H3.75m1.5 1.875h13.5M18.75 14.25a3 3 0 0 0 3-3m-3 3a3 3 0 1 1-6 0m6 0h1.875a1.875 1.875 0 0 0 1.875-1.875V9.75" />
              </svg>
            </div>
            <span className="font-semibold text-white">RemoteServer<span className="text-indigo-400">Manager</span></span>
          </div>
          <div className="hidden items-center gap-6 text-sm text-slate-400 md:flex">
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#how-it-works" className="transition hover:text-white">How It Works</a>
            <a href="#security" className="transition hover:text-white">Security</a>
          </div>
          <div className="flex items-center gap-2.5">
            <SignedOut>
              <Link href="/sign-in" className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white">
                Sign in
              </Link>
              <Link href="/sign-up" className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400">
                Get started free
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard" className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400">
                Open dashboard
              </Link>
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-16">
        {/* background glow orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="animate-pulse-glow absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[120px]" />
          <div className="absolute top-1/3 -left-32 h-[400px] w-[400px] rounded-full bg-violet-600/10 blur-[100px]" />
          <div className="absolute top-1/2 -right-32 h-[350px] w-[350px] rounded-full bg-cyan-600/10 blur-[100px]" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.04)_1px,transparent_1px)] bg-[size:64px_64px]" />

        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse inline-block" />
            Next.js 16 · Clerk Auth · MongoDB · WebSocket Agents
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Manage Remote Servers<br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
              From One Secure Panel
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-400 md:text-lg">
            Deploy lightweight agents to your servers, pair them in seconds, then dispatch
            shell commands, monitor status, and review output — all from a single modern
            control plane.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <SignedOut>
              <Link href="/sign-up" className="rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo-500/25 transition hover:bg-indigo-400 hover:-translate-y-0.5">
                Start for free →
              </Link>
              <Link href="/sign-in" className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">
                Sign in
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard" className="rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo-500/25 transition hover:bg-indigo-400">
                Open dashboard →
              </Link>
            </SignedIn>
          </div>
          <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
              No CC required
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
              End-to-end encrypted
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
              Open source agent
            </span>
          </div>
        </div>

        {/* Terminal mockup */}
        <div className="relative z-10 mx-auto mt-14 w-full max-w-3xl animate-float">
          <div className="rounded-2xl border border-white/10 bg-slate-900/90 shadow-2xl shadow-indigo-900/20 overflow-hidden glass">
            <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-red-500/70" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
              <span className="h-3 w-3 rounded-full bg-green-500/70" />
              <span className="ml-3 text-xs text-slate-500 font-mono">rsm — control plane</span>
            </div>
            <div className="p-5 font-mono text-xs leading-relaxed text-slate-300">
              <div className="flex gap-2"><span className="text-indigo-400">$</span> rsm hosts list</div>
              <div className="mt-2 rounded-lg bg-slate-800/60 p-3">
                <div className="grid grid-cols-4 gap-2 text-slate-500 text-[10px] mb-2 uppercase tracking-wide">
                  <span>Name</span><span>Address</span><span>Env</span><span>Status</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <span>prod-web-01</span><span>10.0.1.1</span><span>production</span><span className="text-emerald-400">● online</span>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  <span>prod-db-01</span><span>10.0.1.2</span><span>production</span><span className="text-emerald-400">● online</span>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  <span>staging-01</span><span>10.0.2.1</span><span>staging</span><span className="text-amber-400">○ offline</span>
                </div>
              </div>
              <div className="mt-3 flex gap-2"><span className="text-indigo-400">$</span> rsm run --host prod-web-01 &quot;df -h&quot;</div>
              <div className="mt-1 text-emerald-400">✓ Command queued · ID: cmd_9fKx2m · status: running</div>
            </div>
          </div>
          <div className="absolute -bottom-8 left-1/2 h-16 w-3/4 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-2xl" />
        </div>
      </section>

      {/* ── STATS BAND ───────────────────────────────────────── */}
      <section className="border-y border-white/[0.06] bg-slate-900/40 py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 md:grid-cols-4">
          {[
            { label: "Hosts managed", value: "10K+", color: "text-indigo-400" },
            { label: "Commands executed", value: "2M+", color: "text-violet-400" },
            { label: "Uptime guarantee", value: "99.9%", color: "text-emerald-400" },
            { label: "Setup time", value: "< 5 min", color: "text-cyan-400" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-3 py-1 text-xs font-medium text-indigo-400 mb-4">
              Platform features
            </div>
            <h2 className="text-3xl font-bold text-white md:text-4xl">Everything you need to manage<br className="hidden md:block" /> remote infrastructure</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-slate-400 md:text-base">A complete toolkit for securely connecting, monitoring, and controlling your fleet of remote servers.</p>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: "🔗", color: "bg-indigo-500/10 text-indigo-400",   title: "Secure Agent Pairing",       desc: "Generate one-time API keys per host. Agents authenticate cryptographically and register automatically." },
              { icon: "⚡", color: "bg-violet-500/10 text-violet-400",   title: "Remote Command Execution",   desc: "Queue shell commands from the browser. Agents pick them up and return stdout/stderr with live status." },
              { icon: "📊", color: "bg-cyan-500/10 text-cyan-400",       title: "Real-time Monitoring",       desc: "Heartbeat checks and auto-refresh keep you updated on agent connectivity at all times." },
              { icon: "🏷️", color: "bg-amber-500/10 text-amber-400",    title: "Multi-Environment Support",  desc: "Tag hosts by environment, region, or role. Filter production, staging, and dev fleets independently." },
              { icon: "🔒", color: "bg-rose-500/10 text-rose-400",       title: "Clerk-Powered Auth",         desc: "Enterprise-grade authentication with MFA, SSO, and per-user host isolation." },
              { icon: "📋", color: "bg-emerald-500/10 text-emerald-400", title: "Full Command History",       desc: "Every command stored with output, exit status, and timestamps. Audit trails built in by default." },
            ].map((f, i) => (
              <div key={i} className="group rounded-2xl border border-white/[0.07] bg-slate-900/50 p-6 transition hover:border-white/[0.12] hover:bg-slate-900/80">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-lg ${f.color} mb-4`}>{f.icon}</div>
                <h3 className="font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 bg-slate-900/30">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/5 px-3 py-1 text-xs font-medium text-violet-400 mb-4">Simple workflow</div>
            <h2 className="text-3xl font-bold text-white md:text-4xl">Up and running in minutes</h2>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              { step: "01", color: "text-indigo-400 border-indigo-500/30 bg-indigo-500/5", title: "Create a host",    desc: "Define your host with a name, IP address, environment tag, and optional metadata. Takes 10 seconds." },
              { step: "02", color: "text-violet-400 border-violet-500/30 bg-violet-500/5", title: "Pair your agent",  desc: "Generate a one-time API key, copy the install snippet, and run it on your server. Auto-registers." },
              { step: "03", color: "text-cyan-400   border-cyan-500/30   bg-cyan-500/5",   title: "Control remotely", desc: "Type any shell command in the dashboard. The agent executes it and returns results directly in the UI." },
            ].map((item) => (
              <div key={item.step} className="rounded-2xl border border-white/[0.07] bg-slate-900/50 p-8">
                <div className={`inline-flex items-center justify-center rounded-xl border px-3 py-1.5 text-lg font-bold ${item.color} mb-5`}>{item.step}</div>
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECURITY ─────────────────────────────────────────── */}
      <section id="security" className="py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl border border-white/[0.07] bg-gradient-to-br from-indigo-950/60 to-violet-950/60 p-10 md:p-14">
            <div className="grid gap-10 md:grid-cols-2 md:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-xs font-medium text-emerald-400 mb-4">Security first</div>
                <h2 className="text-2xl font-bold text-white md:text-3xl">Built with zero-trust principles</h2>
                <p className="mt-4 text-sm leading-relaxed text-slate-400">Every agent authenticates with a hashed API key that can never be recovered after generation. Commands are scoped per host, per user — no cross-tenant access possible.</p>
                <ul className="mt-6 space-y-3 text-sm text-slate-300">
                  {["One-time API keys, hashed at rest", "User-scoped host isolation", "TLS-only agent communication", "Clerk MFA & SSO support"].map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <svg className="h-4 w-4 flex-shrink-0 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" /></svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-slate-950/60 p-5 font-mono text-xs text-slate-400">
                <div className="mb-3 text-slate-500 text-[10px] uppercase tracking-widest">Key generation flow</div>
                <div className="space-y-1.5">
                  <div><span className="text-slate-500">// 1.</span> <span className="text-indigo-300">rawKey</span> = nanoid(48)</div>
                  <div><span className="text-slate-500">// 2.</span> <span className="text-violet-300">hash</span> = bcrypt(rawKey)</div>
                  <div><span className="text-slate-500">// 3. stored →</span> <span className="text-amber-300">hash only</span></div>
                  <div><span className="text-slate-500">// 4. returned →</span> <span className="text-emerald-300">rawKey once</span></div>
                  <div className="mt-3 text-slate-600">──────────────────────────</div>
                  <div className="text-emerald-400">✓ key never stored in plaintext</div>
                  <div className="text-emerald-400">✓ key shown exactly once</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold text-white md:text-4xl">Ready to take control?</h2>
          <p className="mx-auto mt-4 max-w-lg text-sm text-slate-400 md:text-base">Create your account, register a host, and connect your first agent in under 5 minutes.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <SignedOut>
              <Link href="/sign-up" className="rounded-xl bg-indigo-500 px-8 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo-500/25 transition hover:bg-indigo-400">
                Create free account →
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard" className="rounded-xl bg-indigo-500 px-8 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo-500/25 transition hover:bg-indigo-400">
                Go to dashboard →
              </Link>
            </SignedIn>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs text-slate-600 sm:flex-row">
          <span className="flex items-center gap-2 text-slate-500">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/80">
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 6 0m-6 0H3.375A1.875 1.875 0 0 1 1.5 12.375V9.75" /></svg>
            </span>
            Remote Server Manager
          </span>
          <span>© {new Date().getFullYear()} RemoteServerManager. Built with Next.js &amp; Clerk.</span>
          <div className="flex gap-5">
            <Link href="/sign-in" className="hover:text-slate-300 transition">Sign in</Link>
            <Link href="/sign-up" className="hover:text-slate-300 transition">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
