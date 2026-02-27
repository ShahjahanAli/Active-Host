import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { connectDb } from "@/lib/db";
import { ProjectModel } from "@/lib/models/project";
import { PipelineRunModel } from "@/lib/models/pipeline-run";
import { CommandModel } from "@/lib/models/command";
import { HostModel } from "@/lib/models/host";
import { buildPipelineScript } from "@/lib/pipeline";

function verifySignature(secret: string, rawBody: string, sigHeader: string | null): boolean {
  if (!sigHeader) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sigHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const sigHeader = request.headers.get("x-hub-signature-256");
  const event = request.headers.get("x-github-event");

  // Only handle push events
  if (event !== "push") {
    return NextResponse.json({ message: "Ignored" });
  }

  let payload: {
    ref?: string;
    repository?: { clone_url?: string };
    head_commit?: { id?: string; message?: string; author?: { name?: string } };
    pusher?: { name?: string };
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const cloneUrl = payload.repository?.clone_url ?? "";
  const ref = payload.ref ?? ""; // refs/heads/main
  const pushedBranch = ref.replace("refs/heads/", "");
  const commitSha = payload.head_commit?.id ?? undefined;
  const commitMessage = payload.head_commit?.message ?? undefined;
  const pushedBy = payload.pusher?.name ?? payload.head_commit?.author?.name ?? undefined;

  if (!cloneUrl || !pushedBranch) {
    return NextResponse.json({ message: "Missing payload fields" }, { status: 400 });
  }

  await connectDb();

  // Find all projects matching this repo + branch (across all owners)
  const candidates = await ProjectModel.find({
    gitBranch: pushedBranch,
  }).lean();

  // Normalise a git repo URL for comparison (strip .git, lowercase)
  const normalise = (u: string) => u.replace(/\.git$/, "").toLowerCase();

  const matches = candidates.filter(
    (p) => normalise(p.gitRepo) === normalise(cloneUrl)
  );

  if (matches.length === 0) {
    return NextResponse.json({ message: "No matching project" }, { status: 404 });
  }

  const triggered: string[] = [];

  for (const project of matches) {
    // Verify HMAC against this project's webhookSecret
    if (!verifySignature(project.webhookSecret, rawBody, sigHeader)) {
      continue; // signature mismatch for this project — skip
    }

    const host = await HostModel.findOne({
      _id: project.hostId,
      ownerId: project.ownerId,
    }).lean();
    if (!host) continue;

    const script = buildPipelineScript({
      workDir: project.workDir,
      gitRepo: project.gitRepo,
      gitBranch: pushedBranch,
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
      ownerId: project.ownerId,
      hostId: project.hostId,
      agentId: host.agentId,
      command: script,
      status: "queued",
    });

    await PipelineRunModel.create({
      ownerId: project.ownerId,
      projectId: project._id,
      hostId: project.hostId,
      commandId: command._id,
      trigger: "webhook",
      status: "pending",
      branch: pushedBranch,
      commitSha,
      commitMessage,
      pushedBy,
      startedAt: new Date(),
    });

    triggered.push(String(project._id));
  }

  if (triggered.length === 0) {
    return NextResponse.json({ message: "Signature verification failed for all matching projects" }, { status: 401 });
  }

  return NextResponse.json({ triggered });
}
