import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { CommandModel } from "@/lib/models/command";
import { HostModel } from "@/lib/models/host";
import { createCommandSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    await connectDb();

    const userId = await requireUserId();
    const url = new URL(request.url);
    const hostId = url.searchParams.get("hostId");
    const limitParam = Number(url.searchParams.get("limit") ?? "20");
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 20;

    const query: { ownerId: string; hostId?: string } = { ownerId: userId };
    if (hostId) {
      query.hostId = hostId;
    }

    const commands = await CommandModel.find(query).sort({ createdAt: -1 }).limit(limit).lean();

    return NextResponse.json({ commands });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to fetch commands" },
      { status: 401 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectDb();

    const userId = await requireUserId();
    const body = await request.json();
    const parsed = createCommandSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.flatten() }, { status: 400 });
    }

    const host = await HostModel.findOne({ _id: parsed.data.hostId, ownerId: userId });

    if (!host) {
      return NextResponse.json({ message: "Host not found" }, { status: 404 });
    }

    const command = await CommandModel.create({
      ownerId: userId,
      hostId: host._id,
      agentId: host.agentId,
      command: parsed.data.command,
      status: "queued"
    });

    return NextResponse.json(
      {
        command,
        delivered: false,
        message: "Command queued. Use agent polling/WebSocket loop to execute and update status."
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to create command" },
      { status: 401 }
    );
  }
}
