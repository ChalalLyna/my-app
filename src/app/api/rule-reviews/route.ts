import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { RuleReview } from "@/app/data/ruleReviews";
import { reviews } from "./_store";

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  if (!getUser(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(reviews);
}

export async function POST(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { ruleName, xml, filename, action } = body;

  if (!ruleName || !xml || !filename || !action) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const review: RuleReview = {
    id: `rev-${Date.now()}`,
    ruleName,
    xml,
    filename,
    action,
    submittedBy: `${payload.prenom} ${payload.nom}`,
    submittedById: String(payload.idUtilisateur),
    submittedAt: new Date().toISOString(),
    status: "pending",
  };

  reviews.unshift(review);
  return NextResponse.json(review, { status: 201 });
}
