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
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(req))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { id } = await params;

  try {
    const {
      nom, categorie, description, typeActif,
      nomMachine, os, ip, vlan, vmidProxmox, cpu, ram, disk,
    } = await req.json();

    if (!nom || !categorie || !typeActif || !nomMachine || vmidProxmox == null)
      return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });

    if (!["lab", "client"].includes(typeActif))
      return NextResponse.json({ error: "TypeActif invalide." }, { status: 400 });

    const [rows] = await pool.execute(
      "SELECT IdVM FROM Actif WHERE IdActif = ?",
      [id]
    );
    const asset = (rows as any[])[0];
    if (!asset) return NextResponse.json({ error: "Asset introuvable." }, { status: 404 });

    await pool.execute(
      `UPDATE MachineVirtuelle
       SET nomMachine=?, OS=?, IP=?, Vlan=?, VmIdProxmox=?, CPUmax=?, RAMmax=?, Disk=?
       WHERE IdVM=?`,
      [nomMachine, os ?? null, ip ?? null, vlan ?? null, Number(vmidProxmox), cpu ?? null, ram ?? null, disk ?? null, asset.IdVM]
    );

    await pool.execute(
      "UPDATE Actif SET nom=?, `catégorie`=?, description=?, TypeActif=? WHERE IdActif=?",
      [nom, categorie, description ?? null, typeActif, id]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(req))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { id } = await params;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      "SELECT IdVM FROM Actif WHERE IdActif = ?",
      [id]
    );
    const asset = (rows as any[])[0];
    if (!asset) {
      await conn.rollback();
      return NextResponse.json({ error: "Asset introuvable." }, { status: 404 });
    }
    const idVM = asset.IdVM;

    await conn.execute("DELETE FROM Actif WHERE IdActif = ?", [id]);

    const [remaining] = await conn.execute(
      "SELECT COUNT(*) AS cnt FROM Actif WHERE IdVM = ?",
      [idVM]
    );
    if ((remaining as any[])[0].cnt === 0) {
      await conn.execute("DELETE FROM MachineVirtuelle WHERE IdVM = ?", [idVM]);
    }

    await conn.commit();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    await conn.rollback();
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    conn.release();
  }
}
