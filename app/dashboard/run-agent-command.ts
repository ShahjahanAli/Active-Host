/**
 * Queues a shell command on the remote agent and polls until it completes.
 * Returns the stdout/stderr output (or an error string on failure/timeout).
 */
export async function runAgentCommand(
  hostId: string,
  command: string,
  timeoutMs = 60_000,
): Promise<{ success: boolean; output: string }> {
  try {
    const r = await fetch("/api/commands", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hostId, command }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      return { success: false, output: (d as { message?: string }).message ?? "Failed to queue command" };
    }
    const { command: queued } = (await r.json()) as { command: { _id: string } };
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      await new Promise((res) => setTimeout(res, 1800));
      const r2 = await fetch(`/api/commands/${queued._id}`);
      if (!r2.ok) continue;
      const d2 = (await r2.json()) as { command: { status: string; output?: string; error?: string } };
      const { status, output, error } = d2.command;
      if (status === "completed") return { success: true, output: output ?? "" };
      if (status === "failed" || status === "error")
        return { success: false, output: error ?? output ?? "Command failed" };
    }
    return { success: false, output: "Command timed out" };
  } catch (e) {
    return { success: false, output: e instanceof Error ? e.message : "Unknown error" };
  }
}
