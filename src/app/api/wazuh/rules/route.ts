import { NextRequest, NextResponse } from "next/server";
import { getWazuhManagerToken } from "../lib";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

function levelToSeverity(level: number) {
  if (level >= 12) return "Critical";
  if (level >= 8)  return "High";
  if (level >= 4)  return "Medium";
  return "Low";
}

function mapRule(r: any) {
  return {
    id:              String(r.id),
    wazuhId:         r.id as number,
    name:            r.description ?? `Rule ${r.id}`,
    description:     r.description ?? "",
    level:           (r.level as number) ?? 0,
    severity:        levelToSeverity(r.level ?? 0),
    status:          (r.status === "enabled" ? "active" : "inactive") as "active" | "inactive",
    groups:          Array.isArray(r.groups) ? (r.groups as string[]) : [],
    filename:        (r.filename as string) ?? "",
    relativeDirname: (r.relative_dirname as string) ?? "",
  };
}

// Extract all rule IDs from a Wazuh XML string
function extractRuleIds(xml: string): number[] {
  return [...xml.matchAll(/<rule\s[^>]*\bid="(\d+)"/g)].map(m => Number(m[1]));
}

async function getUserRange(userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT rangeStart, rangeEnd FROM Utilisateur WHERE IdUtilisateur = ?",
    [userId]
  );
  const row = rows[0];
  if (!row || row.rangeStart == null || row.rangeEnd == null) return null;
  return { rangeStart: row.rangeStart as number, rangeEnd: row.rangeEnd as number };
}

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const search = req.nextUrl.searchParams.get("search") ?? "";
  const limit  = req.nextUrl.searchParams.get("limit")  ?? "500";
  const offset = req.nextUrl.searchParams.get("offset") ?? "0";

  try {
    const { token, baseUrl } = await getWazuhManagerToken();

    const params = new URLSearchParams({ limit, offset });
    if (search) params.set("search", search);

    const res = await fetch(`${baseUrl}/rules?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json({ error: `Wazuh ${res.status}: ${text.slice(0, 200)}` }, { status: 502 });
    }

    const data  = await res.json();
    const all   = (data?.data?.affected_items ?? []).map(mapRule);

    // Admins see everything
    if (user.role === "admin") {
      return NextResponse.json({ rules: all, total: all.length });
    }

    // Other users: default rules (not in etc/) + their own range
    const range = await getUserRange(user.idUtilisateur);

    const rules = all.filter((r: ReturnType<typeof mapRule>) => {
      const isDefault = !r.relativeDirname.includes("etc");
      const inRange   = range != null && r.wazuhId >= range.rangeStart && r.wazuhId <= range.rangeEnd;
      return isDefault || inRange;
    });

    return NextResponse.json({ rules, total: rules.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { filename, xml } = (await req.json()) as { filename: string; xml: string };

    if (!filename || !xml) {
      return NextResponse.json({ error: "Missing filename or xml" }, { status: 400 });
    }

    const ruleIds = extractRuleIds(xml);
    if (ruleIds.length === 0) {
      return NextResponse.json({ error: "Aucun ID de règle trouvé dans le XML." }, { status: 400 });
    }

    // Admins bypass range checks
    if (user.role !== "admin") {
      const range = await getUserRange(user.idUtilisateur);
      if (!range) {
        return NextResponse.json(
          { error: "Aucune plage de règles assignée à votre compte. Contactez un administrateur." },
          { status: 403 }
        );
      }

      const outOfRange = ruleIds.filter(id => id < range.rangeStart || id > range.rangeEnd);
      if (outOfRange.length > 0) {
        return NextResponse.json(
          { error: `Les IDs ${outOfRange.join(", ")} sont hors de votre plage (${range.rangeStart}–${range.rangeEnd}).` },
          { status: 403 }
        );
      }

      // Check that no other user owns these IDs (cross-user conflict)
      const [conflicts] = await pool.query<RowDataPacket[]>(
        `SELECT IdUtilisateur FROM Utilisateur
         WHERE IdUtilisateur != ?
           AND rangeStart IS NOT NULL
           AND ? >= rangeStart AND ? <= rangeEnd`,
        [user.idUtilisateur, ruleIds[0], ruleIds[0]]
      );
      if (conflicts.length > 0) {
        return NextResponse.json(
          { error: "Cet ID de règle appartient à la plage d'un autre utilisateur." },
          { status: 403 }
        );
      }
    }

    // Save to Wazuh
    const { token, baseUrl } = await getWazuhManagerToken();
    const res = await fetch(
      `${baseUrl}/rules/files/${encodeURIComponent(filename)}?overwrite=true`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
        },
        body: xml,
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json({ error: `Wazuh ${res.status}: ${text.slice(0, 200)}` }, { status: 502 });
    }

    // Record in DB (best-effort — Wazuh save already succeeded)
    const mainRuleId = ruleIds[0];
    const severity   = levelToSeverity(0); // default, XML parsing for level is optional
    try {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // Check if a record already exists for this wazuhRuleId + user
        const table  = user.role === "apprenant" ? "RegleAjouteeParApprenant" : "RegleAjouteParConsultant";
        const idCol  = user.role === "apprenant" ? "IdApprenant" : "IdConsultant";
        const [existing] = await conn.query<RowDataPacket[]>(
          `SELECT IdRegle FROM ${table} WHERE ${idCol} = ? AND wazuhRuleId = ?`,
          [user.idUtilisateur, mainRuleId]
        );

        if (existing.length === 0) {
          // New rule — insert into RegleDeDetection first, then sub-table
          const [r1] = await conn.execute<ResultSetHeader>("INSERT INTO RegleDeDetection () VALUES ()");
          const idRegle = r1.insertId;

          if (user.role === "apprenant") {
            await conn.execute(
              `INSERT INTO RegleAjouteeParApprenant
                 (IdRegle, IdApprenant, nom, XmlWazuh, filename, wazuhRuleId, action, statut)
               VALUES (?, ?, ?, ?, ?, ?, 'create', 'pending')`,
              [idRegle, user.idUtilisateur, filename, xml, filename, mainRuleId]
            );
          } else if (user.role === "consultant") {
            await conn.execute(
              `INSERT INTO RegleAjouteParConsultant
                 (IdRegle, IdConsultant, nom, XmlWazuh, wazuhRuleId, severite)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [idRegle, user.idUtilisateur, filename, xml, mainRuleId, severity]
            );
          }
        } else {
          // Existing rule — update XML
          if (user.role === "apprenant") {
            await conn.execute(
              `UPDATE RegleAjouteeParApprenant
               SET XmlWazuh = ?, filename = ?, action = 'modify', statut = 'pending',
                   dateRevision = NULL, commentaire = NULL
               WHERE IdApprenant = ? AND wazuhRuleId = ?`,
              [xml, filename, user.idUtilisateur, mainRuleId]
            );
          } else if (user.role === "consultant") {
            await conn.execute(
              `UPDATE RegleAjouteParConsultant
               SET XmlWazuh = ?
               WHERE IdConsultant = ? AND wazuhRuleId = ?`,
              [xml, user.idUtilisateur, mainRuleId]
            );
          }
        }

        await conn.commit();
      } catch (dbErr) {
        await conn.rollback();
        console.error("DB record error (rule saved in Wazuh):", dbErr);
      } finally {
        conn.release();
      }
    } catch (dbErr) {
      console.error("DB connection error:", dbErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const filename = req.nextUrl.searchParams.get("filename");
  if (!filename) {
    return NextResponse.json({ error: "Missing filename" }, { status: 400 });
  }

  const { token, baseUrl } = await getWazuhManagerToken();

  // Resolve the wazuhRuleId from Wazuh API (needed for ownership check + DB cleanup)
  let wazuhRuleId: number | null = null;
  try {
    const ruleRes = await fetch(
      `${baseUrl}/rules?filename=${encodeURIComponent(filename)}&limit=1`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(8000) }
    );
    if (ruleRes.ok) {
      const d = await ruleRes.json();
      wazuhRuleId = d?.data?.affected_items?.[0]?.id ?? null;
    }
  } catch { /* best-effort */ }

  // Ownership check for non-admins
  if (user.role !== "admin") {
    const range = await getUserRange(user.idUtilisateur);
    if (wazuhRuleId != null && (!range || wazuhRuleId < range.rangeStart || wazuhRuleId > range.rangeEnd)) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas supprimer une règle qui ne vous appartient pas." },
        { status: 403 }
      );
    }
  }

  const res = await fetch(
    `${baseUrl}/rules/files/${encodeURIComponent(filename)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: `Wazuh ${res.status}: ${text.slice(0, 200)}` }, { status: 502 });
  }

  // Clean up DB records
  if (wazuhRuleId != null) {
    await pool.execute(
      "DELETE FROM RegleAjouteeParApprenant WHERE wazuhRuleId = ? AND IdApprenant = ?",
      [wazuhRuleId, user.idUtilisateur]
    );
    await pool.execute(
      "DELETE FROM RegleAjouteParConsultant WHERE wazuhRuleId = ? AND IdConsultant = ?",
      [wazuhRuleId, user.idUtilisateur]
    );
  }

  return NextResponse.json({ ok: true });
}
