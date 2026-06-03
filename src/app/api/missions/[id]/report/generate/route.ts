import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

const GROQ_URL           = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL_PRIMARY  = "meta-llama/llama-4-scout-17b-16e-instruct";
const GROQ_MODEL_FALLBACK = "llama-3.3-70b-versatile";

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "consultant") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });

  const { id } = await params;
  const missionId = Number(id);
  if (isNaN(missionId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  // ── 1. Collect mission data ───────────────────────────────────────────────

  const [[mission]] = await pool.query<RowDataPacket[]>(
    `SELECT m.titre, m.type, m.client, m.statut, m.description,
            m.DateDebut, m.DateFin, m.taches,
            CONCAT(u.prenom, ' ', u.nom) AS consultant
     FROM Mission m
     JOIN Utilisateur u ON m.IdConsultant = u.IdUtilisateur
     WHERE m.IdMission = ?`,
    [missionId]
  );
  if (!mission) return NextResponse.json({ error: "Mission not found" }, { status: 404 });

  // Attacks with their result
  const [attacks] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT
       a.IdAttaque, a.DateExecution, a.statut AS attackStatut,
       ra.rapport AS attackRapport
     FROM LabMission lm
     JOIN Attaque a          ON lm.IdAttaque = a.IdAttaque
     JOIN ResultatAttaque ra ON a.IdResultatAttaque = ra.IdResultatAttaque
     WHERE lm.IdMission = ?
     ORDER BY a.DateExecution`,
    [missionId]
  );

  // TTPs used
  const [techniques] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT t.mitreID, t.nom, t.tactique
     FROM LabMission lm
     JOIN Technique t ON lm.IdTechnique = t.IdTechnique
     WHERE lm.IdMission = ?`,
    [missionId]
  );

  // Alert summary
  const [alertStats] = await pool.query<RowDataPacket[]>(
    `SELECT al.severite, COUNT(*) AS cnt
     FROM Alerte al
     WHERE al.IdAttaque IN (
       SELECT DISTINCT lm.IdAttaque FROM LabMission lm WHERE lm.IdMission = ?
     )
     GROUP BY al.severite`,
    [missionId]
  );

  // Client rules imported
  const [[{ clientRulesCount }]] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS clientRulesCount FROM RegleClient WHERE IdMission = ?",
    [missionId]
  );

  // Rules exported to client
  const [exportedRules] = await pool.query<RowDataPacket[]>(
    `SELECT re.DateExport,
            COALESCE(cti.Titre, rapc.nom, rapa.nom) AS titre,
            COALESCE(cti.Severite, rapc.severite, rapa.severite) AS severite
     FROM RegleExportee re
     LEFT JOIN RegleCTI                 cti  ON re.IdRegle = cti.IdRegle
     LEFT JOIN RegleAjouteParConsultant rapc ON re.IdRegle = rapc.IdRegle
     LEFT JOIN RegleAjouteeParApprenant rapa ON re.IdRegle = rapa.IdRegle
     WHERE re.IdMission = ?`,
    [missionId]
  );

  // ── 2. Build prompt ───────────────────────────────────────────────────────

  const tasks: string[] = mission.taches ? JSON.parse(mission.taches as string) : [];
  const duration = mission.DateDebut && mission.DateFin
    ? `${mission.DateDebut} → ${mission.DateFin}`
    : mission.DateDebut
      ? `Started ${mission.DateDebut}, ongoing`
      : "Not started";

  const alertSummary = (alertStats as RowDataPacket[])
    .map((r) => `${r.cnt} ${r.severite ?? "unknown"}`)
    .join(", ") || "none";

  const ttpList = (techniques as RowDataPacket[])
    .map((t) => `- ${t.mitreID} — ${t.nom} (${t.tactique ?? "—"})`)
    .join("\n") || "None executed";

  const exportedList = (exportedRules as RowDataPacket[])
    .map((r) => `- ${r.titre ?? "Unnamed"} (${r.severite ?? "—"})`)
    .join("\n") || "None";

  const attackSummary = (attacks as RowDataPacket[])
    .map((a, i) =>
      `Attack ${i + 1} [${a.attackStatut}] on ${a.DateExecution ?? "?"}:${
        a.attackRapport ? `\n${String(a.attackRapport).slice(0, 600)}` : " (no report)"
      }`
    )
    .join("\n\n");

  const prompt = `You are a senior cybersecurity consultant writing a formal mission report for a client. Use ONLY the data provided below — no invented content.

## Mission Data

- **Name:** ${mission.titre}
- **Type:** ${mission.type}
- **Client:** ${mission.client ?? "—"}
- **Consultant:** ${mission.consultant}
- **Duration:** ${duration}
- **Status:** ${mission.statut}
- **Objectives:** ${mission.description ?? "Not specified"}
- **Planned tasks:** ${tasks.join(", ") || "None"}

## Attack Simulations (${attacks.length} total)

${attackSummary || "No attacks recorded."}

## TTPs Executed

${ttpList}

## Alert Summary

Total alerts by severity: ${alertSummary}

## Client Rules

- Imported from client: ${clientRulesCount}
- Exported to client as deliverable: ${(exportedRules as RowDataPacket[]).length}

### Exported Rules
${exportedList}

---

Write a formal mission report following this structure EXACTLY. Be concise and factual — no generic advice, no invented content.

# Executive Summary
2–3 sentences: mission type and objectives, what was done, overall security posture assessment (Critical / High / Medium / Low risk).

# Mission Overview
- **Type:** [mission type]
- **Client:** [client]
- **Duration:** [duration]
- **Consultant:** [consultant]
- **Tasks completed:** [list]

# Attack Simulations
For each attack, one paragraph: what was simulated, outcome, techniques used.

# Detection Coverage
- How many TTPs were executed
- Alert breakdown by severity
- Coverage assessment: which TTPs generated alerts, which did not (gaps)

# Deliverables
List the rules exported to the client with their severity level. If client rules were imported, state how many were evaluated.

# Key Findings
Bullet list — specific, evidence-based, tied to the TTPs and alerts above.

# Recommendations
One bullet per finding. Specific and actionable. Reference the exact MITRE technique ID where relevant.

---
STRICT RULES:
- Output ONLY the Markdown, no preamble.
- NEVER invent data not present above.
- If a section has no data, write "(No data recorded for this section)".
- No "Conclusion" section.`;

  // ── 3. Call Groq with fallback ────────────────────────────────────────────

  async function callGroq(model: string): Promise<string> {
    const res = await fetch(GROQ_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages:    [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens:  8192,
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Groq[${model}] ${res.status}: ${txt.slice(0, 300)}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }

  try {
    let report: string;
    try {
      report = await callGroq(GROQ_MODEL_PRIMARY);
    } catch (err: any) {
      console.warn(`[MissionReport] Primary failed: ${err.message} — trying fallback`);
      report = await callGroq(GROQ_MODEL_FALLBACK);
    }

    if (!report) throw new Error("Empty response from Groq");

    // ── 4. Save report to ResultatMission ──────────────────────────────────
    const reportPayload = {
      summary:         report.split("\n").slice(2, 5).join(" ").trim(),
      vulnerabilities: [],
      recommendations: [],
      score:           0,
      ttpsUsed:        (techniques as RowDataPacket[]).map((t) => t.mitreID as string),
      alertsGenerated: (alertStats as RowDataPacket[]).reduce((s, r) => s + Number(r.cnt), 0),
      duration:        duration,
      fullReport:      report,
    };

    await pool.execute(
      `UPDATE ResultatMission rm
       JOIN Mission m ON m.IdResultatMission = rm.IdResultatMission
       SET rm.rapport = ?, rm.description = ?
       WHERE m.IdMission = ?`,
      [JSON.stringify(reportPayload), reportPayload.summary, missionId]
    );

    return NextResponse.json({ report, saved: true });
  } catch (err: any) {
    console.error("[MissionReport]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
