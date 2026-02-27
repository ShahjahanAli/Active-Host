import { customAlphabet } from "nanoid";
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { AgentModel } from "@/lib/models/agent";
import { HostModel } from "@/lib/models/host";
import { createHostSchema } from "@/lib/validators";

const makeAgentId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 16);

export async function GET() {
  try {
    await connectDb();
    const userId = await requireUserId();

    const hosts = await HostModel.find({ ownerId: userId }).sort({ createdAt: -1 }).lean();
    const agentIds = hosts.map((host) => host.agentId);
    const agents = await AgentModel.find({ agentId: { $in: agentIds } }).lean();

    const agentsById = new Map(
      agents.map((agent) => [agent.agentId, { status: agent.status, lastHeartbeatAt: agent.lastHeartbeatAt }])
    );

    const hostsWithAgentState = hosts.map((host) => ({
      ...host,
      agentStatus: agentsById.get(host.agentId)?.status ?? "offline",
      lastHeartbeatAt: agentsById.get(host.agentId)?.lastHeartbeatAt ?? null
    }));

    return NextResponse.json({ hosts: hostsWithAgentState });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to fetch hosts" },
      { status: 401 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectDb();
    const userId = await requireUserId();

    const body = await request.json();
    const parsed = createHostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.flatten() }, { status: 400 });
    }

    const host = await HostModel.create({
      ownerId: userId,
      ...parsed.data,
      agentId: `agt_${makeAgentId()}`
    });

    return NextResponse.json({ host }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to create host" },
      { status: 401 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await connectDb();
    const userId = await requireUserId();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });
    const result = await HostModel.deleteOne({ _id: id, ownerId: userId });
    if (result.deletedCount === 0)
      return NextResponse.json({ message: "Host not found" }, { status: 404 });
    return NextResponse.json({ message: "Host deleted" });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to delete host" },
      { status: 401 }
    );
  }
}
