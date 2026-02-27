#!/usr/bin/env node
/**
 * Active Host — MCP Server
 *
 * Exposes Active Host capabilities as MCP tools so AI agents (Claude Desktop,
 * Cursor, Cline, etc.) can manage your server fleet directly.
 *
 * Transport: stdio (configure in your MCP client settings)
 * Communicates with Active Host via POST /api/mcp using a Bearer token.
 */
import "dotenv/config";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

/* ── Config ─────────────────────────────────────────────────────── */

const ACTIVE_HOST_URL = (process.env.ACTIVE_HOST_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
);
const MCP_SECRET = process.env.MCP_SECRET ?? "";

if (!MCP_SECRET) {
  console.error("[active-host-mcp] FATAL: MCP_SECRET env var is required");
  process.exit(1);
}

/* ── API helper ─────────────────────────────────────────────────── */

async function call(tool: string, params: Record<string, string | undefined> = {}) {
  const res = await fetch(`${ACTIVE_HOST_URL}/api/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MCP_SECRET}`,
    },
    body: JSON.stringify({ tool, params }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Active Host API ${res.status}: ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

/* ── Server ─────────────────────────────────────────────────────── */

const server = new McpServer({
  name: "active-host",
  version: "1.0.0",
  description:
    "Manage Linux servers through Active Host — run commands, monitor metrics, control infrastructure.",
});

/* ── Tools ──────────────────────────────────────────────────────── */

server.tool(
  "list_hosts",
  "List all registered server hosts with their name, address, environment, tags, and online/offline agent status.",
  {},
  async () => json(await call("list_hosts"))
);

server.tool(
  "get_host",
  "Get full details for a single host including its current agent status.",
  {
    hostId: z.string().describe("The _id of the host"),
  },
  async (args: { hostId: string }) => json(await call("get_host", { hostId: args.hostId }))
);

server.tool(
  "run_command",
  [
    "Queue a shell command to execute on a specific host.",
    "Returns a commandId — use get_command to poll for the result.",
    "The agent on the host picks up the command within its poll interval (~5s).",
  ].join(" "),
  {
    hostId: z.string().describe("The _id of the target host"),
    command: z.string().describe("The shell command to execute (e.g. 'df -h', 'systemctl status nginx')"),
  },
  async (args: { hostId: string; command: string }) =>
    json(await call("run_command", { hostId: args.hostId, command: args.command }))
);

server.tool(
  "get_command",
  [
    "Get the current status and output of a previously queued command.",
    "Poll this after run_command until status is 'succeeded' or 'failed'.",
    "Statuses: queued → running → succeeded | failed | cancelled.",
  ].join(" "),
  {
    commandId: z.string().describe("The commandId returned by run_command"),
  },
  async (args: { commandId: string }) => json(await call("get_command", { commandId: args.commandId }))
);

server.tool(
  "list_commands",
  "List recent commands (up to 50), ordered newest first. Optionally filter by host or status.",
  {
    hostId: z
      .string()
      .optional()
      .describe("Restrict to commands for this host _id (optional)"),
    status: z
      .enum(["queued", "running", "succeeded", "failed", "cancelled"])
      .optional()
      .describe("Filter by command status (optional)"),
  },
  async (args: { hostId?: string; status?: string }) =>
    json(await call("list_commands", { hostId: args.hostId, status: args.status }))
);

server.tool(
  "health",
  "Check whether the Active Host API is reachable and healthy.",
  {},
  async () => {
    try {
      const res = await fetch(`${ACTIVE_HOST_URL}/api/health`);
      const body = await res.json().catch(() => null);
      return json({ ok: res.ok, status: res.status, body });
    } catch (err) {
      return json({ ok: false, error: String(err) });
    }
  }
);

/* ── CI/CD Tools ─────────────────────────────────────────────────── */

server.tool(
  "list_projects",
  "List all CI/CD projects registered in Active Host. Returns name, git repo, branch, process manager, host, and Nginx settings.",
  {},
  async () => json(await call("list_projects"))
);

server.tool(
  "deploy_project",
  [
    "Trigger a CI/CD pipeline run for a specific project.",
    "This queues a deploy command on the remote host: git pull, install, build, test (optional), restart, Nginx reconfigure.",
    "Returns pipelineRunId and commandId — use get_pipeline_run to poll for status and logs.",
  ].join(" "),
  {
    projectId: z.string().describe("The _id of the project to deploy"),
  },
  async (args: { projectId: string }) =>
    json(await call("deploy_project", { projectId: args.projectId }))
);

server.tool(
  "get_pipeline_run",
  "Get the current status and full log output for a pipeline run. Poll this after deploy_project until status is 'succeeded' or 'failed'.",
  {
    runId: z.string().describe("The pipelineRunId returned by deploy_project"),
  },
  async (args: { runId: string }) =>
    json(await call("get_pipeline_run", { runId: args.runId }))
);

server.tool(
  "list_pipeline_runs",
  "List recent pipeline runs (up to 50), newest first. Optionally filter by project or status.",
  {
    projectId: z.string().optional().describe("Restrict to runs for this project _id (optional)"),
    status: z
      .enum(["pending", "running", "succeeded", "failed"])
      .optional()
      .describe("Filter by run status (optional)"),
  },
  async (args: { projectId?: string; status?: string }) =>
    json(await call("list_pipeline_runs", { projectId: args.projectId, status: args.status }))
);

/* ── Connect ────────────────────────────────────────────────────── */

const transport = new StdioServerTransport();
await server.connect(transport);
