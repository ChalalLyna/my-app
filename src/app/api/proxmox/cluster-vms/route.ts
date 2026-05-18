import { NextResponse } from "next/server";

/**
 * GET /api/proxmox/cluster-vms
 * Returns all VMs in the Proxmox cluster with live metrics (cpu, mem, uptime, status).
 * One cluster-wide call — efficient for polling all VMs at once.
 */
export async function GET() {
  const proxmoxUrl   = process.env.PROXMOX_URL;
  const proxmoxToken = process.env.PROXMOX_TOKEN;
  if (!proxmoxUrl || !proxmoxToken)
    return NextResponse.json({ error: "Proxmox not configured" }, { status: 500 });

  const headers = { Authorization: `PVEAPIToken=${proxmoxToken}` };

  try {
    const res = await fetch(
      `${proxmoxUrl}/api2/json/cluster/resources?type=vm`,
      { headers, cache: "no-store", signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok)
      return NextResponse.json({ error: `Proxmox error: ${res.status}` }, { status: 502 });

    const data: any[] = (await res.json())?.data ?? [];

    const vms = data.map((vm: any) => ({
      vmid:    Number(vm.vmid),
      name:    vm.name    ?? "",
      node:    vm.node    ?? "",
      status:  vm.status  ?? "unknown",
      cpu:     vm.cpu     ?? 0,   // fraction of host CPU capacity
      mem:     vm.mem     ?? 0,   // bytes used
      maxmem:  vm.maxmem  ?? 0,   // bytes allocated
      maxdisk: vm.maxdisk ?? 0,   // bytes allocated
      uptime:  vm.uptime  ?? 0,   // seconds
    }));

    return NextResponse.json(vms);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
