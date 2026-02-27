# Active Host

> Open-source, self-hosted server control plane. Manage your entire fleet of Linux servers from a single dashboard — run commands, monitor real-time metrics, manage Nginx, SSL, Docker, cron jobs, SSH keys, firewalls, and more.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/your-username/active-host/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/active-host/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![MCP](https://img.shields.io/badge/MCP-AI%20Agent-8B5CF6)](mcp-server/README.md)
[![Deploy on Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)
[![Deploy on Netlify](https://img.shields.io/badge/Deploy-Netlify-00C7B7?logo=netlify)](https://netlify.com)

---

## Overview

**Active Host** is a **Next.js 16 fullstack application** paired with a lightweight **Express agent** that runs on each managed host. There is no separate backend service — the Next.js app handles both the UI and all API routes. Deploy the frontend on **Vercel** or **Netlify** and run the agent on any Linux server.

| Layer | Technology | Role |
|---|---|---|
| UI + API | Next.js 16 (App Router) | Dashboard, REST API, SSE streams |
| Auth | Clerk | User accounts, session management |
| Database | MongoDB + Mongoose | Hosts, commands, metrics, API keys, webhooks, CI/CD projects & runs |
| Agent | Express + TypeScript | Runs on each remote host, polls for commands, pushes metrics |
| Styling | Tailwind CSS v4 | Dark-mode first dashboard UI |
| Validation | Zod | Schema validation on both app and agent |
| CI/CD Platform | Built-in | Deploys any Git repo to any managed host via pipeline scripts |

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/your-username/active-host.git
cd active-host
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Required variables:

```env
MONGODB_URI=mongodb+srv://...
AGENT_API_KEY_PEPPER=<random-32-char-string>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

### 3. Run dev server

```bash
npm run dev        # http://localhost:3000
```

### 4. Install the agent on a remote host

```bash
cd server-agent
cp .env.example .env   # fill in APP_URL, AGENT_ID, AGENT_API_KEY
npm install
npm run build && npm start
```

See **[docs/AGENT-INSTALL.md](docs/AGENT-INSTALL.md)** for production (systemd) setup.

---

## Deployment

### Frontend — Vercel (recommended)

1. Push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new)
2. Set all environment variables from `.env.example` in the Vercel project settings
3. Deploy — Vercel auto-detects Next.js, zero config needed

### Frontend — Netlify

1. Import the repo at [app.netlify.com](https://app.netlify.com)
2. Set **Build command** to `npm run build` and **Publish directory** to `.next`
3. Install the [Netlify Next.js plugin](https://github.com/netlify/netlify-plugin-nextjs) by adding `@netlify/plugin-nextjs` to your Netlify config
4. Add all environment variables in **Site settings → Environment variables**

### Agent — any Linux server

The agent is a standalone Node.js process. Install it as a systemd service so it starts automatically on reboot. See [docs/AGENT-INSTALL.md](docs/AGENT-INSTALL.md) for the full guide.

---

## CI / CD

GitHub Actions workflows are in [`.github/workflows/`](.github/workflows/).

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | Push to `main`/`develop`, all PRs | Lint, type-check, and build the app, agent, and MCP server |
| `release-agent.yml` | Push tag `agent/v*` | Builds the agent, packages it, and creates a GitHub Release with a downloadable archive |

### Secrets required (Settings → Secrets → Actions)

| Secret | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |

### Releasing a new agent version

```bash
git tag agent/v1.2.0
git push origin agent/v1.2.0
# GitHub Actions builds the agent and creates a release automatically
```

---

## CI/CD Platform

Active Host acts as a **self-hosted CI/CD platform** for deploying any of your application projects onto managed hosts.

### Pipeline flow

```
GitHub push event
       │  POST /api/webhooks/github  (HMAC-SHA256 verified)
       ▼
 Active Host API
       │  creates Command (bash pipeline script) + PipelineRun
       ▼
 Remote Agent  (polls for queued commands)
       │  executes:
       │    1. git pull (or clone on first deploy)
       │    2. install  (npm ci / pip install / etc.)
       │    3. build    (npm run build / etc.)
       │    4. test     (optional)
       │    5. restart  (PM2 / systemd / Docker Compose)
       │    6. Nginx    (auto vhost + reload on first deploy)
       ▼
 Output streamed back → PipelineRun logs
```

### Creating a project

1. Go to **Dashboard → CI/CD → Projects** and click **+ New Project**
2. Fill in: Git repo (HTTPS clone URL), branch, work directory, install/build/test commands, process manager, and optionally Nginx domain settings
3. Click **▶ Deploy** for a manual run, or wire up the GitHub webhook for automatic deploys

### GitHub webhook

| Setting | Value |
|---|---|
| Payload URL | `https://<your-domain>/api/webhooks/github` |
| Content type | `application/json` |
| Secret | Copy the **webhookSecret** shown in the project card |
| Events | **Just the push event** |

> The webhook handler verifies the HMAC-SHA256 signature and only triggers a run when `ref` matches the configured branch.

### Process managers

| Manager | Restart command used |
|---|---|
| **PM2** | `pm2 restart <name>` (or `pm2 start npm --name <name> -- start` if not running) |
| **systemd** | `sudo systemctl restart <name>` |
| **Docker Compose** | `docker compose pull && docker compose up -d --force-recreate` |

### CI/CD API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create a project |
| `GET` | `/api/projects/:id` | Get a single project |
| `PATCH` | `/api/projects/:id` | Update a project |
| `DELETE` | `/api/projects/:id` | Delete a project |
| `POST` | `/api/projects/:id/deploy` | Trigger a manual pipeline run |
| `GET` | `/api/pipeline-runs` | List runs (`?projectId=` / `?status=`) |
| `GET` | `/api/pipeline-runs/:id` | Get run + live output |
| `POST` | `/api/webhooks/github` | GitHub push webhook receiver |

---

## MCP Server — AI Agent Integration

Active Host ships with a first-class **Model Context Protocol (MCP) server** that lets AI assistants (**Claude Desktop**, **Cursor**, **Cline**, etc.) manage your servers directly.

### How it works

```
AI Agent (Claude / Cursor)
        │  MCP (stdio)
        ▼
  mcp-server/           ← local MCP server process
        │  POST /api/mcp  Bearer <MCP_SECRET>
        ▼
  Active Host API       ← your Vercel / Netlify deployment
        │
        ▼
  MongoDB + Server Agents
```

### Enable on your deployment

Add to your Vercel / Netlify environment variables:

```env
MCP_SECRET=<openssl rand -hex 32>   # shared secret between MCP server and API
MCP_OWNER_ID=<your-clerk-user-id>   # scopes all MCP queries to your account
```

### Install the MCP server

```bash
cd mcp-server
cp .env.example .env   # set ACTIVE_HOST_URL and MCP_SECRET
npm install
npm run build
```

### Configure Claude Desktop

```json
{
  "mcpServers": {
    "active-host": {
      "command": "node",
      "args": ["/path/to/active-host/mcp-server/dist/index.js"],
      "env": {
        "ACTIVE_HOST_URL": "https://your-app.vercel.app",
        "MCP_SECRET": "your-secret-here"
      }
    }
  }
}
```

### Available MCP tools

**Server management**

| Tool | What it does |
|---|---|
| `list_hosts` | List all hosts with name, address, environment, tags, agent status |
| `get_host` | Get full details for a single host |
| `run_command` | Queue a shell command on a host; returns a `commandId` |
| `get_command` | Poll command status + output (queued → running → succeeded/failed) |
| `list_commands` | List recent commands, filterable by host or status |
| `health` | Check Active Host API reachability |

**CI/CD**

| Tool | What it does |
|---|---|
| `list_projects` | List all CI/CD projects with repo, branch, process manager, host |
| `deploy_project` | Trigger a pipeline run; returns `pipelineRunId` and `commandId` |
| `get_pipeline_run` | Get run status + full log output by `runId` |
| `list_pipeline_runs` | List recent runs, filterable by project or status |

See [mcp-server/README.md](mcp-server/README.md) for Cursor/Cline config and example prompts.

---

## Project Structure

```
active-host/
├── app/
│   ├── api/                         # REST + SSE API routes
│   │   ├── agents/                  # Agent registration, command dispatch, metrics ingest
│   │   ├── commands/                # Command CRUD + result polling
│   │   ├── hosts/                   # Host CRUD, API key management, SSE metrics stream
│   │   ├── projects/                # CI/CD project CRUD + manual deploy trigger
│   │   ├── pipeline-runs/           # Pipeline run list + status+output polling
│   │   ├── webhooks/github/         # GitHub push webhook (HMAC-SHA256 verified)
│   │   ├── notifications/           # Webhook notification CRUD
│   │   └── health/                  # Liveness probe
│   ├── dashboard/
│   │   ├── layout.tsx               # Auth guard + DashboardProvider + DashboardShell
│   │   ├── page.tsx                 # /dashboard → Overview
│   │   ├── dashboard-context.tsx    # All shared state & actions (React context)
│   │   ├── shell.tsx                # Sidebar (Link-based nav), topbar, toasts
│   │   ├── shared.tsx               # Icons, helpers, style constants
│   │   ├── hosts/page.tsx           # /dashboard/hosts
│   │   ├── commands/page.tsx        # /dashboard/commands
│   │   ├── monitoring/page.tsx      # /dashboard/monitoring
│   │   ├── keys/page.tsx            # /dashboard/keys
│   │   ├── notifications/page.tsx   # /dashboard/notifications
│   │   ├── apps/page.tsx            # /dashboard/apps
│   │   ├── docker/page.tsx          # /dashboard/docker
│   │   ├── nginx/page.tsx           # /dashboard/nginx
│   │   ├── ssl/page.tsx             # /dashboard/ssl
│   │   ├── firewall/page.tsx        # /dashboard/firewall
│   │   ├── cron/page.tsx            # /dashboard/cron
│   │   ├── ssh/page.tsx             # /dashboard/ssh
│   │   ├── fail2ban/page.tsx        # /dashboard/fail2ban
│   │   ├── projects/page.tsx        # /dashboard/projects
│   │   ├── pipeline/page.tsx        # /dashboard/pipeline
│   │   └── views/
│   │       ├── overview-view.tsx    # Control plane summary cards
│   │       ├── hosts-view.tsx       # Host fleet management
│   │       ├── commands-view.tsx    # Command queue & output
│   │       ├── monitoring-view.tsx  # Real-time SSE metrics + sparklines
│   │       ├── keys-view.tsx        # API key generation & install snippets
│   │       ├── infrastructure.tsx   # Nginx, SSL, UFW firewall, cron jobs
│   │       ├── security.tsx         # SSH keys, Fail2ban
│   │       ├── docker.tsx           # Containers, images, Compose
│   │       ├── notifications.tsx    # Webhook manager
│   │       ├── apps.tsx             # One-click app deployment
│   │       ├── projects-view.tsx    # CI/CD project list + create form
│   │       └── pipeline-view.tsx    # Pipeline run list + live log viewer
│   ├── sign-in/ & sign-up/          # Clerk hosted auth pages
│   └── globals.css / layout.tsx
├── lib/
│   ├── db.ts                        # Mongoose connection
│   ├── auth.ts                      # requireUserId() helper
│   ├── agentAuth.ts                 # Agent HMAC key verification
│   ├── apiKey.ts                    # Key hashing utilities
│   ├── validators.ts                # Shared Zod schemas
│   └── models/                      # Mongoose models (Host, Command, ApiKey, Agent, Notification, Project, PipelineRun)
├── server-agent/                    # Standalone agent — deploy to each remote host
│   └── src/
│       ├── app.ts                   # Express app (health + status endpoints)
│       ├── index.ts                 # Entry point
│       ├── config/env.ts            # Zod-validated env config
│       ├── services/
│       │   ├── agentSocketClient.ts # Command poll loop + metrics push
│       │   ├── commandRunner.ts     # Shell exec with streaming output
│       │   └── agentRegistry.ts     # Self-registration on startup
│       └── utils/system.ts          # OS metadata (hostname, IP, platform)
├── mcp-server/                      # MCP server — exposes Active Host as AI agent tools
│   ├── src/index.ts                 # MCP server (stdio transport, 10 tools)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── README.md
├── .github/
│   └── workflows/
│       ├── ci.yml                   # Lint · type-check · build (app + agent + mcp)
│       └── release-agent.yml        # Build & publish agent on tag push
├── docs/                            # Extended documentation
│   ├── FEATURES.md
│   ├── ARCHITECTURE.md
│   ├── SETUP.md
│   └── AGENT-INSTALL.md
└── proxy.ts                         # Optional dev reverse proxy
```

---

## Key Features

- **Real-time metrics** — CPU, RAM, disk, network, load average streamed via SSE
- **Command control** — queue shell commands, stream output back, view history
- **Nginx management** — list, enable/disable virtual hosts; create new vhosts
- **SSL / TLS** — Certbot certificate management, issue & renew Let's Encrypt certs
- **Firewall (UFW)** — visual rule list, add/delete rules, enable/disable
- **Cron jobs** — edit `crontab` with preset schedules, add/remove entries
- **SSH keys** — manage `~/.ssh/authorized_keys` entries
- **Fail2ban** — view jail status, see banned IPs, unban
- **Docker** — container list + start/stop/restart/logs, image prune, Compose up/down
- **App deploy** — one-click WordPress, Flask/Gunicorn, Node.js+PM2, Docker Compose
- **Webhooks** — Discord, Slack, Telegram and generic webhook alerts
- **URL-based routing** — every view has its own URL; browser history and deep links work natively
- **CI/CD Platform** — GitHub webhook → pipeline script → git pull → install → build → test → restart (PM2/systemd/Docker) → Nginx auto-vhost
- **Pipeline dashboard** — per-project run history with live log streaming, manual deploy button
- **MCP / AI Agent** — AI assistants can list hosts, run commands, deploy projects, and poll pipeline logs via the MCP server
- **GitHub Actions** — lint, type-check, and build all packages on push; agent releases automated on tag push

---

## Contributing

Contributions are welcome! Please open an issue or pull request on GitHub.

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "feat: add my feature"`
4. Push and open a pull request

Please follow the existing code style and add tests where applicable.

---

## Documentation

| Document | Description |
|---|---|
| [docs/FEATURES.md](docs/FEATURES.md) | Complete feature reference |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data flow, API reference |
| [docs/SETUP.md](docs/SETUP.md) | Full local + production setup guide |
| [docs/AGENT-INSTALL.md](docs/AGENT-INSTALL.md) | Agent installation & systemd configuration |

---

## Tech Stack

- **Next.js 16.1.6** — App Router, React Server Components, Route Handlers
- **React 19** — Client components, hooks, context
- **Tailwind CSS v4** — Utility-first styling
- **Clerk 6** — Authentication
- **Mongoose 9 / MongoDB** — Data layer
- **Zod 4** — Runtime schema validation
- **nanoid** — Collision-resistant ID generation
- **Express 5** — Agent HTTP server
- **tsx** — Agent TypeScript dev runner
- **@modelcontextprotocol/sdk** — MCP server SDK
- **GitHub Actions** — CI/CD automation

---

## License

[MIT](LICENSE) © Active Host Contributors