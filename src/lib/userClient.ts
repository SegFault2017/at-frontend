const AT_USER_URL = process.env.NEXT_PUBLIC_AT_USER_URL ?? "http://localhost:8001";
const AT_TUTOR_URL = process.env.NEXT_PUBLIC_AT_TUTOR_URL ?? "http://localhost:8000";

export async function syncUser(
  token: string,
  payload: { username: string; email: string; first_name?: string; last_name?: string }
) {
  const resp = await fetch(`${AT_USER_URL}/auth/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`sync failed: ${resp.status}`);
  return resp.json();
}

export async function saveSession(token: string, session: Record<string, unknown>) {
  const resp = await fetch(`${AT_USER_URL}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(session),
  });
  if (!resp.ok) throw new Error(`save session failed: ${resp.status}`);
  return resp.json();
}

export async function getMastery(token: string) {
  const resp = await fetch(`${AT_USER_URL}/users/me/mastery`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`mastery fetch failed: ${resp.status}`);
  return resp.json();
}

export async function generateProblemSet(token: string, userId: string, mode: string) {
  const resp = await fetch(`${AT_TUTOR_URL}/api/problemset/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ user_id: userId, mode }),
  });
  if (!resp.ok) throw new Error(`generate failed: ${resp.status}`);
  return resp.json();
}
