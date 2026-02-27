import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { AgentModel } from "@/lib/models/agent";
import { CommandModel } from "@/lib/models/command";
import { HostModel } from "@/lib/models/host";
import { ProjectModel } from "@/lib/models/project";
import { PipelineRunModel } from "@/lib/models/pipeline-run";
import { buildPipelineScript } from "@/lib/pipeline";

/**
 * MCP (Model Context Protocol) API route.
 *
 * Authenticated with a static Bearer token (`MCP_SECRET` env var).
 * All queries are scoped to the account owner identified by `MCP_OWNER_ID` env var.
 *
 * POST /api/mcp
 * Body: { tool: string, params: Record<string, string> }
 */

const MCP_SECRET = process.env.MCP_SECRET ?? "";
const MCP_OWNER_ID = process.env.MCP_OWNER_ID ?? "";

function authorized(req: Request): boolean {
  if (!MCP_SECRET) return false;
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  return token === MCP_SECRET;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!MCP_OWNER_ID) {
    return NextResponse.json(
      { message: "MCP_OWNER_ID is not configured on the server" },
      { status: 503 }
    );
  }

  try {
    await connectDb();
    const { tool, params = {} } = (await request.json()) as {
      tool: string;
      params: Record<string, string>;
    };

    switch (tool) {
      /* ── list_hosts ─────────────────────────────────────────────── */
      case "list_hosts": {
        const hosts = await HostModel.find({ ownerId: MCP_OWNER_ID })
          .sort({ createdAt: -1 })
          .lean();
        const agentIds = hosts.map((h) => h.agentId);
        const agents = await AgentModel.find({ agentId: { $in: agentIds } }).lean();
        const statusById = new Map(agents.map((a) => [a.agentId, a.status]));
        return NextResponse.json(
          hosts.map((h) => ({
            _id: h._id,
            name: h.name,
            address: h.address,
            environment: h.environment,
            tags: h.tags,
            agentId: h.agentId,
            agentStatus: statusById.get(h.agentId) ?? "offline",
          }))
        );
      }

      /* ── get_host ───────────────────────────────────────────────── */
      case "get_host": {
        const { hostId } = params;
        if (!hostId) return NextResponse.json({ message: "Missing hostId" }, { status: 400 });
        const host = await HostModel.findOne({ _id: hostId, ownerId: MCP_OWNER_ID }).lean();
        if (!host) return NextResponse.json({ message: "Host not found" }, { status: 404 });
        const agent = await AgentModel.findOne({ agentId: host.agentId }).lean();
        return NextResponse.json({ ...host, agentStatus: agent?.status ?? "offline" });
      }

      /* ── run_command ────────────────────────────────────────────── */
      case "run_command": {
        const { hostId, command } = params;
        if (!hostId || !command)
          return NextResponse.json({ message: "Missing hostId or command" }, { status: 400 });
        const host = await HostModel.findOne({ _id: hostId, ownerId: MCP_OWNER_ID }).lean();
        if (!host) return NextResponse.json({ message: "Host not found" }, { status: 404 });
        const doc = await CommandModel.create({
          ownerId: MCP_OWNER_ID,
          hostId,
          agentId: host.agentId,
          command,
          status: "queued",
        });
        return NextResponse.json({ commandId: String(doc._id), status: "queued" }, { status: 201 });
      }

      /* ── get_command ────────────────────────────────────────────── */
      case "get_command": {
        const { commandId } = params;
        if (!commandId) return NextResponse.json({ message: "Missing commandId" }, { status: 400 });
        const cmd = await CommandModel.findOne({ _id: commandId, ownerId: MCP_OWNER_ID }).lean();
        if (!cmd) return NextResponse.json({ message: "Command not found" }, { status: 404 });
        return NextResponse.json(cmd);
      }

      /* ── list_commands ──────────────────────────────────────────── */
      case "list_commands": {
        const filter: Record<string, unknown> = { ownerId: MCP_OWNER_ID };
        if (params.hostId) filter.hostId = params.hostId;
        if (params.status) filter.status = params.status;
        const cmds = await CommandModel.find(filter)
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();
        return NextResponse.json(cmds);
      }

      /* ── list_projects ──────────────────────────────────────────── */
      case "list_projects": {
        const projects = await ProjectModel.find({ ownerId: MCP_OWNER_ID })
          .sort({ createdAt: -1 })
          .lean();
        return NextResponse.json(projects);
      }

      /* ── deploy_project ─────────────────────────────────────────── */
      case "deploy_project": {
        const { projectId } = params;
        if (!projectId) return NextResponse.json({ message: "Missing projectId" }, { status: 400 });
        const project = await ProjectModel.findOne({ _id: projectId, ownerId: MCP_OWNER_ID });
        if (!project) return NextResponse.json({ message: "Project not found" }, { status: 404 });
        const host = await HostModel.findOne({ _id: project.hostId, ownerId: MCP_OWNER_ID }).lean();
        if (!host) return NextResponse.json({ message: "Host not found" }, { status: 404 });

        const script = buildPipelineScript({
          workDir: project.workDir,
          gitRepo: project.gitRepo,
          gitBranch: project.gitBranch,
          installCmd: project.installCmd,
          buildCmd: project.buildCmd,
          testCmd: project.testCmd,
          skipTests: project.skipTests,
          processManager: project.processManager,
          processName: project.processName,
          dockerComposeFile: project.dockerComposeFile,
          nginxEnabled: project.nginxEnabled,
          domain: project.domain,
          nginxPort: project.nginxPort,
        });

        const command = await CommandModel.create({
          ownerId: MCP_OWNER_ID,
          hostId: project.hostId,
          agentId: host.agentId,
          command: script,
          status: "queued",
        });
        const run = await PipelineRunModel.create({
          ownerId: MCP_OWNER_ID,
          projectId: project._id,
          hostId: project.hostId,
          commandId: command._id,
          trigger: "manual",
          status: "pending",
          branch: project.gitBranch,
          startedAt: new Date(),
        });
        return NextResponse.json({ pipelineRunId: String(run._id), commandId: String(command._id) }, { status: 201 });
      }

      /* ── get_pipeline_run ───────────────────────────────────────── */
      case "get_pipeline_run": {
        const { runId } = params;
        if (!runId) return NextResponse.json({ message: "Missing runId" }, { status: 400 });
        const run = await PipelineRunModel.findOne({ _id: runId, ownerId: MCP_OWNER_ID });
        if (!run) return NextResponse.json({ message: "Run not found" }, { status: 404 });
        const cmd = await CommandModel.findById(run.commandId).lean();
        return NextResponse.json({ run, output: cmd?.output ?? "" });
      }

      /* ── list_pipeline_runs ─────────────────────────────────────── */
      case "list_pipeline_runs": {
        const filter: Record<string, unknown> = { ownerId: MCP_OWNER_ID };
        if (params.projectId) filter.projectId = params.projectId;
        if (params.status) filter.status = params.status;
        const runs = await PipelineRunModel.find(filter)
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();
        return NextResponse.json(runs);
      }

      /* ── Unknown tool ───────────────────────────────────────────── */
      default:
        return NextResponse.json({ message: `Unknown tool: "${tool}"` }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
