import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/proxmox/vm-network?vmid=109
 * Returns all network interfaces of a VM via QEMU guest agent.
 * Returns: { vmid, node, interfaces: [{ name, mac, addresses: [{ ip, type, prefix }] }] }
 */
export async function GET(req: NextRequest) {
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

    const ifRes = await fetch(
      `${proxmoxUrl}/api2/json/nodes/${vm.node}/qemu/${vmid}/agent/network-get-interfaces`,
      { headers, cache: "no-store", signal: AbortSignal.timeout(10_000) }
    );
    if (!ifRes.ok)
      return NextResponse.json(
        { error: `QEMU guest agent unavailable (${ifRes.status}) — ensure qemu-guest-agent is running` },
        { status: 502 }
      );

    const raw: any[] = (await ifRes.json())?.data?.result ?? [];

    const interfaces = raw
      .filter((iface: any) => iface.name !== "lo")
      .map((iface: any) => ({
        name: iface.name,
        mac:  iface["hardware-address"] ?? null,
        addresses: (iface["ip-addresses"] ?? []).map((a: any) => ({
          ip:     a["ip-address"],
          type:   a["ip-address-type"],
          prefix: a["prefix"],
        })),
      }));

    return NextResponse.json({ vmid: Number(vmid), node: vm.node, interfaces });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
