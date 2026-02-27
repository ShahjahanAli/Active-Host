import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { requireUserId } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { ProjectModel } from "@/lib/models/project";
import { createProjectSchema } from "@/lib/validators";

const makeSecret = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  40
);

export async function GET() {
  try {
    await connectDb();
    const userId = await requireUserId();
    const projects = await ProjectModel.find({ ownerId: userId })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ projects });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to fetch projects" },
      { status: 401 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectDb();
    const userId = await requireUserId();

    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    // Generate a webhook secret if not provided
    if (!data.webhookSecret) {
      data.webhookSecret = makeSecret();
    }

    const project = await ProjectModel.create({ ownerId: userId, ...data });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to create project" },
      { status: 401 }
    );
  }
}
