import { NextRequest, NextResponse } from "next/server";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Primary: 30K TPM, 17B params, recent Llama 4 — best balance for technical reports
const GROQ_MODEL_PRIMARY  = "meta-llama/llama-4-scout-17b-16e-instruct";
// Fallback: lower TPM (15K) but solid backup if primary is rate-limited
const GROQ_MODEL_FALLBACK = "llama-3.3-70b-versatile";

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function POST(req: NextRequest) {
  try {
    const { operationIds } = (await req.json()) as { operationIds: string[] };
    if (!operationIds?.length)
      return NextResponse.json({ error: "operationIds requis" }, { status: 400 });

    const key = process.env.GROQ_API_KEY;
    if (!key)
      return NextResponse.json({ error: "GROQ_API_KEY non configurée" }, { status: 500 });

    // ── 1. Fetch full Caldera report (with agent output) ──────────────────
    const calderaHeaders = {
      KEY: process.env.CALDERA_API_KEY!,
      "Content-Type": "application/json",
    };

    const slimReports = await Promise.all(
      operationIds.map(async (id) => {
        const [opRes, repRes] = await Promise.all([
          fetch(`${process.env.CALDERA_URL}/api/v2/operations/${id}`, {
            headers: calderaHeaders,
            cache: "no-store",
          }),
          fetch(`${process.env.CALDERA_URL}/api/v2/operations/${id}/report`, {
            method: "POST",
            headers: calderaHeaders,
            body: JSON.stringify({ enable_agent_output: true }),
            cache: "no-store",
          }),
        ]);

        const operation = opRes.ok ? await opRes.json() : {};
        const report    = repRes.ok ? await repRes.json() : {};

        // ── SLIM: only what matters for an analyst report ────────────────
        const slimSteps: any[] = [];
        for (const [agent, data] of Object.entries(report.steps ?? {}) as [string, any][]) {
          for (const step of data?.steps ?? []) {
            let output = "";
            try {
              if (step.output) {
                output = atob(step.output).trim();
                if (output.length > 500) output = output.slice(0, 500) + "...[truncated]";
              }
            } catch { /* ignore */ }

            slimSteps.push({
              agent,
              technique_id:   step.ability?.technique_id   ?? "",
              technique_name: step.ability?.technique_name ?? "",
              tactic:         step.ability?.tactic         ?? "",
              ability_name:   step.ability?.name           ?? "",
              command:        (step.command ?? "").slice(0, 200),
              status:         step.status === 0 ? "success"
                            : step.status === -1 ? "failed"
                            : `code_${step.status}`,
              platform:       step.platform ?? "",
              executor:       step.executor ?? "",
              output,
            });
          }
        }

        const slimFacts = (report.facts ?? [])
          .slice(0, 50)
          .map((f: any) => ({
            trait: f.trait,
            value: String(f.value ?? "").slice(0, 150),
          }));

        return {
          operation_name: operation.name ?? "Unknown",
          state:          operation.state ?? "",
          start:          operation.start ?? "",
          finish:         operation.finish ?? "",
          adversary:      operation.adversary?.name ?? "Manual TTP selection",
          adversary_desc: operation.adversary?.description ?? "",
          group:          operation.host_group?.map?.((h: any) => h.host) ?? operation.group ?? [],
          planner:        operation.planner?.name ?? "",
          obfuscator:     operation.obfuscator ?? "",
          steps_total:    slimSteps.length,
          steps:          slimSteps,
          facts:          slimFacts,
        };
      })
    );

    // ── 2. Build prompt ───────────────────────────────────────────────────
    const calderaJson = JSON.stringify(slimReports, null, 2);
    console.log(`[Report] JSON size: ${calderaJson.length} chars (~${estimateTokens(calderaJson)} tokens)`);

    const prompt = `You are a senior cybersecurity analyst. Below is a slimmed JSON exported from a MITRE Caldera adversary emulation. It contains the operation details and every executed step (technique, status, agent output).

## Caldera Data
\`\`\`json
${calderaJson}
\`\`\`

Based strictly on this data, write a comprehensive professional penetration testing report in English with these sections:

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
For each unique technique: ID, name, tactic, what it does, success/failure, and quote relevant output evidence.

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
- Use Markdown formatting (headers, bold, bullet lists, code blocks for outputs).
- Output ONLY the Markdown report, no preamble.`;

    const promptTokens = estimateTokens(prompt);
    console.log(`[Report] Total prompt: ~${promptTokens} tokens`);

    // Safety check: warn if we're approaching the primary model's TPM limit
    if (promptTokens > 25000) {
      console.warn(`[Report] WARN: prompt is ~${promptTokens} tokens, close to 30K TPM limit`);
    }

    // ── 3. Call Groq with fallback ────────────────────────────────────────
    async function callGroq(model: string) {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 8192,
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

    let report: string;
    try {
      console.log(`[Report] Trying primary model: ${GROQ_MODEL_PRIMARY} (30K TPM)`);
      report = await callGroq(GROQ_MODEL_PRIMARY);
    } catch (err: any) {
      console.warn(`[Report] Primary failed: ${err.message}`);
      console.log(`[Report] Falling back to: ${GROQ_MODEL_FALLBACK} (12K TPM)`);
      report = await callGroq(GROQ_MODEL_FALLBACK);
    }

    if (!report) throw new Error("Empty response from Groq");
    return NextResponse.json({ report });
  } catch (err: any) {
    console.error("[Report] Final error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}