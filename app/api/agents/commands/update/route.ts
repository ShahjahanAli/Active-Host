import { NextResponse } from "next/server";
import { requireAgentIdentity } from "@/lib/agentAuth";
import { connectDb } from "@/lib/db";
import { CommandModel } from "@/lib/models/command";
import { registerAgentSchema, commandUpdateSchema } from "@/lib/validators";

const agentUpdateSchema = registerAgentSchema
  .pick({ agentId: true, apiKey: true })
  .merge(commandUpdateSchema.pick({ commandId: true, status: true, output: true, error: true }));

export async function PATCH(request: Request) {
  try {
    await connectDb();

    const body = await request.json();
    const parsed = agentUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.flatten() }, { status: 400 });
    }

    const host = await requireAgentIdentity(parsed.data.agentId, parsed.data.apiKey);

    const command = await CommandModel.findOne({
      _id: parsed.data.commandId,
      hostId: host._id,
      agentId: host.agentId
    });

    if (!command) {
      return NextResponse.json({ message: "Command not found" }, { status: 404 });
    }

    command.status = parsed.data.status;

    if (typeof parsed.data.output === "string") {
      command.output = `${command.output}${parsed.data.output}`;
    }

    if (typeof parsed.data.error === "string") {
      command.error = parsed.data.error;
    }

    if (["succeeded", "failed", "cancelled"].includes(parsed.data.status)) {
      command.completedAt = new Date();
    }

    await command.save();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to update command" },
      { status: 401 }
    );
  }
}
