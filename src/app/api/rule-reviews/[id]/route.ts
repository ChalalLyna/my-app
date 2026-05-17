import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { reviews } from "../_store";

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (payload.role !== "consultant" && payload.role !== "admin") {
    return NextResponse.json({ error: "Forbidden — consultants only." }, { status: 403 });
  }

  const { id } = await params;
  const { status, comment } = await req.json();
  if (status !== "approved" && status !== "rejected") {
    return NextResponse.json({ error: "Status must be 'approved' or 'rejected'." }, { status: 400 });
  }

  const idx = reviews.findIndex(r => r.id === id);
  if (idx === -1) return NextResponse.json({ error: "Review not found." }, { status: 404 });

  reviews[idx] = {
    ...reviews[idx],
    status,
    reviewedBy: `${payload.prenom} ${payload.nom}`,
    reviewedAt: new Date().toISOString(),
    comment: comment ?? undefined,
  };

  return NextResponse.json(reviews[idx]);
}
