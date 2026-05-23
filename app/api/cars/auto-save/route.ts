import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { saveDraftScore } from "@/lib/cars";

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole("teacher", "admin");

    const formData = await request.formData();
    const sessionId = parseInt(formData.get("session_id") as string);
    const itemId = parseInt(formData.get("item_id") as string);
    const score = formData.get("score") as string;
    const notes = formData.get("notes") as string;

    if (!sessionId || !itemId || !score) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const session = db
      .prepare("SELECT status FROM cars_sessions WHERE id = ?")
      .get(sessionId) as { status: string } | undefined;

    if (!session || session.status !== "draft") {
      return NextResponse.json(
        { error: "Session not found or not editable" },
        { status: 403 }
      );
    }

    saveDraftScore(sessionId, itemId, score, notes || null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Auto-save error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
