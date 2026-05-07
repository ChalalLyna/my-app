import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const vmid = req.nextUrl.searchParams.get("vmid");
  if (!vmid) return NextResponse.json({ error: "vmid required" }, { status: 400 });

  const proxmoxUrl   = process.env.PROXMOX_URL;
  const proxmoxToken = process.env.PROXMOX_TOKEN;
  if (!proxmoxUrl || !proxmoxToken)
    return NextResponse.json({ error: "Proxmox not configured" }, { status: 500 });

  const headers = { Authorization: `PVEAPIToken=${proxmoxToken}` };

  try {
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

    if (vm.status !== "running")
      return NextResponse.json({ error: "VM is not running", vmid }, { status: 409 });

    const res = await fetch(
      `${proxmoxUrl}/api2/json/nodes/${vm.node}/qemu/${vmid}/status/reboot`,
      { method: "POST", headers, cache: "no-store", signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok)
      return NextResponse.json({ error: `Reboot failed: ${res.status}` }, { status: 502 });

    return NextResponse.json({ status: "rebooting", vmid, node: vm.node });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
