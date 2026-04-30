import { NextRequest, NextResponse } from "next/server";
import { getWazuhManagerToken } from "../lib";

function levelToSeverity(level: number) {
  if (level >= 12) return "Critical";
  if (level >= 8)  return "High";
  if (level >= 4)  return "Medium";
  return "Low";
}

function mapRule(r: any) {
  return {
    id: String(r.id),
    wazuhId: r.id as number,
    name: r.description ?? `Rule ${r.id}`,
    description: r.description ?? "",
    level: (r.level as number) ?? 0,
    severity: levelToSeverity(r.level ?? 0),
    status: (r.status === "enabled" ? "active" : "inactive") as "active" | "inactive",
    groups: Array.isArray(r.groups) ? (r.groups as string[]) : [],
    filename: (r.filename as string) ?? "",
    relativeDirname: (r.relative_dirname as string) ?? "",
  };
}

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") ?? "";
  const limit  = req.nextUrl.searchParams.get("limit")  ?? "100";
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

    const data = await res.json();
    const rules = (data?.data?.affected_items ?? []).map(mapRule);
    const total = data?.data?.total_affected_items ?? rules.length;
    return NextResponse.json({ rules, total });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { filename, xml } = (await req.json()) as { filename: string; xml: string };

    if (!filename || !xml) {
      return NextResponse.json({ error: "Missing filename or xml" }, { status: 400 });
    }

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

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  const filename = req.nextUrl.searchParams.get("filename");

  if (!filename) {
    return NextResponse.json({ error: "Missing filename" }, { status: 400 });
  }

  try {
    const { token, baseUrl } = await getWazuhManagerToken();

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

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
