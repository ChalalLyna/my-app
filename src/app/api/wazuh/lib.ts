export async function getWazuhManagerToken(): Promise<{ token: string; baseUrl: string }> {
  const baseUrl = process.env.WAZUH_MANAGER_URL;
  const user = process.env.WAZUH_USER;
  const pass = process.env.WAZUH_PASSWORD;

  if (!baseUrl || !user || !pass) {
    throw new Error("Wazuh Manager not configured (missing WAZUH_MANAGER_URL)");
  }

  const res = await fetch(`${baseUrl}/security/user/authenticate`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Wazuh auth failed (${res.status}): ${text.slice(0, 100)}`);
  }

  const data = await res.json();
  const token = data?.data?.token as string | undefined;
  if (!token) throw new Error("No token in Wazuh auth response");

  return { token, baseUrl };
}
