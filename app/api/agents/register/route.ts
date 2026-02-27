import { NextResponse } from "next/server";
import { hashApiKey } from "@/lib/apiKey";
import { connectDb } from "@/lib/db";
import { AgentModel } from "@/lib/models/agent";
import { ApiKeyModel } from "@/lib/models/apiKey";
import { HostModel } from "@/lib/models/host";
import { registerAgentSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    await connectDb();

    const body = await request.json();
    const parsed = registerAgentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.flatten() }, { status: 400 });
    }

    const { agentId, apiKey, hostname, os, ip, version } = parsed.data;

    const host = await HostModel.findOne({ agentId });

    if (!host) {
      return NextResponse.json({ message: "Invalid agent identity" }, { status: 401 });
    }

    const keyHash = hashApiKey(apiKey);
    const validKey = await ApiKeyModel.findOne({ hostId: host._id, keyHash, revokedAt: null });

    if (!validKey) {
      return NextResponse.json({ message: "Invalid API key" }, { status: 401 });
    }

    const agent = await AgentModel.findOneAndUpdate(
      { agentId },
      {
        hostId: host._id,
        agentId,
        hostname: hostname ?? null,
        os: os ?? null,
        ip: ip ?? null,
        version: version ?? null,
        status: "online",
        lastHeartbeatAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      connected: true,
      agent: {
        id: agent.agentId,
        status: agent.status,
        hostId: agent.hostId
      }
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to register agent" },
      { status: 500 }
    );
  }
}
