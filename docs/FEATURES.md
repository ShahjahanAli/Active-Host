# Feature Reference

Complete description of every feature available in Remote Server Manager.

---

## Table of Contents

1. [Dashboard Overview](#dashboard-overview)
2. [Host Management](#host-management)
3. [Command Control](#command-control)
4. [Real-time Monitoring](#real-time-monitoring)
5. [Infrastructure Management](#infrastructure-management)
   - [Nginx & Virtual Hosts](#nginx--virtual-hosts)
   - [SSL / TLS Certificates](#ssl--tls-certificates)
   - [Firewall (UFW)](#firewall-ufw)
   - [Cron Jobs](#cron-jobs)
6. [Security](#security)
   - [SSH Keys](#ssh-keys)
   - [Fail2ban](#fail2ban)
7. [Docker](#docker)
   - [Containers](#containers)
   - [Images](#images)
   - [Docker Compose](#docker-compose)
8. [App Deployment](#app-deployment)
9. [Notifications & Webhooks](#notifications--webhooks)
10. [API Keys](#api-keys)

---

## Dashboard Overview

The dashboard is a single-page client application that opens to the **Overview** panel. It provides:

- Total host count with online / offline breakdown
- Active command count
- Quick-access stat cards
- Global auto-refresh toggle with configurable interval (5 s / 15 s / 30 s / 60 s / 2 min)

Navigation is organised into six collapsible groups in the left sidebar:

| Group | Views |
|---|---|
| Control Plane | Overview, Hosts, Commands |
| Monitoring | Real-time, Notifications |
| Apps & Services | Deploy Apps, Docker |
| Infrastructure | Nginx & Domains, SSL / TLS, Firewall (UFW), Cron Jobs |
| Security | SSH Keys, Fail2ban |
| Settings | API Keys |

---

## Host Management

**View:** Hosts

| Action | Description |
|---|---|
| Add host | Name + optional description; creates a host record and generates a first API key |
| Delete host | Permanently removes host + all associated commands, metrics and API keys |
| Select host | Sets the active context for all other views (monitoring, infra, docker, etc.) |
| Status indicator | Green (online) / grey (offline) based on last agent heartbeat |

Hosts are scoped to the authenticated user — no cross-user data leakage.

---

## Command Control

**View:** Commands

Arbitrary shell commands can be queued and executed on any registered agent.

| Feature | Detail |
|---|---|
| Queue command | Select host → enter shell command → submit |
| Output streaming | Command stdout/stderr is captured and stored; results are polled via `GET /api/commands/[id]` |
| Status tracking | `queued` → `running` → `completed` / `failed` / `timed_out` |
| Timeout | Default 5 min; configurable per-agent via `COMMAND_TIMEOUT_MS` |
| History | Full command log with status badges, timestamps and output preview |
| Re-run | One-click re-queue from history |

Commands are executed by the agent via `child_process.spawn` with shell enabled.

---

## Real-time Monitoring

**View:** Real-time (under Monitoring)

Metrics are pushed from the agent every **30 seconds** (configurable) and streamed to the dashboard over **Server-Sent Events (SSE)**.

### Displayed Metrics

| Metric | Source |
|---|---|
| CPU usage % | `os.loadavg()` normalised by CPU count |
| RAM usage % | `os.totalmem()` vs `os.freemem()` |
| Disk usage % | `df -h /` output parsed |
| Network RX / TX | `/proc/net/dev` delta between snapshots |
| Load average | 1 / 5 / 15 min via `os.loadavg()` |
| Uptime | `os.uptime()` formatted as days/hours/minutes |
| Process count | `ps aux --no-header | wc -l` |

### Charts

- **Sparkline graphs** for CPU, RAM, Disk, Network (up to 60 data points / 30 min of history)
- **Health Score ring** — weighted composite: CPU 35% + RAM 35% + Disk 30%
- Live status chips for quick at-a-glance reading

### SSE Implementation

- Endpoint: `GET /api/hosts/[hostId]/metrics/stream`
- Initial seed: last 60 snapshots fetched from MongoDB (REST call at load time)
- Live updates: streamed via `ReadableStream` + 5 s MongoDB poll
- Auto-reconnect: browser `EventSource` handles reconnection natively

---

## Infrastructure Management

All infrastructure features run shell commands via the agent (`runAgentCommand` helper). The agent must have `sudo` access (NOPASSWD recommended for automation).

### Nginx & Virtual Hosts

**View:** Nginx & Domains

| Action | Command |
|---|---|
| List vhosts | `ls /etc/nginx/sites-available` |
| Enable vhost | `ln -s /etc/nginx/sites-available/X /etc/nginx/sites-enabled/X` |
| Disable vhost | `rm /etc/nginx/sites-enabled/X` |
| Reload Nginx | `sudo nginx -t && sudo systemctl reload nginx` |
| Create vhost | Generates a config file in `/etc/nginx/sites-available/` with optional PHP-FPM block, then enables and reloads |

New vhost creation prompts for: domain name, document root, PHP-FPM support toggle.

### SSL / TLS Certificates

**View:** SSL / TLS

| Action | Command |
|---|---|
| List certificates | `sudo certbot certificates` |
| Issue new cert | `sudo certbot --nginx -d DOMAIN [--email EMAIL] [--agree-tos] [-d www.DOMAIN]` |
| Renew all | `sudo certbot renew` |
| Dry run | `sudo certbot renew --dry-run` |

Requires Certbot installed on the host. Supports optional email registration and www-redirect variant.

### Firewall (UFW)

**View:** Firewall (UFW)

| Action | Command |
|---|---|
| Show rules | `sudo ufw status numbered` |
| Add allow rule | `sudo ufw allow [from IP] to any port PORT proto PROTO` |
| Add deny rule | `sudo ufw deny [from IP] to any port PORT proto PROTO` |
| Delete rule | `sudo ufw delete RULE_NUMBER` |
| Enable firewall | `sudo ufw --force enable` |
| Disable firewall | `sudo ufw disable` |

Rules are parsed from `ufw status numbered` output with a regex extractor; displayed in a table with delete buttons.

### Cron Jobs

**View:** Cron Jobs

| Action | Detail |
|---|---|
| List jobs | `crontab -l` parsed into schedule / command columns |
| Add job | Cron expression picker (presets + custom) + command input; piped back via `(crontab -l; echo "...") \| crontab -` |
| Remove job | Removes matching line via `crontab -l \| grep -v -F "..." \| crontab -` |

Built-in schedule presets: Every minute, Every hour, Daily midnight, Weekly Sunday, Monthly 1st.

---

## Security

### SSH Keys

**View:** SSH Keys

| Action | Command |
|---|---|
| List keys | `cat ~/.ssh/authorized_keys` → parsed into type / fingerprint / comment columns |
| Add key | `echo "PUBLIC_KEY" >> ~/.ssh/authorized_keys` |
| Remove key | `sed -i '/KEY_FINGERPRINT/d' ~/.ssh/authorized_keys` |

Keys are displayed with their type (e.g. `ssh-ed25519`, `ssh-rsa`) and comment. Supports any standard OpenSSH public key format.

### Fail2ban

**View:** Fail2ban

| Action | Command |
|---|---|
| List jails | `fail2ban-client status` → extract jail names |
| Jail details | `fail2ban-client status JAIL` → currently banned IPs, total banned, filter stats |
| Unban IP | `sudo fail2ban-client set JAIL unbanip IP` |

Requires `fail2ban` installed and running on the host.

---

## Docker

All Docker views require Docker installed on the managed host.

### Containers

**View:** Docker → Containers tab

| Action | Command |
|---|---|
| List all | `docker ps -a --format '{"ID":...}'` (JSON-per-line) |
| Start | `docker start CONTAINER` |
| Stop | `docker stop CONTAINER` |
| Restart | `docker restart CONTAINER` |
| Remove | `docker rm CONTAINER` |
| View logs | `docker logs --tail 100 CONTAINER` |
| Pull image | `docker pull IMAGE:TAG` |

Container list shows: ID (short), name, image, status, ports.

### Images

**View:** Docker → Images tab

| Action | Command |
|---|---|
| List images | `docker images --format '{"Repository":...}'` |
| Prune unused | `docker image prune -f` |

Displays: repository, tag, image ID, created date, size.

### Docker Compose

**View:** Docker → Compose tab

Operates on a Compose project directory on the remote host.

| Action | Command |
|---|---|
| Start services | `docker compose -f PATH/docker-compose.yml up -d` |
| Stop services | `docker compose -f PATH/docker-compose.yml down` |
| Update (pull) | `docker compose -f PATH/docker-compose.yml pull` |
| Status | `docker compose -f PATH/docker-compose.yml ps` |

Enter the absolute path to the `docker-compose.yml` on the remote host.

---

## App Deployment

**View:** Deploy Apps

One-click deployment templates. Each template installs dependencies, configures the service and starts it. All templates run as the user the agent is running as (root recommended for system-level installs).

| Template | What it installs |
|---|---|
| **WordPress** | PHP-FPM, MySQL/MariaDB, Nginx vhost, wp-cli; downloads and configures WordPress |
| **Flask / Gunicorn** | Python venv, Flask, Gunicorn, systemd service unit |
| **Node.js + PM2** | NodeSource LTS, PM2, `pm2 startup` configured |
| **Docker Compose** | Git-clones a repo (URL input) and runs `docker compose up -d` |

Each template exposes relevant options (domain, port, app name, repo URL, etc.) before deploying. Deployment output is streamed and displayed in-panel.

A **PM2 Process List** below the templates shows currently running PM2 processes on the host (`pm2 list --no-color`).

---

## Notifications & Webhooks

**View:** Notifications

Event-driven alerts sent to external services when monitored conditions occur.

### Supported Integrations

| Type | Payload format |
|---|---|
| Discord | `{"embeds": [...]}` with colour-coded embed |
| Slack | `{"blocks": [...]}` Block Kit format |
| Telegram | Requires bot token + chat ID; `sendMessage` API |
| Generic | Plain JSON `{"event": "...", "host": "...", "message": "..."}` |

### Available Events

| Event key | Trigger |
|---|---|
| `agent_online` | Agent connects / registers |
| `agent_offline` | Agent missed heartbeat |
| `high_cpu` | CPU > threshold |
| `high_memory` | RAM > threshold |
| `high_disk` | Disk > threshold |
| `command_failed` | Command exits non-zero or times out |
| `command_completed` | Command completes successfully |

### Managing Webhooks

- Create a webhook with a name, URL, type and event subscriptions
- Test button sends a sample payload immediately
- Delete removes permanently
- Webhooks are scoped per user (not per host)

---

## API Keys

**View:** API Keys (under Settings)

API keys are used to authenticate the agent to the RSM API.

| Action | Detail |
|---|---|
| Generate key | Creates a new key for a host; displayed once in plaintext, then stored hashed |
| Revoke key | Deletes the key; agent will fail authentication until a new key is provided |
| View keys | Lists all active keys for a host (ID + creation date; secret not shown) |
| Install snippet | Generates a copy-paste `.env` block for the agent |

Keys use HMAC-SHA256 with a server-side pepper (`AGENT_API_KEY_PEPPER`) for storage. The agent sends the raw key; the server hashes and compares.
