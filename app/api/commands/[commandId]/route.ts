import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { CommandModel } from "@/lib/models/command";

export async function GET(_request: Request, context: { params: Promise<{ commandId: string }> }) {
  try {
    await connectDb();

    const userId = await requireUserId();
    const { commandId } = await context.params;

    const command = await CommandModel.findOne({ _id: commandId, ownerId: userId });

    if (!command) {
      return NextResponse.json({ message: "Command not found" }, { status: 404 });
    }

    return NextResponse.json({ command });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to fetch command" },
      { status: 401 }
    );
  }
}
