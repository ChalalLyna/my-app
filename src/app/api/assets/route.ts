import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const missionId = searchParams.get("missionId");

    // missionId → client assets for that mission
    // no missionId   → lab assets only
    const sql = `
      SELECT
        a.IdActif        AS id,
        a.nom            AS name,
        a.description,
        a.\`catégorie\`  AS category,
        a.TypeActif      AS typeActif,
        mv.nomMachine,
        mv.OS            AS os,
        mv.IP            AS ip,
        mv.Vlan          AS vlan,
        mv.VmIdProxmox   AS vmidProxmox,
        mv.CPUmax        AS cpu,
        mv.RAMmax        AS ram,
        mv.Disk          AS disk
      FROM Actif a
      JOIN MachineVirtuelle mv ON a.IdVM = mv.IdVM
      WHERE ${missionId ? "a.TypeActif = 'client' AND a.IdMission = ?" : "a.TypeActif = 'lab'"}
      ORDER BY a.nom
    `;
    const queryParams = missionId ? [Number(missionId)] : [];

    const [rows] = await pool.query<RowDataPacket[]>(sql, queryParams);

    const assets = rows.map((row) => ({
      id:          String(row.id),
      name:        row.name,
      description: row.description ?? "",
      category:    row.category ?? "",
      typeActif:   row.typeActif,
      nomMachine:  row.nomMachine ?? "",
      os:          row.os ?? "",
      ip:          row.ip ?? "",
      vlan:        row.vlan ?? "",
      vmidProxmox: row.vmidProxmox != null ? Number(row.vmidProxmox) : undefined,
      cpu:         row.cpu ?? "",
      ram:         row.ram ?? "",
      disk:        row.disk ?? "",
    }));

    return NextResponse.json(assets);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
