import { requireUserId } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { CommandModel } from "@/lib/models/command";

/**
 * GET /api/commands/[commandId]/stream
 *
 * Server-Sent Events endpoint that streams incremental command output to the
 * browser terminal.  It polls the DB every 500 ms and pushes any new bytes
 * since the last snapshot, then closes when the command reaches a terminal
 * state (succeeded | failed | cancelled) or after a 120-second safety timeout.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ commandId: string }> },
) {
  const { commandId } = await context.params;

  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  await connectDb();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const POLL_MS = 500;
      const TIMEOUT_MS = 120_000;
      const deadline = Date.now() + TIMEOUT_MS;
      let sentBytes = 0;

      const send = (event: string, data: string) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const tick = async () => {
        if (Date.now() > deadline) {
          send("done", "timeout");
          controller.close();
          return;
        }

        try {
          const doc = await CommandModel.findOne({ _id: commandId, ownerId: userId }).lean();
          if (!doc) {
            send("done", "not_found");
            controller.close();
            return;
          }

          const fullOutput = (doc.output ?? "") as string;
          if (fullOutput.length > sentBytes) {
            const chunk = fullOutput.slice(sentBytes);
            sentBytes = fullOutput.length;
            send("output", chunk);
          }

          const terminal = ["succeeded", "failed", "cancelled"];
          if (terminal.includes(doc.status as string)) {
            send("done", doc.status as string);
            controller.close();
            return;
          }
        } catch {
          send("done", "error");
          controller.close();
          return;
        }

        setTimeout(() => { void tick(); }, POLL_MS);
      };

      void tick();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
