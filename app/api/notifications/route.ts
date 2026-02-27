import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { NotificationWebhookModel } from "@/lib/models/notification";
import { z } from "zod";

const createSchema = z.object({
  name:   z.string().min(1).max(80),
  url:    z.string().url(),
  type:   z.enum(["discord", "slack", "telegram", "generic"]).default("generic"),
  events: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});

export async function GET() {
  try {
    await connectDb();
    const userId = await requireUserId();
    const webhooks = await NotificationWebhookModel.find({ userId }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ webhooks });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Error" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDb();
    const userId = await requireUserId();
    const body = createSchema.parse(await request.json());
    const webhook = await NotificationWebhookModel.create({ ...body, userId });
    return NextResponse.json({ webhook }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Error" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    await connectDb();
    const userId = await requireUserId();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });
    await NotificationWebhookModel.deleteOne({ _id: id, userId });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Error" }, { status: 401 });
  }
}
