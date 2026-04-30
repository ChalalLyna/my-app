import { NextResponse } from "next/server";
import { getWazuhManagerToken } from "../lib";

export async function POST() {
  try {
    const { token, baseUrl } = await getWazuhManagerToken();

    const res = await fetch(`${baseUrl}/manager/restart`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json({ error: `Wazuh ${res.status}: ${text.slice(0, 200)}` }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
