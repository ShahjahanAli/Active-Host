import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { PipelineRunModel } from "@/lib/models/pipeline-run";

export async function GET(request: Request) {
  try {
    await connectDb();
    const userId = await requireUserId();

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { ownerId: userId };
    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;

    const runs = await PipelineRunModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ runs });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Error" },
      { status: 401 }
    );
  }
}
