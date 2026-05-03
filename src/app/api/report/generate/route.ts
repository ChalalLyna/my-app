import { NextRequest, NextResponse } from "next/server";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent";

export async function POST(req: NextRequest) {
  try {
    const { operationIds } = (await req.json()) as { operationIds: string[] };
    if (!operationIds?.length)
      return NextResponse.json({ error: "operationIds requis" }, { status: 400 });

    const key = process.env.GEMINI_API_KEY;
    if (!key)
      return NextResponse.json({ error: "GEMINI_API_KEY non configurée" }, { status: 500 });

    // ── 1. Fetch full Caldera report JSON for each operation ──────────────
    const headers = { KEY: process.env.CALDERA_API_KEY!, "Content-Type": "application/json" };

    const reportData = await Promise.all(
      operationIds.map(async (id) => {
        const [opRes, repRes] = await Promise.all([
          fetch(`${process.env.CALDERA_URL}/api/v2/operations/${id}`,        { headers, cache: "no-store" }),
          fetch(`${process.env.CALDERA_URL}/api/v2/operations/${id}/report`, { headers, cache: "no-store" }),
        ]);

        const op  = opRes.ok  ? await opRes.json()  : {};
        const rep = repRes.ok ? await repRes.json() : {};

        // Slim down: keep only what matters for the report
        const steps: any[] = [];
        for (const [agent, data] of Object.entries(rep.steps ?? {}) as any[]) {
          for (const step of data?.steps ?? []) {
            let output = "";
            try { output = step.output ? atob(step.output).trim().slice(0, 300) : ""; } catch { /**/ }
            steps.push({
              agent,
              technique_id:   step.ability?.technique_id   ?? "",
              technique_name: step.ability?.technique_name ?? "",
              tactic:         step.ability?.tactic         ?? "",
              ability:        step.ability?.name           ?? "",
              status:         step.status === 0 ? "success" : step.status === -1 ? "failed" : "other",
              output,
            });
          }
        }

        return {
          name:      op.name,
          state:     op.state,
          start:     op.start,
          finish:    op.finish,
          adversary: op.adversary?.name ?? "Manual TTP selection",
          group:     op.group,
          steps,
          facts:     (rep.facts ?? []).slice(0, 30).map((f: any) => ({ trait: f.trait, value: String(f.value).slice(0, 100) })),
        };
      })
    );

    // ── 2. Build Gemini prompt ─────────────────────────────────────────────
    const prompt = `You are a senior cybersecurity analyst. Based on the following Caldera adversary emulation full report JSON, write a comprehensive, professional penetration testing report in English.

## Caldera Full Report JSON
\`\`\`json
${JSON.stringify(reportData, null, 2).slice(0, 12000)}
\`\`\`

## Report Structure (use exactly these Markdown headings)

# Executive Summary
High-level overview: what was tested, key findings, overall risk rating (Critical / High / Medium / Low).

# Simulation Overview
- Date and duration
- Adversary profile
- Target systems / groups
- Scope

# Attack Chain & Timeline
Ordered list of every executed technique with its outcome.

# MITRE ATT&CK Techniques Analysis
For each unique technique: ID, name, tactic, description of what it does, success/failure, observed output evidence (quote relevant output if any).

# Key Findings
Numbered list, each with:
- Finding title
- Risk level (Critical / High / Medium / Low)
- Description
- Evidence

# Impact Assessment
What a real attacker could have achieved based on the successful techniques.

# Recommendations
Specific, actionable remediation for each finding. Include tool/configuration suggestions where relevant.

# Conclusion
Summary of the engagement and next steps.

---
Rules:
- Be detailed and technical but clear.
- Reference MITRE ATT&CK IDs (e.g. T1059.001) throughout.
- Do NOT invent data — only use what is in the JSON.
- Use Markdown formatting (headers, bold, bullet lists, code blocks for outputs).
- Output ONLY the Markdown report, no preamble.`;

    // ── 3. Call Gemini ─────────────────────────────────────────────────────
    const geminiRes = await fetch(`${GEMINI_URL}?key=${key}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents:         [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
      }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!geminiRes.ok) {
      const txt = await geminiRes.text();
      throw new Error(`Gemini ${geminiRes.status}: ${txt.slice(0, 300)}`);
    }

    const geminiData = await geminiRes.json();
    const report: string =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!report) throw new Error("Gemini returned an empty response");

    return NextResponse.json({ report });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}