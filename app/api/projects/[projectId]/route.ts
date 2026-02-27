import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { ProjectModel } from "@/lib/models/project";
import { updateProjectSchema } from "@/lib/validators";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await connectDb();
    const userId = await requireUserId();
    const { projectId } = await params;
    const project = await ProjectModel.findOne({ _id: projectId, ownerId: userId }).lean();
    if (!project) return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Error" },
      { status: 401 }
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await connectDb();
    const userId = await requireUserId();
    const { projectId } = await params;

    const body = await request.json();
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.flatten() }, { status: 400 });
    }

    const project = await ProjectModel.findOneAndUpdate(
      { _id: projectId, ownerId: userId },
      { $set: parsed.data },
      { new: true }
    ).lean();
    if (!project) return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Error" },
      { status: 401 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await connectDb();
    const userId = await requireUserId();
    const { projectId } = await params;

    const result = await ProjectModel.deleteOne({ _id: projectId, ownerId: userId });
    if (result.deletedCount === 0)
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Error" },
      { status: 401 }
    );
  }
}
