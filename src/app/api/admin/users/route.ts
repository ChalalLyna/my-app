import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT u.IdUtilisateur, u.nom, u.prenom, u.role,
              c.IdCompte, c.email, c.DateCreation
       FROM Utilisateur u
       INNER JOIN Compte c ON c.IdCompte = u.IdCompte
       ORDER BY u.IdUtilisateur`
    );
    return NextResponse.json({ users: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const { nom, prenom, role, email, password } = await req.json();

    if (!nom || !prenom || !role || !email || !password) {
      return NextResponse.json({ error: "Tous les champs sont requis." }, { status: 400 });
    }

    if (!["apprenant", "consultant", "admin"].includes(role)) {
      return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [r1] = await conn.execute(
        "INSERT INTO Compte (email, mdp, DateCreation) VALUES (?, ?, CURDATE())",
        [email.toLowerCase().trim(), hashed]
      );
      const idCompte = (r1 as any).insertId;

      const [r2] = await conn.execute(
        "INSERT INTO Utilisateur (nom, prenom, role, IdCompte) VALUES (?, ?, ?, ?)",
        [nom, prenom, role, idCompte]
      );

      await conn.commit();
      return NextResponse.json({ success: true, idUtilisateur: (r2 as any).insertId }, { status: 201 });
    } catch (e: any) {
      await conn.rollback();
      if (e.code === "ER_DUP_ENTRY") {
        return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 409 });
      }
      throw e;
    } finally {
      conn.release();
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
