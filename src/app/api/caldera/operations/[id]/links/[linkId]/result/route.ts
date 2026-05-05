import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/caldera/operations/[id]/links/[linkId]/result
 *
 * Fetches the real stdout/stderr output of a specific Caldera link.
 * The `output` field in the chain summary is often just "True" —
 * this endpoint returns the actual base64-encoded command result.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  const calderaUrl = process.env.CALDERA_URL;
  const calderaKey = process.env.CALDERA_API_KEY;
  if (!calderaUrl || !calderaKey)
    return NextResponse.json({ error: "Caldera not configured" }, { status: 500 });

  try {
    const { id, linkId } = await params;
    const res = await fetch(
      `${calderaUrl}/api/v2/operations/${id}/links/${linkId}/result`,
      {
        headers: { KEY: calderaKey },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Caldera ${res.status}: ${text}` }, { status: 502 });
    }
    return NextResponse.json(await res.json());
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}