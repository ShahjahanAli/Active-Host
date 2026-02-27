# Remote Server Manager - Server Agent

Standalone Express-based agent installed on each remote host.

## What it does

- Registers to Next.js API using `AGENT_ID` + `AGENT_API_KEY`
- Polls for queued commands from the Next.js command API
- Streams command output and completion status through agent update API calls
- Exposes local health/status endpoints

## Requirements

- Node.js 22+
- Next.js app URL reachable from host machine

## Setup

1. Clone this repository (or only this folder in your deployment pipeline).
2. Copy `.env.example` to `.env` and set values.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run in development:
   ```bash
   npm run dev
   ```
5. Build and run production:
   ```bash
   npm run build
   npm start
   ```

## Environment

- `APP_URL`: Next.js base URL, e.g. `https://app.yourdomain.com`
- `AGENT_ID`: Agent id from host creation in frontend
- `AGENT_API_KEY`: One-time key generated from frontend
- `AGENT_PORT`: Local agent HTTP port
- `POLL_INTERVAL_MS`: Poll interval for next command fetch
- `COMMAND_TIMEOUT_MS`: Max command execution time

## Endpoints (local)

- `GET /health`
- `GET /status`

## Install as service (recommended)

### Linux (systemd)

Create `/etc/systemd/system/rsm-agent.service`:

```ini
[Unit]
Description=RSM Server Agent
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/rsm/server-agent
ExecStart=/usr/bin/node /opt/rsm/server-agent/dist/index.js
Restart=always
EnvironmentFile=/opt/rsm/server-agent/.env

[Install]
WantedBy=multi-user.target
```

Then run:

```bash
sudo systemctl daemon-reload
sudo systemctl enable rsm-agent
sudo systemctl start rsm-agent
```

### Windows (Task Scheduler or NSSM)

Use NSSM or Task Scheduler to run:

```powershell
node D:\rsm\server-agent\dist\index.js
```

Set it to start automatically and restart on failure.
