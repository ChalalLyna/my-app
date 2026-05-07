import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { verifyToken, signToken, COOKIE_NAME, JWTPayload } from "@/lib/auth";

export async function PUT(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Session expirée." }, { status: 401 });
  }

  try {
    const { nom, prenom, email, currentPassword, newPassword } = await req.json();

    if (!nom || !prenom || !email) {
      return NextResponse.json({ error: "Nom, prénom et email sont requis." }, { status: 400 });
    }

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Le mot de passe actuel est requis pour le modifier." },
          { status: 400 }
        );
      }

      const [rows] = await pool.execute(
        "SELECT mdp FROM Compte WHERE IdCompte = ?",
        [payload.idCompte]
      );
      const list = rows as any[];
      if (list.length === 0) {
        return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
      }

      const match = await bcrypt.compare(currentPassword, list[0].mdp);
      if (!match) {
        return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 400 });
      }
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (newPassword) {
        const hashed = await bcrypt.hash(newPassword, 12);
        await conn.execute(
          "UPDATE Compte SET email = ?, mdp = ? WHERE IdCompte = ?",
          [email.toLowerCase().trim(), hashed, payload.idCompte]
        );
      } else {
        await conn.execute(
          "UPDATE Compte SET email = ? WHERE IdCompte = ?",
          [email.toLowerCase().trim(), payload.idCompte]
        );
      }

      await conn.execute(
        "UPDATE Utilisateur SET nom = ?, prenom = ? WHERE IdUtilisateur = ?",
        [nom, prenom, payload.idUtilisateur]
      );

      await conn.commit();

      const newPayload: JWTPayload = {
        ...payload,
        nom,
        prenom,
        email: email.toLowerCase().trim(),
      };
      const newToken = signToken(newPayload);

      const updatedUser = {
        id:     String(payload.idUtilisateur),
        email:  email.toLowerCase().trim(),
        role:   payload.role,
        name:   `${prenom} ${nom}`,
        prenom,
        nom,
        avatar: `${prenom[0]}${nom[0]}`.toUpperCase(),
      };

      const res = NextResponse.json({ success: true, user: updatedUser });
      res.cookies.set(COOKIE_NAME, newToken, {
        httpOnly: true,
        secure:   process.env.HTTPS === "true",
        sameSite: "lax",
        maxAge:   8 * 60 * 60,
        path:     "/",
      });
      return res;
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
