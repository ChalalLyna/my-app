import { NextRequest, NextResponse } from "next/server";

const GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export async function POST(req: NextRequest) {
  try {
    const { operationIds } = (await req.json()) as { operationIds: string[] };
    if (!operationIds?.length)
      return NextResponse.json({ error: "operationIds requis" }, { status: 400 });

    const key = process.env.GROQ_API_KEY;
    if (!key)
      return NextResponse.json({ error: "GROQ_API_KEY non configurée" }, { status: 500 });

    // ── 1. Fetch raw Caldera JSON (operation + full report) ───────────────
    const calderaHeaders = { KEY: process.env.CALDERA_API_KEY!, "Content-Type": "application/json" };

    const rawReports = await Promise.all(
      operationIds.map(async (id) => {
        const [opRes, repRes] = await Promise.all([
          fetch(`${process.env.CALDERA_URL}/api/v2/operations/${id}`,        { headers: calderaHeaders, cache: "no-store" }),
          fetch(`${process.env.CALDERA_URL}/api/v2/operations/${id}/report`, { headers: calderaHeaders, cache: "no-store" }),
        ]);

        const operation = opRes.ok  ? await opRes.json()  : {};
        const report    = repRes.ok ? await repRes.json() : {};

        // Only decode base64 outputs so the model can read them — everything else is untouched
        if (report.steps) {
          for (const agentData of Object.values(report.steps) as any[]) {
            for (const step of agentData?.steps ?? []) {
              try {
                if (step.output) step.output = atob(step.output).trim();
              } catch { step.output = ""; }
            }
          }
        }

        return { operation, report };
      })
    );

    // ── 2. Build prompt with the raw Caldera JSON ─────────────────────────
    const calderaJson = JSON.stringify(rawReports, null, 2);

    const prompt = `You are a senior cybersecurity analyst. Below is the raw JSON exported directly from a MITRE Caldera adversary emulation platform. It contains the full operation details and the complete report (steps per agent, abilities, outputs, facts, relationships).

## Raw Caldera JSON
\`\`\`json
${calderaJson}
\`\`\`

Based strictly on this data, write a comprehensive, professional penetration testing report in English with the following sections:

# Executive Summary
High-level overview of what was tested, key findings, and overall risk rating (Critical / High / Medium / Low).

# Simulation Overview
- Operation name, date, duration
- Adversary profile used
- Target group / agents
- Scope

# Attack Chain & Timeline
Chronological ordered list of every step executed, with technique ID, name, tactic, agent, and outcome (success/failed).

# MITRE ATT&CK Techniques Analysis
For each unique technique: ID, name, tactic, what it does, whether it succeeded, and any relevant observed output (quote from the JSON).

# Key Findings
Numbered list. For each finding:
- Title
- Risk level (Critical / High / Medium / Low)
- Description
- Evidence from the data

# Impact Assessment
What a real attacker could have achieved with the successful techniques.

# Recommendations
Specific, actionable remediation steps for each finding.

# Conclusion
Summary and next steps.

---
Rules:
- Do NOT invent or assume data not present in the JSON.
- Reference MITRE ATT&CK IDs (e.g. T1059.001) throughout.
- Use Markdown formatting (headers, bold, bullet lists, code blocks for command outputs).
- Output ONLY the Markdown report, no preamble or explanation.`;

    // ── 3. Call Groq ──────────────────────────────────────────────────────
    const groqRes = await fetch(GROQ_URL, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        messages:    [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens:  8192,
      }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!groqRes.ok) {
      const txt = await groqRes.text();
      throw new Error(`Groq ${groqRes.status}: ${txt.slice(0, 300)}`);
    }

    const groqData = await groqRes.json();
    const report: string = groqData.choices?.[0]?.message?.content ?? "";

    if (!report) throw new Error("Groq returned an empty response");

    return NextResponse.json({ report });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}