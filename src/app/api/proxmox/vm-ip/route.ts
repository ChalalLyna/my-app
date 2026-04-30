import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const vmid = req.nextUrl.searchParams.get("vmid");
  if (!vmid) return NextResponse.json({ error: "vmid required" }, { status: 400 });

  const proxmoxUrl = process.env.PROXMOX_URL;
  const proxmoxToken = process.env.PROXMOX_TOKEN;
  if (!proxmoxUrl || !proxmoxToken) {
    return NextResponse.json({ error: "Proxmox not configured" }, { status: 500 });
  }

  const headers = { Authorization: `PVEAPIToken=${proxmoxToken}` };

  try {
    // 1. Find the node that hosts this VM via cluster resources
    const clusterRes = await fetch(
      `${proxmoxUrl}/api2/json/cluster/resources?type=vm`,
      { headers, cache: "no-store", signal: AbortSignal.timeout(10000) }
    );
    if (!clusterRes.ok) {
      return NextResponse.json({ error: `Proxmox cluster error: ${clusterRes.status}` }, { status: 502 });
    }
    const clusterData = await clusterRes.json();
    const vms: any[] = clusterData?.data ?? [];
    const vm = vms.find((v: any) => String(v.vmid) === vmid);
    if (!vm) {
      return NextResponse.json({ error: `VM ${vmid} not found in Proxmox cluster` }, { status: 404 });
    }
    const node: string = vm.node;

    // 2. Get network interfaces from the QEMU guest agent
    const ifRes = await fetch(
      `${proxmoxUrl}/api2/json/nodes/${node}/qemu/${vmid}/agent/network-get-interfaces`,
      { headers, cache: "no-store", signal: AbortSignal.timeout(10000) }
    );
    if (!ifRes.ok) {
      return NextResponse.json(
        { error: `QEMU agent unavailable (${ifRes.status}) — ensure qemu-guest-agent is running on the VM` },
        { status: 502 }
      );
    }
    const ifData = await ifRes.json();
    const interfaces: any[] = ifData?.data?.result ?? [];

    let ip: string | null = null;
    let mac: string | null = null;

    for (const iface of interfaces) {
      if (iface.name === "lo") continue;
      const hw = iface["hardware-address"];
      for (const addr of (iface["ip-addresses"] ?? [])) {
        if (
          addr["ip-address-type"] === "ipv4" &&
          addr["ip-address"] !== "127.0.0.1"
        ) {
          ip = addr["ip-address"];
          mac = hw ?? null;
          break;
        }
      }
      if (ip) break;
    }

    return NextResponse.json({ ip, mac, node, vmid });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
