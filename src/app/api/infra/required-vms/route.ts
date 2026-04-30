import { NextResponse } from "next/server";
import pool from "@/lib/db";

/**
 * GET /api/infra/required-vms
 * Returns the VmIdProxmox of the 3 infrastructure VMs that must always
 * be running before an attack simulation:
 *   - Wazuh  (nomMachine LIKE '%wazuh%')
 *   - Caldera(nomMachine LIKE '%caldera%')
 *   - Router (nomMachine LIKE '%router%')
 */
export async function GET() {
  try {
    const [rows] = await pool.query(`
      SELECT nomMachine, VmIdProxmox
      FROM MachineVirtuelle
      WHERE
        nomMachine LIKE '%wazuh%'   OR
        nomMachine LIKE '%caldera%' OR
        nomMachine LIKE '%router%'
      ORDER BY nomMachine
    `);

    const vms = (rows as any[])
      .filter((r) => r.VmIdProxmox != null)
      .map((r) => ({
        name:  r.nomMachine as string,
        vmid:  Number(r.VmIdProxmox),
      }));

    return NextResponse.json(vms);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}