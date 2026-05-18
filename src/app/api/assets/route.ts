import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await pool.query(`
      SELECT
        a.IdActif                          AS id,
        COALESCE(a.nom, mv.nomMachine)     AS name,
        COALESCE(a.description, '')        AS description,
        COALESCE(a.\`catégorie\`, '')      AS category,
        mv.nomMachine,
        mv.OS                              AS os,
        mv.IP                             AS ip,
        mv.VmIdProxmox                     AS vmidProxmox,
        mv.CPUmax                          AS cpu,
        mv.RAMmax                          AS ram,
        mv.Disk                            AS disk
      FROM MachineVirtuelle mv
      LEFT JOIN Actif a ON a.IdVM = mv.IdVM
      WHERE mv.VmIdProxmox IS NOT NULL
      ORDER BY name
    `);

    const assets = (rows as any[]).map((row) => ({
      id:           row.id != null ? String(row.id) : `mv_${row.vmidProxmox}`,
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

