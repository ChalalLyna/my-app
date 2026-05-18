import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/proxmox/vm-config?vmid=X
 * Updates the VM name in Proxmox.
 * Body: { name: string }
 */
export async function POST(req: NextRequest) {
  const vmid = req.nextUrl.searchParams.get("vmid");
  if (!vmid) return NextResponse.json({ error: "vmid required" }, { status: 400 });

  const proxmoxUrl   = process.env.PROXMOX_URL;
  const proxmoxToken = process.env.PROXMOX_TOKEN;
  if (!proxmoxUrl || !proxmoxToken)
    return NextResponse.json({ error: "Proxmox not configured" }, { status: 500 });

  const headers = { Authorization: `PVEAPIToken=${proxmoxToken}` };

  try {
    const { name, cores, memory } = await req.json();

    // Find the node hosting this VM
    const clusterRes = await fetch(
      `${proxmoxUrl}/api2/json/cluster/resources?type=vm`,
      { headers, cache: "no-store", signal: AbortSignal.timeout(10_000) }
    );
    if (!clusterRes.ok)
      return NextResponse.json({ error: `Proxmox error: ${clusterRes.status}` }, { status: 502 });

    const vms: any[] = (await clusterRes.json())?.data ?? [];
    const vm = vms.find((v: any) => String(v.vmid) === vmid);
    if (!vm)
      return NextResponse.json({ error: `VM ${vmid} not found` }, { status: 404 });

    // Build config payload — only include fields that were provided
    const params: Record<string, string> = {};
    if (name)   params.name   = name;
    if (cores)  params.cores  = String(Number(cores));
    if (memory) params.memory = String(Number(memory));

    if (Object.keys(params).length === 0)
      return NextResponse.json({ success: true, skipped: true });

    const configRes = await fetch(
      `${proxmoxUrl}/api2/json/nodes/${vm.node}/qemu/${vmid}/config`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(params).toString(),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (!configRes.ok)
      return NextResponse.json({ error: `Proxmox config error: ${configRes.status}` }, { status: 502 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
