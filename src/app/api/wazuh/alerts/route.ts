import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function levelToSeverity(level: number): "Critical" | "High" | "Medium" | "Low" {
  if (level >= 12) return "Critical";
  if (level >= 8)  return "High";
  if (level >= 4)  return "Medium";
  return "Low";
}

function mapAlert(hit: any) {
  const src = hit._source ?? {};
  const rule = src.rule ?? {};
  const agent = src.agent ?? {};
  const groups: string[] = Array.isArray(rule.groups) ? rule.groups : (rule.groups ? [rule.groups] : []);

  const rawLog = src.full_log
    ? src.full_log
    : JSON.stringify(
        { rule: src.rule, agent: src.agent, data: src.data, manager: src.manager, decoder: src.decoder },
        null,
        2,
      );

  return {
    id: hit._id,
    title: rule.description ?? "Unknown Alert",
    description: rule.description ?? "",
    severity: levelToSeverity(rule.level ?? 0),
    status: "New" as const,
    ttp: `R:${rule.id ?? "?"}`,
    ttpName: groups.join(", "),
    asset: agent.name ?? agent.ip ?? "unknown",
    timestamp: src["@timestamp"] ?? new Date().toISOString(),
    source: src.decoder?.name ?? "Wazuh",
    rawLog,
    ruleLevel: rule.level as number | undefined,
    agentId: agent.id as string | undefined,
    agentIp: agent.ip as string | undefined,
    ruleFiredTimes: rule.firedtimes as number | undefined,
  };
}

export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get("since");
  if (!since) {
    return NextResponse.json({ error: "Missing 'since' parameter" }, { status: 400 });
  }

  const wazuhUrl = process.env.WAZUH_URL;
  const wazuhUser = process.env.WAZUH_USER;
  const wazuhPassword = process.env.WAZUH_PASSWORD;

  if (!wazuhUrl || !wazuhUser || !wazuhPassword) {
    return NextResponse.json({ error: "Wazuh not configured" }, { status: 500 });
  }

  const auth = Buffer.from(`${wazuhUser}:${wazuhPassword}`).toString("base64");
  const url = `${wazuhUrl}/internal/search/opensearch-with-long-numerals`;

  const body = {
    params: {
      index: "wazuh-alerts-4.x-*",
      body: {
        size: 200,
        sort: [{ "@timestamp": { order: "desc" } }],
        query: {
          range: {
            "@timestamp": { gte: since },
          },
        },
      },
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "osd-xsrf": "true",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json({ error: `Wazuh ${res.status}: ${text.slice(0, 200)}` }, { status: 502 });
    }

    const data = await res.json();
    // Wazuh Dashboard wraps hits under rawResponse
    const hits: any[] = data?.rawResponse?.hits?.hits ?? data?.hits?.hits ?? [];
    return NextResponse.json(hits.map(mapAlert), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
