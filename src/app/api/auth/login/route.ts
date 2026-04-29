import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { signToken, COOKIE_NAME, JWTPayload } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // ── Validation basique ──────────────────────────────────────────
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email et mot de passe requis." },
        { status: 400 }
      );
    }

    // ── Recherche dans la BDD ───────────────────────────────────────
    // On joint Compte et Utilisateur pour récupérer toutes les infos
    const [rows] = await pool.execute(
      `SELECT 
         c.IdCompte,
         c.email,
         c.mdp,
         u.IdUtilisateur,
         u.nom,
         u.prenom,
         u.role
       FROM Compte c
       INNER JOIN Utilisateur u ON u.IdCompte = c.IdCompte
       WHERE c.email = ?
       LIMIT 1`,
      [email.toLowerCase().trim()]
    );

    const users = rows as any[];

    // ── Utilisateur introuvable ─────────────────────────────────────
    // Message volontairement vague pour ne pas révéler si l'email existe
    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: "Email ou mot de passe incorrect." },
        { status: 401 }
      );
    }

    const user = users[0];

    // ── Vérification du mot de passe ────────────────────────────────
    const passwordMatch = await bcrypt.compare(password, user.mdp);

    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, error: "Email ou mot de passe incorrect." },
        { status: 401 }
      );
    }

    // ── Création du JWT ─────────────────────────────────────────────
    const payload: JWTPayload = {
      idUtilisateur: user.IdUtilisateur,
      idCompte:      user.IdCompte,
      email:         user.email,
      role:          user.role,
      nom:           user.nom,
      prenom:        user.prenom,
    };

    const token = signToken(payload);

    // ── Réponse avec cookie HttpOnly ────────────────────────────────
    const response = NextResponse.json({
      success: true,
      user: {
        id:     String(user.IdUtilisateur),
        email:  user.email,
        role:   user.role,
        name:   `${user.prenom} ${user.nom}`,
        avatar: `${user.prenom[0]}${user.nom[0]}`.toUpperCase(),
      },
    });

    // Cookie HttpOnly = inaccessible depuis JavaScript (protection XSS)
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production", // HTTPS en prod seulement
      sameSite: "lax",
      maxAge:   8 * 60 * 60, // 8 heures en secondes
      path:     "/",
    });

    return response;

  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur. Réessayez plus tard." },
      { status: 500 }
    );
  }
}