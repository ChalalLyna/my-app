import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ vmid: string }> }
) {
  if (!requireAdmin(req))
    return NextResponse.json({ error: "Access denied." }, { status: 403 });

  const { vmid } = await params;
  const vmidNum = Number(vmid);
  if (isNaN(vmidNum))
    return NextResponse.json({ error: "Invalid VMID." }, { status: 400 });

  try {
    const { nomMachine, os, ip, vlan, vmidProxmox, cpu, ram, disk } = await req.json();

    if (!nomMachine || vmidProxmox == null)
      return NextResponse.json({ error: "Machine name and VMID are required." }, { status: 400 });

    const [rows] = await pool.execute(
      "SELECT IdVM FROM MachineVirtuelle WHERE VmIdProxmox = ?",
      [vmidNum]
    );
    const vm = (rows as any[])[0];
    if (!vm)
      return NextResponse.json({ error: "VM not found." }, { status: 404 });

    await pool.execute(
      `UPDATE MachineVirtuelle
       SET nomMachine=?, OS=?, IP=?, Vlan=?, VmIdProxmox=?, CPUmax=?, RAMmax=?, Disk=?
       WHERE IdVM=?`,
      [nomMachine, os ?? null, ip ?? null, vlan ?? null, Number(vmidProxmox), cpu ?? null, ram ?? null, disk ?? null, vm.IdVM]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
