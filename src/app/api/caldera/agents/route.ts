import { NextResponse } from "next/server";

export async function GET() {
  const calderaUrl = process.env.CALDERA_URL;
  const calderaKey = process.env.CALDERA_API_KEY;
  if (!calderaUrl || !calderaKey) {
    return NextResponse.json({ error: "Caldera not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`${calderaUrl}/api/v2/agents`, {
      headers: { KEY: calderaKey },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Caldera ${res.status}` }, { status: 502 });
    }

    const agents: any[] = await res.json();
    const now = Date.now();

    const mapped = agents.map((a) => {
      const lastSeen = new Date(a.last_seen).getTime();
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
