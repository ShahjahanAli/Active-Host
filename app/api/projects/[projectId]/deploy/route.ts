import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { ProjectModel } from "@/lib/models/project";
import { PipelineRunModel } from "@/lib/models/pipeline-run";
import { CommandModel } from "@/lib/models/command";
import { HostModel } from "@/lib/models/host";
import { buildPipelineScript } from "@/lib/pipeline";

type Params = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    await connectDb();
    const userId = await requireUserId();
    const { projectId } = await params;

    // Optional: allow passing commitSha / commitMessage / branch from request body
    const body = await request.json().catch(() => ({}));
    const { branch, commitSha, commitMessage, pushedBy } = body as Record<string, string>;

    const project = await ProjectModel.findOne({ _id: projectId, ownerId: userId });
    if (!project) return NextResponse.json({ message: "Project not found" }, { status: 404 });

    const host = await HostModel.findOne({ _id: project.hostId, ownerId: userId });
    if (!host) return NextResponse.json({ message: "Host not found" }, { status: 404 });

    const script = buildPipelineScript({
      workDir: project.workDir,
      gitRepo: project.gitRepo,
      gitBranch: branch ?? project.gitBranch,
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
      ownerId: userId,
      hostId: project.hostId,
      agentId: host.agentId,
      command: script,
      status: "queued",
    });

    const run = await PipelineRunModel.create({
      ownerId: userId,
      projectId: project._id,
      hostId: project.hostId,
      commandId: command._id,
      trigger: "manual",
      status: "pending",
      branch: branch ?? project.gitBranch,
      commitSha: commitSha ?? null,
      commitMessage: commitMessage ?? null,
      pushedBy: pushedBy ?? null,
      startedAt: new Date(),
    });

    return NextResponse.json({ pipelineRunId: run._id, commandId: command._id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    );
  }
}
