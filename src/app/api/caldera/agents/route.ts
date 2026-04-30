import { NextRequest, NextResponse } from "next/server";

/**
 * PATCH /api/caldera/agents
 * Body: { paw: string, group: string }
 *
 * Assigns a Caldera agent to a specific group so we can target
 * exactly one agent per operation, avoiding cross-contamination.
 */
export async function PATCH(req: NextRequest) {
  const calderaUrl = process.env.CALDERA_URL;
  const calderaKey = process.env.CALDERA_API_KEY;
  if (!calderaUrl || !calderaKey)
    return NextResponse.json({ error: "Caldera not configured" }, { status: 500 });

  try {
    const { paw, group } = await req.json();
    if (!paw || !group)
      return NextResponse.json({ error: "paw and group are required" }, { status: 400 });

    const res = await fetch(`${calderaUrl}/api/v2/agents/${paw}`, {
      method: "PATCH",
      headers: {
        KEY: calderaKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ group }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Caldera ${res.status}: ${text}` }, { status: 502 });
    }

    return NextResponse.json(await res.json());
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

// Keep existing GET from the agents route
export async function GET() {
  const calderaUrl = process.env.CALDERA_URL;
  const calderaKey = process.env.CALDERA_API_KEY;
  if (!calderaUrl || !calderaKey)
    return NextResponse.json({ error: "Caldera not configured" }, { status: 500 });

  try {
    const res = await fetch(`${calderaUrl}/api/v2/agents`, {
      headers: { KEY: calderaKey },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok)
      return NextResponse.json({ error: `Caldera ${res.status}` }, { status: 502 });

    const agents: any[] = await res.json();
    const now = Date.now();

    const mapped = agents.map((a) => {
      const lastSeen    = new Date(a.last_seen).getTime();
      const diffSeconds = (now - lastSeen) / 1000;
      return {
        paw:           a.paw,
        host:          a.host,
        host_ip_addrs: Array.isArray(a.host_ip_addrs) ? a.host_ip_addrs : [],
        group:         a.group ?? "",
        platform:      a.platform ?? "",
        last_seen:     a.last_seen,
        alive:         diffSeconds < 300,
      };
    });

    return NextResponse.json(mapped);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}