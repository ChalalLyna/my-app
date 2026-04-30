import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/proxmox/vm-start?vmid=109
 * Starts a VM if it is not already running.
 * Returns { status: "already_running" | "started" | "error", ... }
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
    // 1. Find the node hosting this VM
    const clusterRes = await fetch(
      `${proxmoxUrl}/api2/json/cluster/resources?type=vm`,
      { headers, cache: "no-store", signal: AbortSignal.timeout(10_000) }
    );
    if (!clusterRes.ok)
      return NextResponse.json({ error: `Proxmox cluster error: ${clusterRes.status}` }, { status: 502 });

    const vms: any[] = (await clusterRes.json())?.data ?? [];
    const vm = vms.find((v: any) => String(v.vmid) === vmid);
    if (!vm)
      return NextResponse.json({ error: `VM ${vmid} not found in cluster` }, { status: 404 });

    const node: string = vm.node;

    // 2. Already running? → skip
    if (vm.status === "running")
      return NextResponse.json({ status: "already_running", vmid, node });

    // 3. Send start command
    const startRes = await fetch(
      `${proxmoxUrl}/api2/json/nodes/${node}/qemu/${vmid}/status/start`,
      { method: "POST", headers, cache: "no-store", signal: AbortSignal.timeout(10_000) }
    );
    if (!startRes.ok)
      return NextResponse.json({ error: `Start failed: ${startRes.status}` }, { status: 502 });

    return NextResponse.json({ status: "started", vmid, node });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}