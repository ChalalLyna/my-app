import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token   = req.cookies.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const userId = payload.idUtilisateur;

  try {
    const [rows] = await pool.query(
      `SELECT
         a.IdAttaque                      AS id,
         a.DateExecution                  AS dateExecution,
         a.statut,
         a.type,
         t.mitreID,
         t.nom                            AS techniqueName,
         t.tactique,
         act.nom                          AS actifNom,
         act.\`catégorie\`               AS actifCategorie,
         mv.IP                            AS actifIP,
         mv.OS                            AS actifOS,
         ra.description                   AS resultatDescription,
         ra.rapport
       FROM LabApprentissage la
       JOIN Attaque          a   ON la.IdAttaque    = a.IdAttaque
       JOIN Technique        t   ON la.IdTechnique  = t.IdTechnique
       JOIN Actif            act ON la.IdActif      = act.IdActif
       JOIN MachineVirtuelle mv  ON act.IdVM        = mv.IdVM
       JOIN ResultatAttaque  ra  ON a.IdResultatAttaque = ra.IdResultatAttaque
       WHERE la.IdUtilisateur = ?
       ORDER BY a.DateExecution DESC`,
      [userId]
    );

    const attacks = (rows as any[]).map((r) => ({
      id:                  Number(r.id),
      dateExecution:       r.dateExecution ?? null,
      statut:              r.statut ?? "",
      type:                r.type ?? "",
      mitreID:             r.mitreID ?? "",
      techniqueName:       r.techniqueName ?? "",
      tactique:            r.tactique ?? "",
      actifNom:            r.actifNom ?? "",
      actifCategorie:      r.actifCategorie ?? "",
      actifIP:             r.actifIP ?? "",
      actifOS:             r.actifOS ?? "",
      resultatDescription: r.resultatDescription ?? "",
      rapport:             r.rapport ?? null,
    }));

    return NextResponse.json(attacks);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
