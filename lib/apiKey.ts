import crypto from "node:crypto";

const API_KEY_PREFIX = "rsm_";

function apiKeyPepper(): string {
  const value = process.env.AGENT_API_KEY_PEPPER;
  if (!value || value.length < 16) {
    throw new Error("Missing or weak AGENT_API_KEY_PEPPER");
  }

  return value;
}

export function generateApiKey(): string {
  return `${API_KEY_PREFIX}${crypto.randomBytes(24).toString("hex")}`;
}

export function hashApiKey(apiKey: string): string {
  return crypto.createHmac("sha256", apiKeyPepper()).update(apiKey).digest("hex");
}

export function apiKeyPrefix(apiKey: string): string {
  return apiKey.slice(0, 12);
}
