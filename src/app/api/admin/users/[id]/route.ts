import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { RowDataPacket } from "mysql2";

function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID invalide." }, { status: 400 });
  }

  try {
    const { nom, prenom, role, email, password } = await req.json();

    if (!nom || !prenom || !role || !email) {
      return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });
    }

    if (!["apprenant", "consultant", "admin"].includes(role)) {
      return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
    }

    const [rows] = await pool.execute(
      "SELECT IdCompte FROM Utilisateur WHERE IdUtilisateur = ?",
      [id]
    );
    const list = rows as any[];
    if (list.length === 0) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }
    const { IdCompte } = list[0];

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (password) {
        const hashed = await bcrypt.hash(password, 12);
        await conn.execute(
          "UPDATE Compte SET email = ?, mdp = ? WHERE IdCompte = ?",
          [email.toLowerCase().trim(), hashed, IdCompte]
        );
      } else {
        await conn.execute(
          "UPDATE Compte SET email = ? WHERE IdCompte = ?",
          [email.toLowerCase().trim(), IdCompte]
        );
      }

      await conn.execute(
        "UPDATE Utilisateur SET nom = ?, prenom = ?, role = ? WHERE IdUtilisateur = ?",
        [nom, prenom, role, id]
      );

      await conn.commit();
      return NextResponse.json({ success: true });
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (isNaN(id)) return NextResponse.json({ error: "ID invalide." }, { status: 400 });

  const { rangeStart, rangeEnd } = await req.json();

  // Allow clearing the range
  if (rangeStart === null && rangeEnd === null) {
    await pool.execute(
      "UPDATE Utilisateur SET rangeStart = NULL, rangeEnd = NULL WHERE IdUtilisateur = ?",
      [id]
    );
    return NextResponse.json({ success: true });
  }

  if (!Number.isInteger(rangeStart) || !Number.isInteger(rangeEnd)) {
    return NextResponse.json({ error: "rangeStart et rangeEnd doivent être des entiers." }, { status: 400 });
  }
  if (rangeStart < 1000000) {
    return NextResponse.json({ error: "La plage doit commencer à 1 000 000 minimum." }, { status: 400 });
  }
  if (rangeEnd <= rangeStart) {
    return NextResponse.json({ error: "rangeEnd doit être supérieur à rangeStart." }, { status: 400 });
  }

  // Check for overlap with other users
  const [overlaps] = await pool.query<RowDataPacket[]>(
    `SELECT IdUtilisateur FROM Utilisateur
     WHERE IdUtilisateur != ?
       AND rangeStart IS NOT NULL
       AND NOT (rangeEnd < ? OR rangeStart > ?)`,
    [id, rangeStart, rangeEnd]
  );
  if (overlaps.length > 0) {
    return NextResponse.json(
      { error: "Cette plage chevauche celle d'un autre utilisateur." },
      { status: 409 }
    );
  }

  await pool.execute(
    "UPDATE Utilisateur SET rangeStart = ?, rangeEnd = ? WHERE IdUtilisateur = ?",
    [rangeStart, rangeEnd, id]
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID invalide." }, { status: 400 });
  }

  if (admin.idUtilisateur === id) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas supprimer votre propre compte." },
      { status: 400 }
    );
  }

  try {
    const [rows] = await pool.execute(
      "SELECT IdCompte FROM Utilisateur WHERE IdUtilisateur = ?",
      [id]
    );
    const list = rows as any[];
    if (list.length === 0) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }
    const { IdCompte } = list[0];

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute("DELETE FROM Utilisateur WHERE IdUtilisateur = ?", [id]);
      await conn.execute("DELETE FROM Compte WHERE IdCompte = ?", [IdCompte]);
      await conn.commit();
      return NextResponse.json({ success: true });
    } catch (e: any) {
      await conn.rollback();
      return NextResponse.json(
        { error: "Impossible de supprimer cet utilisateur (données liées existantes)." },
        { status: 409 }
      );
    } finally {
      conn.release();
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
