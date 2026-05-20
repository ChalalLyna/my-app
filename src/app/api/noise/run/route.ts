import { NextRequest, NextResponse } from "next/server";
import { Client } from "ssh2";
import * as fs from "fs";

const KEY_PATH  = process.env.SSH_NOISE_KEY_PATH ?? "/root/.ssh/id_ed25519";
const SSH_USER  = process.env.SSH_NOISE_USER    ?? "pfe";
const SCRIPT    = "powershell.exe -ExecutionPolicy Bypass -File C:\\noise_ad.ps1";

function runNoiseOnHost(ip: string): Promise<void> {
  return new Promise((resolve) => {
    const conn = new Client();

    const timeout = setTimeout(() => {
      conn.destroy();
      resolve();
    }, 15_000);

    conn
      .on("ready", () => {
        conn.exec(SCRIPT, (err, stream) => {
          if (err) { clearTimeout(timeout); conn.end(); resolve(); return; }
          // Fire-and-forget: we don't wait for the script to finish (~1 min)
          stream.on("close", () => { clearTimeout(timeout); conn.end(); resolve(); });
          stream.on("data",  () => {});
          stream.stderr.on("data", () => {});
        });
      })
      .on("error", () => { clearTimeout(timeout); resolve(); })
      .connect({
        host:           ip,
        port:           22,
        username:       SSH_USER,
        privateKey:     fs.readFileSync(KEY_PATH),
        readyTimeout:   10_000,
        algorithms: {
          serverHostKey: ["ssh-ed25519", "ecdsa-sha2-nistp256", "rsa-sha2-256", "rsa-sha2-512"],
        },
      });
  });
}

/**
 * POST /api/noise/run
 * Body: { ips: string[] }
 * Connects to each machine via SSH and starts noise_ad.ps1 (fire-and-forget).
 * Returns as soon as all SSH connections are established; the script runs ~1 min on each machine.
 */
export async function POST(req: NextRequest) {
  let ips: string[];
  try {
    const body = await req.json();
    ips = Array.isArray(body.ips) ? body.ips.filter(Boolean) : [];
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (ips.length === 0)
    return NextResponse.json({ error: "No IPs provided" }, { status: 400 });

  if (!fs.existsSync(KEY_PATH))
    return NextResponse.json({ error: `SSH key not found at ${KEY_PATH}` }, { status: 500 });

  // Connect to all machines in parallel; we don't await the script completion
  await Promise.all(ips.map(runNoiseOnHost));

  return NextResponse.json({ ok: true, targets: ips });
}
