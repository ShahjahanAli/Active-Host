import { NextResponse } from "next/server";
import { requireAgentIdentity } from "@/lib/agentAuth";
import { connectDb } from "@/lib/db";
import { MetricsModel } from "@/lib/models/metrics";
import { agentMetricsSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    await connectDb();

    const body = await request.json();
    const parsed = agentMetricsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.flatten() }, { status: 400 });
    }

    const { agentId, apiKey, metrics } = parsed.data;
    const host = await requireAgentIdentity(agentId, apiKey);

    await MetricsModel.create({
      hostId: host._id,
      agentId,
      collectedAt: new Date(metrics.collectedAt),
      cpu: metrics.cpu,
      memory: metrics.memory,
      disks: metrics.disks,
      network: metrics.network,
      load: metrics.load,
      uptimeSeconds: metrics.uptimeSeconds,
      activeProcesses: metrics.activeProcesses,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to store metrics" },
      { status: 401 }
    );
  }
}
