# Setup Guide

Complete instructions for running Remote Server Manager locally and deploying to production.

---

## Prerequisites

| Tool | Minimum version | Notes |
|---|---|---|
| Node.js | 20 LTS | 22 LTS recommended |
| npm | 10+ | comes with Node |
| MongoDB | 7.0+ | or a free Atlas cluster |
| Git | any | |

---

## 1. Clone the repository

```bash
git clone <repo-url>
cd remoteservermanager.com
```

---

## 2. Install dependencies

```bash
npm install
```

---

## 3. Create Clerk application

1. Sign up at [clerk.com](https://clerk.com) (free tier is sufficient).
2. Create a new application.
3. In **Configure → API keys**, copy:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
4. In **Configure → Paths**, ensure Sign-in URL is `/sign-in` and Sign-up URL is `/sign-up`.

---

## 4. Create MongoDB database

**Option A — MongoDB Atlas (recommended)**

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a database user with read/write access.
3. Whitelist your IP (or use `0.0.0.0/0` for development).
4. Copy the connection string: `mongodb+srv://USER:PASS@cluster.mongodb.net/rsm`

**Option B — Local MongoDB**

```bash
# macOS (Homebrew)
brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community

# Ubuntu / Debian
sudo apt-get install -y mongodb
sudo systemctl start mongod
```

Connection string: `mongodb://localhost:27017/rsm`

---

## 5. Configure environment variables

Create `.env.local` in the project root:

```env
# ── MongoDB ──────────────────────────────────────────────
MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/rsm

# ── Agent key security ────────────────────────────────────
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
AGENT_API_KEY_PEPPER=your-random-32-byte-hex-string

# ── Clerk authentication ──────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# ── Optional: development auth bypass ────────────────────
# DEV_USER_ID=local-dev-user
```

> **Security note:** Never commit `.env.local` to version control. It is already in `.gitignore`.

### Generate the pepper

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).  
Sign up with Clerk, then navigate to the dashboard.

---

## 7. Set up the first host

1. In the dashboard, go to **Hosts** and click **Add Host**.
2. Enter a name (e.g. `my-server`) and save.
3. Go to **API Keys** (Settings), select your host, and click **Generate API Key**.
4. Copy the raw key — it is shown only once.
5. Note the **Host ID** shown in the key install snippet.

---

## 8. Install the agent on a remote host

See **[AGENT-INSTALL.md](AGENT-INSTALL.md)** for the full agent setup guide.

Quick start:

```bash
# On the remote host
cd /opt
git clone <repo-url> rsm-agent
cd rsm-agent/server-agent
cp .env.example .env
nano .env   # fill in APP_URL, AGENT_ID, AGENT_API_KEY
npm install
npm start
```

---

## Production Deployment

### Deploy to Vercel (recommended)

1. Push the repository to GitHub.
2. Import the project at [vercel.com/new](https://vercel.com/new).
3. Set the **Root Directory** to `.` (the Next.js app root).
4. Add all environment variables from `.env.local` in the Vercel project settings.
5. Deploy. Vercel auto-detects Next.js and configures everything.

> SSE (`/api/hosts/:id/metrics/stream`) requires a runtime that supports streaming responses. Vercel Edge Functions do not support SSE; use the **Node.js runtime** (default on Vercel Pro/Enterprise) or self-host.

### Deploy to a Node.js VPS

```bash
npm run build
npm start       # uses next start, port 3000 by default
```

Use PM2 for process management:

```bash
npm install -g pm2
pm2 start npm --name rsm -- start
pm2 save
pm2 startup
```

Use Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection '';        # keep-alive for SSE
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_buffering    off;                   # required for SSE
        proxy_cache        off;
        chunked_transfer_encoding on;
    }
}
```

> **Important for SSE:** `proxy_buffering off` and `Connection ''` (empty, not `upgrade`) are required so Nginx does not buffer the event stream.

---

## Environment Variable Reference

### Next.js App (`.env.local`)

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `MONGODB_DB` | optional | Database name (default: parsed from URI) |
| `AGENT_API_KEY_PEPPER` | ✅ | Server-side secret for hashing agent API keys |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk publishable key |
| `CLERK_SECRET_KEY` | ✅ | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | ✅ | Must be `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | ✅ | Must be `/sign-up` |
| `DEV_USER_ID` | dev only | Skip Clerk auth in local dev |

### Server Agent (`.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `APP_URL` | ✅ | — | Full URL of the RSM Next.js app |
| `AGENT_ID` | ✅ | — | Host ID from the RSM dashboard |
| `AGENT_API_KEY` | ✅ | — | Raw API key (shown once on generation) |
| `AGENT_PORT` | optional | `4800` | Local HTTP port for health/status endpoints |
| `AGENT_VERSION` | optional | `0.1.0` | Version string reported to dashboard |
| `POLL_INTERVAL_MS` | optional | `5000` | How often the agent polls for commands (ms) |
| `COMMAND_TIMEOUT_MS` | optional | `300000` | Max time a single command can run (ms) |
| `METRICS_INTERVAL_MS` | optional | `30000` | How often metrics are pushed (ms) |

---

## Scripts Reference

### Next.js App

```bash
npm run dev       # development server with hot reload (port 3000)
npm run build     # production build
npm run start     # run production build
npm run lint      # ESLint
```

### Server Agent

```bash
npm run dev       # tsx watch (hot reload)
npm run build     # tsc compile to dist/
npm run start     # run compiled dist/index.js
npm run typecheck # tsc --noEmit
npm run lint      # ESLint
```

---

## Troubleshooting

### "Invalid agent environment" on agent start

One or more required environment variables are missing or invalid. The error message lists every failing field. Check your `.env` file against the variable reference above.

### Agent shows "offline" in dashboard

- Verify `APP_URL` points to the live RSM app (no trailing slash, HTTPS in production).
- Check agent logs — the agent logs registration errors to stderr.
- Ensure `AGENT_ID` matches the Host ID exactly (copy it from the API key install snippet).

### SSE stream doesn't update

- Nginx: ensure `proxy_buffering off` is set.
- Vercel: SSE requires the Node.js runtime, not Edge.
- Check browser DevTools → Network → filter `text/event-stream` to confirm the stream is connected.

### Clerk "Unauthorized" on API calls

- Ensure `CLERK_SECRET_KEY` is set in the production environment (not just locally).
- Check that the Clerk application's allowed origins include your production domain.

### MongoDB connection refused

- Atlas: check that your server's IP is whitelisted in the Atlas network access list.
- Local: ensure `mongod` is running (`brew services list` or `systemctl status mongod`).
