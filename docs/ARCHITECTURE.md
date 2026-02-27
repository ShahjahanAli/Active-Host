# System Architecture

High-level and detailed design of Remote Server Manager.

---

## Table of Contents

1. [Overview](#overview)
2. [Component Diagram](#component-diagram)
3. [Data Flow](#data-flow)
   - [Agent Registration](#agent-registration)
   - [Command Execution](#command-execution)
   - [Metrics Collection & Streaming](#metrics-collection--streaming)
4. [Directory Structure](#directory-structure)
5. [API Reference](#api-reference)
6. [Database Schema](#database-schema)
7. [Authentication Model](#authentication-model)
8. [Agent Design](#agent-design)
9. [Frontend Architecture](#frontend-architecture)
10. [Deployment Topology](#deployment-topology)

---

## Overview

RSM follows a **hub-and-spoke** topology:

```
  Browser  ──HTTPS──▶  Next.js App (RSM)  ──MongoDB
                              │
       ┌──────────────────────┼──────────────────────┐
       ▼                      ▼                      ▼
   Agent (host A)         Agent (host B)         Agent (host N)
```

- The **Next.js app** is the single source of truth. It persists all state (hosts, commands, metrics, keys, webhooks) and serves both the frontend and API.
- **Agents** run on each managed Linux host. They have no database — they are stateless pollers that authenticate with a per-host API key.
- **No WebSocket server** is needed. Command dispatch uses HTTP long-poll and metrics use MongoDB as a relay, streamed to the browser via SSE.

---

## Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                  Browser (React 19 SPA)                 │
│                                                         │
│  DashboardClient (client component)                     │
│   ├─ Overview / Hosts / Commands                        │
│   ├─ Monitoring  ──SSE──▶ /api/hosts/:id/metrics/stream │
│   ├─ Infrastructure (Nginx, SSL, UFW, Cron)             │
│   ├─ Security (SSH, Fail2ban)                           │
│   ├─ Docker (Containers, Images, Compose)               │
│   ├─ Apps (Quick Deploy)                                │
│   └─ Notifications (Webhook manager)                    │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────┐
│             Next.js 16 App (RSM Control Plane)          │
│                                                         │
│  Route Handlers (app/api/)                              │
│   ├─ /agents/register        POST  – agent self-reg     │
│   ├─ /agents/commands/next   POST  – dequeue command    │
│   ├─ /agents/commands/update POST  – write result       │
│   ├─ /agents/metrics         POST  – ingest snapshot    │
│   ├─ /hosts                  GET POST DELETE            │
│   ├─ /hosts/:id/keys         GET POST DELETE            │
│   ├─ /hosts/:id/metrics      GET   – last 60 snapshots  │
│   ├─ /hosts/:id/metrics/stream GET  – SSE stream        │
│   ├─ /commands               GET POST                   │
│   ├─ /commands/:id           GET   – poll result        │
│   ├─ /notifications          GET POST DELETE            │
│   └─ /health                 GET   – liveness probe     │
│                                                         │
│  Mongoose Models                                        │
│   Host, Command, ApiKey, Agent, MetricsSnapshot,        │
│   NotificationWebhook                                   │
└──────────────────────────┬──────────────────────────────┘
                           │
                     ┌─────▼──────┐
                     │  MongoDB   │
                     └─────┬──────┘
                           │ poll / push
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
 ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
 │  Agent A    │   │  Agent B    │   │  Agent N    │
 │  host-a.com │   │  10.0.0.5   │   │  192.168.x  │
 └─────────────┘   └─────────────┘   └─────────────┘
```

---

## Data Flow

### Agent Registration

```
Agent start
    │
    ▼
POST /api/agents/register
  { agentId, apiKey, hostname, os, ip, version }
    │
    ▼
AgentAuth.verify(apiKey, hostId)  →  bcrypt compare
    │
    ▼
Upsert Agent document (hostname, ip, os, lastSeen, online=true)
    │
    ▼
200 OK  { registered: true }
```

The agent re-registers on every restart. This keeps `lastSeen` current and marks the agent online.

---

### Command Execution

```
Dashboard user clicks "Run command"
    │
    ▼
POST /api/commands  { hostId, text }
    │  requireUserId() → Clerk session
    ▼
Insert Command { status: "queued", text, hostId, userId }
    │
    ▼
Agent poll loop (every 5 s, configurable)
POST /api/agents/commands/next  { agentId, apiKey }
    │
    ▼
Dequeue oldest queued command for that host
Update Command { status: "running" }
    │
    ▼
Agent: child_process.spawn(command, { shell: true })
    │        stdout/stderr buffered
    ▼
POST /api/agents/commands/update  { commandId, status, output }
Update Command { status: "completed"|"failed", output }
    │
    ▼
Dashboard polls GET /api/commands/:id until status != "running"
    │  (runAgentCommand helper: 1.8 s interval, up to 60 s)
    ▼
Result rendered in panel
```

---

### Metrics Collection & Streaming

```
Agent metrics loop (every 30 s, configurable)
POST /api/agents/metrics  { agentId, apiKey, metrics: {...} }
    │
    ▼
Insert MetricsSnapshot { hostId, cpu, ram, disk, network, ... }
TTL index: documents auto-expire after 24 h
    │
    ▼  (separate path)
Browser opens SSE connection
GET /api/hosts/:hostId/metrics/stream
    │
    ├─ immediate: fetch last 60 snapshots → send each as "data: JSON\n\n"
    │
    └─ setInterval 5 s: fetch latest snapshot → send if newer than last sent
           │
           ▼
    Browser EventSource.onmessage
           │
           ▼
    setHostMetrics(snap)
    setMetricsHistory(prev → [...prev.slice(-59), snap])
           │
           ▼
    Re-render sparkline charts + stat chips
```

---

## Directory Structure

```
app/
├── api/
│   ├── agents/
│   │   ├── commands/next/route.ts     POST – dequeue next command for agent
│   │   ├── commands/update/route.ts   POST – write command result
│   │   ├── metrics/route.ts           POST – ingest metrics snapshot
│   │   └── register/route.ts          POST – agent self-registration
│   ├── commands/
│   │   ├── route.ts                   GET (list), POST (create)
│   │   └── [commandId]/route.ts       GET (poll single result)
│   ├── health/route.ts                GET – liveness
│   ├── hosts/
│   │   ├── route.ts                   GET (list), POST (create), DELETE
│   │   └── [hostId]/
│   │       ├── keys/route.ts          GET, POST, DELETE
│   │       ├── metrics/route.ts       GET – last N snapshots
│   │       └── metrics/stream/route.ts  GET – SSE stream
│   └── notifications/route.ts         GET, POST, DELETE
│
├── dashboard/
│   ├── dashboard-client.tsx           Root SPA shell
│   ├── run-agent-command.ts           Queue + poll helper
│   └── views/
│       ├── infrastructure.tsx         Nginx / SSL / UFW / Cron
│       ├── security.tsx               SSH keys / Fail2ban
│       ├── docker.tsx                 Containers / Images / Compose
│       ├── notifications.tsx          Webhook CRUD
│       └── apps.tsx                   Quick-deploy templates
│
lib/
├── db.ts              Mongoose connect (singleton pattern)
├── auth.ts            requireUserId() — Clerk + dev fallback
├── agentAuth.ts       Agent HMAC key verification
├── apiKey.ts          Key hashing (SHA-256 + pepper)
├── validators.ts      Shared Zod schemas
└── models/
    ├── agent.ts        Agent { agentId, hostId, lastSeen, online, ... }
    ├── apiKey.ts       ApiKey { hostId, userId, keyHash, name, ... }
    ├── command.ts      Command { hostId, userId, status, text, output, ... }
    ├── host.ts         Host { userId, name, description, ... }
    └── notification.ts NotificationWebhook { userId, url, type, events[], ... }

server-agent/src/
├── app.ts               Express app (GET /health, GET /status)
├── index.ts             Start HTTP server + agent client
├── config/env.ts        Zod-validated env (APP_URL, AGENT_ID, etc.)
├── services/
│   ├── agentRegistry.ts  POST /api/agents/register on startup
│   ├── agentSocketClient.ts  Poll loop + metrics push
│   └── commandRunner.ts  spawn() + stream output
└── utils/
    ├── system.ts         getSystemMetadata()
    └── metrics.ts        collectMetrics() — cpu/ram/disk/net via os + /proc
```

---

## API Reference

All API routes require Clerk authentication via session cookie except agent routes, which use API key authentication.

### Agent Routes (API key auth)

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/api/agents/register` | `{ agentId, apiKey, hostname, os, ip, version }` | Agent self-registration |
| POST | `/api/agents/commands/next` | `{ agentId, apiKey }` | Dequeue next queued command |
| POST | `/api/agents/commands/update` | `{ commandId, agentId, apiKey, status, output }` | Write command result |
| POST | `/api/agents/metrics` | `{ agentId, apiKey, metrics }` | Ingest metrics snapshot |

### User Routes (Clerk session)

| Method | Path | Description |
|---|---|---|
| GET | `/api/hosts` | List hosts for current user |
| POST | `/api/hosts` | Create host |
| DELETE | `/api/hosts?id=` | Delete host |
| GET | `/api/hosts/:hostId/keys` | List API keys for host |
| POST | `/api/hosts/:hostId/keys` | Generate new API key |
| DELETE | `/api/hosts/:hostId/keys?id=` | Revoke API key |
| GET | `/api/hosts/:hostId/metrics` | Fetch last N snapshots |
| GET | `/api/hosts/:hostId/metrics/stream` | SSE stream of live metrics |
| GET | `/api/commands` | List commands (optionally filter by hostId) |
| POST | `/api/commands` | Queue new command |
| GET | `/api/commands/:commandId` | Poll command result |
| GET | `/api/notifications` | List webhooks |
| POST | `/api/notifications` | Create webhook |
| DELETE | `/api/notifications?id=` | Delete webhook |
| GET | `/api/health` | Liveness probe (no auth) |

---

## Database Schema

### Host

```
{
  _id:          ObjectId
  userId:       string          // Clerk user ID
  name:         string
  description:  string?
  createdAt:    Date
}
```

### ApiKey

```
{
  _id:        ObjectId
  hostId:     ObjectId (ref: Host)
  userId:     string
  name:       string
  keyHash:    string            // SHA-256(key + pepper)
  createdAt:  Date
}
```

### Agent

```
{
  _id:           ObjectId
  agentId:       string         // matches Host._id
  hostId:        ObjectId (ref: Host)
  hostname:      string
  ip:            string
  os:            string
  version:       string
  online:        boolean
  lastSeen:      Date
  pollErrors:    number
}
```

### Command

```
{
  _id:        ObjectId
  hostId:     ObjectId (ref: Host)
  userId:     string
  text:       string            // shell command
  status:     "queued" | "running" | "completed" | "failed" | "timed_out"
  output:     string?
  createdAt:  Date
  updatedAt:  Date
}
```

### MetricsSnapshot

```
{
  _id:          ObjectId
  hostId:       ObjectId (ref: Host)
  collectedAt:  Date
  cpu:          number          // percentage 0-100
  ram:          number          // percentage 0-100
  disk:         number          // percentage 0-100
  networkRx:    number          // bytes/s
  networkTx:    number          // bytes/s
  loadAvg:      [number, number, number]   // 1/5/15 min
  uptime:       number          // seconds
  processes:    number
  // TTL index: expires after 24 hours
}
```

### NotificationWebhook

```
{
  _id:       ObjectId
  userId:    string
  name:      string
  url:       string
  type:      "discord" | "slack" | "telegram" | "generic"
  events:    string[]           // subset of event keys
  active:    boolean
  createdAt: Date
}
```

---

## Authentication Model

### User Authentication (Clerk)

All dashboard routes and user-facing API routes are protected by [Clerk](https://clerk.com/). The `requireUserId()` helper:

1. Calls `auth()` from `@clerk/nextjs/server`
2. Falls back to `x-user-id` request header or `DEV_USER_ID` env var in development
3. Throws a 401 if no identity can be established

Data isolation: all MongoDB queries include a `userId` filter derived from the authenticated session, ensuring users can only access their own hosts, commands and keys.

### Agent Authentication (HMAC API Key)

Each host has one or more API keys. The key lifecycle:

1. Dashboard generates a random key with `nanoid`
2. Key is hashed: `SHA-256(rawKey + AGENT_API_KEY_PEPPER)` and stored in MongoDB
3. The raw key is shown once to the user for the agent `.env`
4. Agent sends the raw key in every request body
5. Server re-hashes and compares (constant-time comparison)

No JWT tokens are used for agent communication — simple API key per request.

---

## Agent Design

### Startup Sequence

```
index.ts
  │
  ├─ validateEnv()          — Zod parse of process.env
  ├─ app.listen(PORT)       — Express HTTP (health + status)
  ├─ registerAgent()        — POST /api/agents/register
  └─ startSocketClient()
        ├─ pushMetrics()    — immediate first push
        ├─ setInterval(pushMetrics, METRICS_INTERVAL_MS)
        └─ pollLoop()
              └─ setInterval(loop, POLL_INTERVAL_MS)
```

### Poll Loop

The agent polls `POST /api/agents/commands/next` every `POLL_INTERVAL_MS` (default 5 s). If a command is returned:

1. Updates command status to `running` via `POST /api/agents/commands/update`
2. Spawns a child process with `{ shell: true }`
3. Buffers stdout + stderr
4. On completion, posts final status + full output

Only **one command runs at a time** per agent. The next poll only dequeues after the current command finishes.

### Metrics Collection

The `collectMetrics()` utility reads:

- `os.cpus()`, `os.loadavg()` — CPU load
- `os.totalmem()`, `os.freemem()` — RAM
- `df -h /` — disk usage
- `/proc/net/dev` — network interface bytes (delta between calls)
- `os.uptime()` — uptime
- `ps aux --no-header | wc -l` — process count

Results are posted to `/api/agents/metrics`. The server stores a `MetricsSnapshot` document with a 24-hour TTL index.

---

## Frontend Architecture

### State Management

No external state library is used. All state lives in `DashboardClient` as `useState` / `useRef` hooks:

| State | Type | Purpose |
|---|---|---|
| `currentView` | `View` (union) | Which panel is rendered |
| `hosts` | `Host[]` | All hosts for the user |
| `selectedHostId` | `string` | Active host context |
| `commands` | `Command[]` | Command history for selected host |
| `hostMetrics` | `HostMetrics \| null` | Latest metrics snapshot |
| `metricsHistory` | `HostMetrics[]` | Up to 60 snapshots for charts |
| `sseRef` | `React.MutableRefObject<EventSource>` | Live SSE connection |
| `autoRefresh` | `boolean` | Global auto-refresh toggle |
| `refreshInterval` | `number` | Seconds between REST refreshes |

### View Components

Each view in `app/dashboard/views/` is a self-contained React component:

- Manages own local state (loading, output, form fields)
- Receives `hostId: string` and CSS class strings (`inputCls`, `btnPrimary`, `btnSecondary`) as props
- Calls `runAgentCommand(hostId, shellCommand)` for all host interactions
- No routing library — `currentView` state drives rendering via a `viewContent` Record

### SSE Connection Lifecycle

```
selectedHostId changes
    │
    ├─ sseRef.current?.close()     close previous SSE
    ├─ fetch /metrics (REST)       seed 60 history snapshots
    └─ new EventSource(stream URL)
            │
            ├─ onmessage → update hostMetrics + metricsHistory
            └─ onerror   → close

component unmount
    └─ sseRef.current?.close()
```

---

## Deployment Topology

### Single-Region (Typical)

```
Internet
    │
    ▼
Nginx / Vercel / Cloudflare
    │  HTTPS
    ▼
Next.js App  (RSM)  ──── MongoDB Atlas
    │
    ▼  HTTPS (outbound from agents)
Managed Hosts (VPS, Bare Metal, Cloud VMs)
    └─ Agent process (systemd service)
```

### Recommended Production Setup

| Component | Recommendation |
|---|---|
| Next.js app | Vercel (zero-config) or any Node.js host |
| MongoDB | MongoDB Atlas M10+ (for replica set + TTL support) |
| Agent | systemd service, run as `root` or `sudo`-capable user |
| TLS | Terminate at load balancer or Vercel edge |
| Secrets | Environment variables only (no secrets in DB) |

### Scaling Considerations

- The Next.js app is stateless (all state in MongoDB) and scales horizontally
- SSE connections are per-process; behind a load balancer, sticky sessions or a pub/sub relay (e.g. Redis) would be needed for SSE at scale
- Agent poll interval can be increased to reduce API load on large fleets
- MetricsSnapshot TTL (24 h) caps storage growth; extend in `lib/models/agent.ts` if longer history is needed
