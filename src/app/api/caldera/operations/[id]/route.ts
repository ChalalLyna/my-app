import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/caldera/operations/[id]">) {
  try {
    const { id } = await ctx.params;
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
