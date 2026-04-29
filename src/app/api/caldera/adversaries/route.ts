import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(`${process.env.CALDERA_URL}/api/v2/adversaries`, {
      headers: { KEY: process.env.CALDERA_API_KEY! },
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
