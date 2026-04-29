import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Non authentifié." },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Session expirée." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id:     String(payload.idUtilisateur),
        email:  payload.email,
        role:   payload.role,
        name:   `${payload.prenom} ${payload.nom}`,
        avatar: `${payload.prenom[0]}${payload.nom[0]}`.toUpperCase(),
      },
    });

  } catch (error) {
    console.error("[GET /api/auth/me]", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur." },
      { status: 500 }
    );
  }
}