import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { saveDraftScore } from "@/lib/cpep";

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole("teacher", "admin");

    const formData = await request.formData();
    const sessionId = parseInt(formData.get("session_id") as string);
    const itemId = parseInt(formData.get("item_id") as string);
    const score = formData.get("score") as string;
    const notes = formData.get("notes") as string;

    if (!sessionId || !itemId || !score) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the session belongs to the current user
    const session = db
      .prepare("SELECT evaluator_user_id FROM cpep_sessions WHERE id = ?")
      .get(sessionId) as { evaluator_user_id: number } | undefined;

    if (!session || session.evaluator_user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    saveDraftScore(sessionId, itemId, score, notes || null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Auto-save error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
