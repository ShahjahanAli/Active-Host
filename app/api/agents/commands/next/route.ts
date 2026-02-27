import { NextResponse } from "next/server";
import { requireAgentIdentity } from "@/lib/agentAuth";
import { connectDb } from "@/lib/db";
import { CommandModel } from "@/lib/models/command";
import { registerAgentSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    await connectDb();

    const body = await request.json();
    const parsed = registerAgentSchema.pick({ agentId: true, apiKey: true }).safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.flatten() }, { status: 400 });
    }

    const host = await requireAgentIdentity(parsed.data.agentId, parsed.data.apiKey);

    const command = await CommandModel.findOneAndUpdate(
      { hostId: host._id, agentId: host.agentId, status: "queued" },
      { status: "running", startedAt: new Date() },
      { sort: { createdAt: 1 }, new: true }
    );

    if (!command) {
      return NextResponse.json({ command: null });
    }

    return NextResponse.json({
      command: {
        id: String(command._id),
        text: command.command
      }
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to fetch next command" },
      { status: 401 }
    );
  }
}
