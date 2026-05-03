import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await fetch(`${process.env.CALDERA_URL}/api/v2/operations/${id}`, {
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const res = await fetch(`${process.env.CALDERA_URL}/api/v2/operations/${id}`, {
      method: "PATCH",
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
