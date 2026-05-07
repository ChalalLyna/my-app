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

export async function GET(_req: NextRequest) {
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

export async function POST(req: NextRequest) {
  if (!requireAdmin(req))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  try {
    const {
      nom, categorie, description, typeActif,
      nomMachine, os, ip, vlan, vmidProxmox, cpu, ram, disk,
    } = await req.json();

    if (!nom || !categorie || !typeActif || !nomMachine || vmidProxmox == null)
      return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });

    if (!["lab", "client"].includes(typeActif))
      return NextResponse.json({ error: "TypeActif invalide (lab | client)." }, { status: 400 });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [r1] = await conn.execute(
        `INSERT INTO MachineVirtuelle (nomMachine, OS, IP, Vlan, VmIdProxmox, CPUmax, RAMmax, Disk)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [nomMachine, os ?? null, ip ?? null, vlan ?? null, Number(vmidProxmox), cpu ?? null, ram ?? null, disk ?? null]
      );
      const idVM = (r1 as any).insertId;

      const [r2] = await conn.execute(
        "INSERT INTO Actif (nom, `catégorie`, description, TypeActif, IdVM) VALUES (?, ?, ?, ?, ?)",
        [nom, categorie, description ?? null, typeActif, idVM]
      );

      await conn.commit();
      return NextResponse.json({ success: true, id: (r2 as any).insertId }, { status: 201 });
    } catch (e: any) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
