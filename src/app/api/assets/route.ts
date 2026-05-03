import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await pool.query(`
      SELECT
        a.IdActif        AS id,
        a.nom            AS name,
        a.description,
        a.\`catégorie\`  AS category,
        mv.nomMachine,
        mv.OS            AS os,
        mv.IP            AS ip,
        mv.VmIdProxmox   AS vmidProxmox,
        mv.CPUmax        AS cpu,
        mv.RAMmax        AS ram,
        mv.Disk          AS disk
      FROM Actif a
      JOIN MachineVirtuelle mv ON a.IdVM = mv.IdVM
      ORDER BY a.nom
    `);

    const assets = (rows as any[]).map((row) => ({
      id:           String(row.id),
      name:         row.name,
      description:  row.description ?? "",
      category:     row.category ?? "",
      nomMachine:   row.nomMachine ?? "",
      os:           row.os ?? "",
      ip:           row.ip ?? "",
      vmidProxmox:  row.vmidProxmox != null ? Number(row.vmidProxmox) : undefined,
      cpu:          row.cpu ?? "",
      ram:          row.ram ?? "",
      disk:         row.disk ?? "",
    }));

    return NextResponse.json(assets);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
