import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { MetricsModel } from "@/lib/models/metrics";
import { HostModel } from "@/lib/models/host";

/**
 * Server-Sent Events endpoint for real-time metrics.
 * Sends the latest metrics snapshot every 5 s while the client is connected.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ hostId: string }> }
) {
  try {
    await connectDb();
    const userId  = await requireUserId();
    const { hostId } = await params;

    const host = await HostModel.findOne({ _id: hostId, ownerId: userId }).lean();
    if (!host) {
      return NextResponse.json({ message: "Host not found" }, { status: 404 });
    }

    const encoder = new TextEncoder();
    const signal  = request.signal;

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: unknown) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {
            /* client gone */
          }
        };

        // Send initial snapshot immediately
        const initial = await MetricsModel.findOne({ hostId })
          .sort({ collectedAt: -1 })
          .lean();
        if (initial) send(initial);

        // Poll every 5 s
        const timer = setInterval(async () => {
          if (signal.aborted) { clearInterval(timer); return; }
          try {
            const snap = await MetricsModel.findOne({ hostId })
              .sort({ collectedAt: -1 })
              .lean();
            if (snap) send(snap);
          } catch {
            /* DB error — skip tick */
          }
        }, 5000);

        signal.addEventListener("abort", () => {
          clearInterval(timer);
          try { controller.close(); } catch { /**/ }
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type":  "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection":    "keep-alive",
        "X-Accel-Buffering": "no",  // disable Nginx buffering
      },
    });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Error" }, { status: 401 });
  }
}
