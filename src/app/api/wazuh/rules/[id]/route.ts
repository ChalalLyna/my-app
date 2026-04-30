import { NextRequest, NextResponse } from "next/server";
import { getWazuhManagerToken } from "../../lib";

function levelToSeverity(level: number) {
  if (level >= 12) return "Critical";
  if (level >= 8)  return "High";
  if (level >= 4)  return "Medium";
  return "Low";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: ruleId } = await params;

  try {
    const { token, baseUrl } = await getWazuhManagerToken();

    const ruleRes = await fetch(
      `${baseUrl}/rules?rule_ids=${encodeURIComponent(ruleId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!ruleRes.ok) {
      const text = await ruleRes.text().catch(() => "");
      return NextResponse.json({ error: `Wazuh ${ruleRes.status}: ${text.slice(0, 200)}` }, { status: 502 });
    }

    const ruleData = await ruleRes.json();
    const rule = ruleData?.data?.affected_items?.[0];

    if (!rule) {
      return NextResponse.json({ error: `Rule ${ruleId} not found` }, { status: 404 });
    }

    // Fetch raw XML of the rule file
    let xml: string | null = null;
    if (rule.filename) {
      // Try GET /rules/files/{filename}?raw=true
      const fileRes = await fetch(
        `${baseUrl}/rules/files/${encodeURIComponent(rule.filename)}?raw=true`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        }
      ).catch(() => null);

      if (fileRes?.ok) {
        const text = await fileRes.text().catch(() => null);
        if (text) {
          // Wazuh sometimes returns JSON-wrapped content even with raw=true
          if (text.trimStart().startsWith("{")) {
            try { xml = JSON.parse(text)?.data?.contents ?? null; } catch { xml = text; }
          } else {
            xml = text;
          }
        }
      } else if (rule.relative_dirname) {
        // Fallback: GET /manager/files?path={relativeDirname}/{filename}&raw=true
        const filePath = `${rule.relative_dirname}/${rule.filename}`;
        const mgrRes = await fetch(
          `${baseUrl}/manager/files?path=${encodeURIComponent(filePath)}&raw=true`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
            signal: AbortSignal.timeout(10000),
          }
        ).catch(() => null);
        if (mgrRes?.ok) {
          xml = await mgrRes.text().catch(() => null);
        }
      }
    }

    return NextResponse.json({
      id: String(rule.id),
      wazuhId: rule.id as number,
      name: rule.description ?? `Rule ${rule.id}`,
      description: rule.description ?? "",
      level: rule.level as number,
      severity: levelToSeverity(rule.level ?? 0),
      status: rule.status === "enabled" ? "active" : "inactive",
      groups: Array.isArray(rule.groups) ? rule.groups : [],
      filename: (rule.filename as string) ?? "",
      relativeDirname: (rule.relative_dirname as string) ?? "",
      xml,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
