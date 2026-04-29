import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${process.env.CALDERA_URL}/api/v2/operations`, {
      method: "POST",
      headers: {
        KEY: process.env.CALDERA_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Caldera ${res.status}` }, { status: 502 });
    }
    return NextResponse.json(await res.json());
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
