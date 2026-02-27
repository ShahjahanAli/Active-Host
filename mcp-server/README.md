# Active Host — MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that exposes your **Active Host** control plane as tools for AI agents. Once configured, AI assistants such as **Claude Desktop**, **Cursor**, or **Cline** can:

- List all your servers and their online/offline status
- Run shell commands on any host and read the output
- Query recent command history
- Check API health
- **Deploy projects** — trigger CI/CD pipeline runs and stream the logs back
- **List and monitor** pipeline runs across all projects

---

## Setup

### 1. Enable MCP on your Active Host deployment

Add two environment variables to your Vercel / Netlify project:

| Variable | Description |
|---|---|
| `MCP_SECRET` | A long random token (e.g. `openssl rand -hex 32`) |
| `MCP_OWNER_ID` | Your Clerk user ID (find it in the Clerk dashboard) |

### 2. Install & configure the MCP server

```bash
cd mcp-server
cp .env.example .env
# Edit .env: set ACTIVE_HOST_URL and MCP_SECRET
npm install
npm run build
```

### 3. Add to your AI client

#### Claude Desktop — `claude_desktop_config.json`

```json
{
  "mcpServers": {
    "active-host": {
      "command": "node",
      "args": ["/absolute/path/to/active-host/mcp-server/dist/index.js"],
      "env": {
        "ACTIVE_HOST_URL": "https://your-app.vercel.app",
        "MCP_SECRET": "your-secret-here"
      }
    }
  }
}
```

#### Cursor / Cline — MCP settings

```json
{
  "name": "active-host",
  "command": "node /absolute/path/to/active-host/mcp-server/dist/index.js",
  "env": {
    "ACTIVE_HOST_URL": "https://your-app.vercel.app",
    "MCP_SECRET": "your-secret-here"
  }
}
```

---

## Available Tools

### Server management

| Tool | Description |
|---|---|
| `list_hosts` | List all hosts with name, address, environment, tags, and agent status |
| `get_host` | Get full details for a single host by `hostId` |
| `run_command` | Queue a shell command on a host; returns a `commandId` |
| `get_command` | Poll command status + output by `commandId` |
| `list_commands` | List up to 50 recent commands, filterable by host or status |
| `health` | Check Active Host API health |

### CI/CD

| Tool | Description |
|---|---|
| `list_projects` | List all CI/CD projects with repo, branch, process manager, and host |
| `deploy_project` | Trigger a pipeline run for a project; returns `pipelineRunId` and `commandId` |
| `get_pipeline_run` | Get status + full log output for a run by `runId`; poll until `succeeded` or `failed` |
| `list_pipeline_runs` | List up to 50 recent pipeline runs, filterable by `projectId` or `status` |

---

## Example prompts

> "List all my servers and show which ones are online."

> "Run `df -h` on the production web server and show me the disk usage."

> "Show me the last 10 commands that ran on host abc123 and their statuses."

> "Check if nginx is running on my prod server."

> "List all my CI/CD projects."

> "Deploy the my-app project and wait for the pipeline to finish, then show me the output."

> "Show me the last 5 pipeline runs for the frontend project and their statuses."

> "Did the latest deployment of my-api succeed? Show me the logs."

---

## Development

```bash
npm run dev    # live-reload via tsx
npm run build  # compile TypeScript → dist/
```
