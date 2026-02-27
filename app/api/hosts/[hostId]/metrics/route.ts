import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { MetricsModel } from "@/lib/models/metrics";
import { HostModel } from "@/lib/models/host";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ hostId: string }> }
) {
  try {
    await connectDb();
    const userId = await requireUserId();
    const { hostId } = await params;

    // Verify ownership
    const host = await HostModel.findOne({ _id: hostId, ownerId: userId }).lean();
    if (!host) {
      return NextResponse.json({ message: "Host not found" }, { status: 404 });
    }

    // Return the latest 60 snapshots (max ~30 min of 30s intervals)
    const metrics = await MetricsModel.find({ hostId: host._id })
      .sort({ collectedAt: -1 })
      .limit(60)
      .lean();

    return NextResponse.json({ metrics });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to fetch metrics" },
      { status: 401 }
    );
  }
}
