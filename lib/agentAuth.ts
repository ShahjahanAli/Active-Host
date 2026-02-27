import { hashApiKey } from "@/lib/apiKey";
import { ApiKeyModel } from "@/lib/models/apiKey";
import { HostModel } from "@/lib/models/host";

export async function requireAgentIdentity(agentId: string, apiKey: string) {
  const host = await HostModel.findOne({ agentId });

  if (!host) {
    throw new Error("Invalid agent identity");
  }

  const keyHash = hashApiKey(apiKey);
  const validKey = await ApiKeyModel.findOne({ hostId: host._id, keyHash, revokedAt: null });

  if (!validKey) {
    throw new Error("Invalid API key");
  }

  return host;
}
