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

    // ── 1. Fetch operation chain + each link's real output ───────────────
    const calderaHeaders = {
      KEY: process.env.CALDERA_API_KEY!,
      "Content-Type": "application/json",
    };

    const norm = (s: string) =>
      String(s ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

    const decodeB64 = (s: string): string => {
      if (!s) return "";
      try { return Buffer.from(s, "base64").toString("utf-8").trim(); }
      catch { return s; }
    };

    // Commands are obfuscated before being stored — decoded bytes may be binary.
    // If the decoded result contains non-printable chars, fall back to the
    // executor's original command template (unobfuscated).
    const decodeCommand = (link: any): string => {
      const raw = (link.command ?? "").trim();
      if (raw && /^[A-Za-z0-9+/\r\n]+=*$/.test(raw)) {
        try {
          const decoded = Buffer.from(raw, "base64").toString("utf-8").trim();
          if (!/[\x00-\x08\x0E-\x1F\x7F]/.test(decoded)) return decoded;
        } catch { /* fall through */ }
      }
      // Fallback: executor template or ability's first executor command
      return (
        link.executor?.command ??
        link.ability?.executors?.[0]?.command ??
        raw
      );
    };

    const extractOutput = (data: any): string => {
      // Newer Caldera: { stdout, stderr, exit_code }
      if (data.stdout !== undefined) {
        let out = norm(data.stdout);
        const err = norm(data.stderr ?? "");
        if (err) out += "\n[stderr] " + err;
        return out;
      }
      // Legacy: base64 blob in data.output or data.result
      const raw = data.output ?? data.result ?? "";
      if (!raw) return "";
      const decoded = decodeB64(String(raw));
      try {
        const inner = JSON.parse(decoded);
        if (inner.stdout !== undefined) {
          let out = norm(inner.stdout);
          const err = norm(inner.stderr ?? "");
          if (err) out += "\n[stderr] " + err;
          return out;
        }
      } catch { /* plain text */ }
      return decoded;
    };

    const slimReports = await Promise.all(
      operationIds.map(async (id) => {
        const opRes = await fetch(`${process.env.CALDERA_URL}/api/v2/operations/${id}`, {
          headers: calderaHeaders,
          cache: "no-store",
        });
        const operation = opRes.ok ? await opRes.json() : {};

        // Only links that have actually finished (status !== 1 = queued/running)
        const chain: any[] = operation.chain ?? [];
        const doneLinks = chain.filter((l) => l.status !== 1);

        // Fetch every link's result in parallel — same endpoint the terminal uses
        const linkOutputs = await Promise.all(
          doneLinks.map(async (link): Promise<string> => {
            try {
              const res = await fetch(
                `${process.env.CALDERA_URL}/api/v2/operations/${id}/links/${link.id}/result`,
                { headers: calderaHeaders, cache: "no-store", signal: AbortSignal.timeout(6_000) }
              );
              if (!res.ok) return "";
              const raw = extractOutput(await res.json());
              return raw.length > 800 ? raw.slice(0, 800) + "\n...[truncated]" : raw;
            } catch { return ""; }
          })
        );

        const slimSteps = doneLinks.map((link, i) => ({
          agent:          link.host ?? link.paw ?? "unknown",
          technique_id:   link.ability?.technique_id   ?? "",
          technique_name: link.ability?.technique_name ?? "",
          tactic:         link.ability?.tactic         ?? "",
          ability_name:   link.ability?.name           ?? "",
          command:        decodeCommand(link).slice(0, 300),
          status:         link.status === 0  ? "success"
                        : link.status === -1 ? "failed"
                        : `code_${link.status}`,
          output:         linkOutputs[i] ?? "",
        }));

        return {
          operation_name: operation.name ?? "Unknown",
          state:          operation.state ?? "",
          start:          operation.start ?? "",
          finish:         operation.finish ?? "",
          adversary:      operation.adversary?.name ?? "Manual TTP selection",
          group:          operation.host_group?.map?.((h: any) => h.host) ?? [],
          planner:        operation.planner?.name ?? "",
          steps_total:    slimSteps.length,
          steps:          slimSteps,
        };
      })
    );

    // ── 2. Build prompt ───────────────────────────────────────────────────
    const calderaJson = JSON.stringify(slimReports, null, 2);
    console.log(`[Report] JSON size: ${calderaJson.length} chars (~${estimateTokens(calderaJson)} tokens)`);

    const prompt = `You are a senior pentester writing a technical debrief. Below is raw MITRE Caldera operation data. Write a CONCISE, FACTUAL report using ONLY the data provided — no generic advice, no invented content.

## Caldera Data
\`\`\`json
${calderaJson}
\`\`\`

---

Follow this structure EXACTLY:

# Executive Summary
2–3 sentences only: what was simulated, how many steps succeeded vs failed, overall risk level (Critical / High / Medium / Low). Be direct, no padding.

# Operation Details
- **Name:** [operation_name]
- **Date:** [start]
- **Adversary:** [adversary]
- **Agent(s):** [group or agent names]
- **Steps:** [steps_total] total — [count successes] succeeded, [count failures] failed

# Attack Steps

For EVERY step in the data, write one block:

### [ability_name] — [technique_id if non-empty, else omit] ([tactic if non-empty, else omit])
- **Status:** ✓ Success / ✗ Failed ([status value])
- **Command:**
\`\`\`
[command]
\`\`\`
- **Output:**
\`\`\`
[output — if empty or blank, write "(no output captured)"]
\`\`\`

# Findings (Successful Steps Only)
For each successful step, one short paragraph: what the technique achieved, what information was exposed, risk level (Critical/High/Medium/Low). Quote exact strings from the output as evidence.

# Recommendations
One bullet per finding. Specific, actionable, referencing the exact technique and evidence.

---
STRICT RULES:
- Output ONLY the Markdown, no preamble.
- NEVER invent or assume anything not in the JSON.
- Use ability_name when technique_name is empty.
- Quote exact output snippets as evidence, wrapped in backticks.
- If a field is empty or missing, omit it silently — do not write "None" or "N/A".
- No "Conclusion" section, no "Impact Assessment" section, no generic cyber-advice.`;

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