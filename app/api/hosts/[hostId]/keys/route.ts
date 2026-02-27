import { NextResponse } from "next/server";
import { apiKeyPrefix, generateApiKey, hashApiKey } from "@/lib/apiKey";
import { requireUserId } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { ApiKeyModel } from "@/lib/models/apiKey";
import { HostModel } from "@/lib/models/host";

export async function POST(_request: Request, context: { params: Promise<{ hostId: string }> }) {
  try {
    await connectDb();
    const userId = await requireUserId();
    const { hostId } = await context.params;

    const host = await HostModel.findOne({ _id: hostId, ownerId: userId });

    if (!host) {
      return NextResponse.json({ message: "Host not found" }, { status: 404 });
    }

    await ApiKeyModel.updateMany({ hostId: host._id, revokedAt: null }, { revokedAt: new Date() });

    const rawApiKey = generateApiKey();
    const created = await ApiKeyModel.create({
      ownerId: userId,
      hostId: host._id,
      keyPrefix: apiKeyPrefix(rawApiKey),
      keyHash: hashApiKey(rawApiKey)
    });

    return NextResponse.json(
      {
        apiKey: rawApiKey,
        keyId: created._id,
        hostId: host._id,
        agentId: host.agentId,
        warning: "Store this API key now. It is shown only once."
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to generate key" },
      { status: 401 }
    );
  }
}
