import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { PipelineRunModel } from "@/lib/models/pipeline-run";
import { CommandModel } from "@/lib/models/command";

type Params = { params: Promise<{ runId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await connectDb();
    const userId = await requireUserId();
    const { runId } = await params;

    const run = await PipelineRunModel.findOne({ _id: runId, ownerId: userId });
    if (!run) return NextResponse.json({ message: "Not found" }, { status: 404 });

    // Sync status from the underlying Command document
    if (run.status === "pending" || run.status === "running") {
      const cmd = await CommandModel.findById(run.commandId).lean();
      if (cmd) {
        const statusMap: Record<string, string> = {
          queued: "pending",
          running: "running",
          succeeded: "succeeded",
          failed: "failed",
          cancelled: "failed",
        };
        const mapped = statusMap[cmd.status] ?? run.status;
        if (mapped !== run.status) {
          run.status = mapped as typeof run.status;
          if (mapped === "succeeded" || mapped === "failed") {
            run.completedAt = cmd.completedAt ?? new Date();
          }
          await run.save();
        }
        return NextResponse.json({ run: run.toObject(), output: cmd.output ?? "" });
      }
    }

    return NextResponse.json({ run: run.toObject(), output: "" });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    );
  }
}
