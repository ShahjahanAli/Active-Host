# Agent Installation Guide

Instructions for deploying the RSM server agent on a managed Linux host.

---

## Overview

The **RSM agent** is a lightweight Node.js service that:

1. Registers itself with the RSM control plane on startup
2. Polls for queued shell commands every 5 seconds and executes them
3. Pushes system metrics (CPU, RAM, disk, network) every 30 seconds
4. Exposes a local `/health` and `/status` endpoint for monitoring

The agent has **no inbound firewall requirements** — all communication is outbound HTTPS to your RSM app URL.

---

## Requirements

| Requirement | Notes |
|---|---|
| Linux (Debian / Ubuntu / RHEL / Arch) | Any modern distro |
| Node.js ≥ 20 | See installation below |
| Internet access to RSM app URL | Outbound HTTPS (port 443) |
| `sudo` access (or root) | Required for infra/Docker/SSH features |

---

## Step 1 — Prepare the host in RSM

Before installing the agent, create the host record and generate an API key in your RSM dashboard:

1. Log in to your RSM dashboard.
2. Navigate to **Hosts** → **Add Host**.
3. Enter the server's name and save.
4. Navigate to **API Keys** (Settings sidebar) → select the new host → **Generate API Key**.
5. **Copy the raw API key now** — it is shown only once.
6. Note the **Host ID** displayed in the install snippet.

---

## Step 2 — Install Node.js on the remote host

If Node.js is not already installed:

```bash
# Ubuntu / Debian — Node.js 22 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# RHEL / CentOS / Fedora
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo dnf install -y nodejs

# Verify
node --version   # should print v22.x.x
```

---

## Step 3 — Clone the agent

```bash
sudo mkdir -p /opt/rsm-agent
sudo chown $USER:$USER /opt/rsm-agent
cd /opt/rsm-agent
git clone <repo-url> .
cd server-agent
```

Or copy only the `server-agent` directory if you don't want to clone the full repo.

---

## Step 4 — Configure environment

```bash
cp .env.example .env
nano .env
```

Fill in the following values:

```env
# URL of your RSM Next.js app (no trailing slash)
APP_URL=https://rsm.yourdomain.com

# Host ID from the RSM dashboard (Settings → API Keys)
AGENT_ID=<host-id-from-dashboard>

# Raw API key (shown once on generation)
AGENT_API_KEY=<your-api-key>

# Optional — adjust as needed
AGENT_PORT=4800
POLL_INTERVAL_MS=5000
METRICS_INTERVAL_MS=30000
COMMAND_TIMEOUT_MS=300000
```

---

## Step 5 — Install dependencies and build

> **Skip this step if you used `npm install -g rsm-agent`** — the package ships pre-built.

If you cloned from GitHub:

```bash
cd /opt/rsm-agent
npm install
npm run build    # compiles TypeScript → dist/
```

---

## Step 6 — Run as a systemd service

Create a systemd unit file:

```bash
sudo nano /etc/systemd/system/rsm-agent.service
```

Paste the following (adjust paths if needed):

```ini
[Unit]
Description=RSM Server Agent
After=network.target

[Service]
Type=simple
User=root
# npm global install:
EnvironmentFile=/etc/rsm-agent/.env
ExecStart=/usr/bin/rsm-agent

# -- OR -- git clone / manual build:
# WorkingDirectory=/opt/rsm-agent
# EnvironmentFile=/opt/rsm-agent/.env
# ExecStart=/usr/bin/node /opt/rsm-agent/dist/index.js

Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable rsm-agent
sudo systemctl start rsm-agent
```

Check the status:

```bash
sudo systemctl status rsm-agent
sudo journalctl -u rsm-agent -f    # live logs
```

---

## Step 7 — Verify the agent is online

1. Open your RSM dashboard.
2. Navigate to **Hosts** — your server should show a **green online indicator** within 10–15 seconds.
3. Navigate to **Real-time** (Monitoring) — metrics should start appearing within 30 seconds.

---

## Quick Verification Commands

```bash
# Check agent is listening
curl http://localhost:4800/health
# Expected: {"status":"ok"}

# Full status including agent state
curl http://localhost:4800/status
```

---

## Updating the Agent

### npm global install

```bash
npm install -g rsm-agent@latest
sudo systemctl restart rsm-agent
```

### Git clone

```bash
cd /opt/rsm-agent
git pull
npm install
npm run build
sudo systemctl restart rsm-agent
```

---

## Running Without systemd (PM2)

If you prefer PM2:

```bash
npm install -g pm2

# npm global install:
pm2 start rsm-agent --name rsm-agent --env-file /etc/rsm-agent/.env

# -- OR -- git clone:
# pm2 start /opt/rsm-agent/dist/index.js --name rsm-agent --env-file /opt/rsm-agent/.env

pm2 save
pm2 startup    # follow the printed instructions to enable on boot
```

---

## Docker Installation (alternative)

If you prefer to run the agent in Docker:

```dockerfile
# Dockerfile (server-agent/Dockerfile)
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist/ ./dist/
CMD ["node", "dist/index.js"]
```

Build and run:

```bash
cd server-agent
npm run build
docker build -t rsm-agent .
docker run -d \
  --name rsm-agent \
  --restart unless-stopped \
  --network host \
  --env-file .env \
  rsm-agent
```

> `--network host` is recommended so the agent can reach local services and `/proc/net/dev` is readable for network metrics.

---

## Sudo Configuration

Many infrastructure features (Nginx, certbot, UFW, Fail2ban) require `sudo`. If running the agent as a non-root user, add a sudoers entry:

```bash
sudo visudo
```

Add (replace `rsmagent` with your service user):

```
rsmagent ALL=(ALL) NOPASSWD: /usr/bin/nginx, /usr/bin/certbot, /usr/sbin/ufw, /usr/bin/fail2ban-client, /bin/systemctl
```

Or for full sudo access (simpler, less restrictive):

```
rsmagent ALL=(ALL) NOPASSWD: ALL
```

> Running as **root** is the simplest approach for a single-purpose managed server.

---

## Firewall Notes

The agent only makes **outbound** connections. You do not need to open any inbound ports for agent functionality.

The local port (`AGENT_PORT`, default `4800`) is only used for:
- `GET /health` — local health probes
- `GET /status` — local status inspection

It does not need to be accessible from the internet.

---

## Uninstalling

```bash
sudo systemctl stop rsm-agent
sudo systemctl disable rsm-agent
sudo rm /etc/systemd/system/rsm-agent.service
sudo systemctl daemon-reload

# npm global install:
npm uninstall -g rsm-agent
sudo rm -rf /etc/rsm-agent

# -- OR -- git clone:
# sudo rm -rf /opt/rsm-agent
```

Then delete the host from the RSM dashboard to remove all associated data.

---

## Troubleshooting

### Agent not appearing online

- Check `APP_URL` in `.env` — must be the full HTTPS URL with no trailing slash.
- Verify `AGENT_ID` matches exactly the Host ID shown in the dashboard.
- Check outbound HTTPS is not blocked: `curl -I https://rsm.yourdomain.com/api/health`

### "Invalid agent environment" at startup

Run `node dist/index.js` directly and read the error — it lists every missing or invalid env variable.

### Metrics not appearing

- Check `journalctl -u rsm-agent` for metric push errors.
- Verify the MongoDB `MetricsSnapshot` collection exists and has a TTL index on `collectedAt`.

### Commands timing out

Increase `COMMAND_TIMEOUT_MS` in `.env`. Default is 5 minutes. For long-running tasks (apt upgrade, database migrations) you may need 15–30 minutes (`900000`–`1800000`).

### Permission denied errors in command output

The agent is running as a user that lacks permission for the requested operation. Either:
- Switch the service user to `root`, or
- Add the required sudo rules (see [Sudo Configuration](#sudo-configuration) above).
