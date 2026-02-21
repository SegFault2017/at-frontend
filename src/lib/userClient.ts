const AT_USER_URL = process.env.NEXT_PUBLIC_AT_USER_URL ?? "http://localhost:8001";
const AT_TUTOR_URL = process.env.NEXT_PUBLIC_AT_TUTOR_URL ?? "http://localhost:8000";

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export interface MasteryEntry {
  topic: string;
  sessions_count: number;
  avg_time_seconds: number;
  avg_hints: number;
  clean_solve_rate: number;
  last_solved_at: string;
}

export interface ProblemEntry {
  slug: string;
  time_limit_seconds: number;
}

export interface ProblemSet {
  id: string;
  mode: string;
  status: string;
  problems: ProblemEntry[];
}

export async function syncUser(
  token: string,
  payload: { username: string; email: string; first_name?: string; last_name?: string }
): Promise<UserProfile> {
  const resp = await fetch(`${AT_USER_URL}/auth/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`sync failed: ${resp.status}`);
  return resp.json() as Promise<UserProfile>;
}

export interface SessionPayload {
  slug: string;
  topic_tags: string[];
  mode: string;
  problem_set_id?: string;
  started_at: string;
  completed_at: string;
  time_taken_seconds: number;
  hints_used: number;
  hint_level_reached: number;
  attempts: number;
  passed_core_tests: boolean;
  passed_edge_tests?: boolean;
  solution_time_complexity?: string;
  solution_space_complexity?: string;
  is_optimal?: boolean;
  confidence: number;
}

export async function saveSession(token: string, session: SessionPayload): Promise<{ id: string }> {
  const resp = await fetch(`${AT_USER_URL}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(session),
  });
  if (!resp.ok) throw new Error(`save session failed: ${resp.status}`);
  return resp.json() as Promise<{ id: string }>;
}

export async function getMastery(token: string): Promise<MasteryEntry[]> {
  const resp = await fetch(`${AT_USER_URL}/users/me/mastery`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`mastery fetch failed: ${resp.status}`);
  return resp.json() as Promise<MasteryEntry[]>;
}

export async function generateProblemSet(token: string, userId: string, mode: string): Promise<ProblemSet> {
  const resp = await fetch(`${AT_TUTOR_URL}/api/problemset/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ user_id: userId, mode }),
  });
  if (!resp.ok) throw new Error(`generate failed: ${resp.status}`);
  return resp.json() as Promise<ProblemSet>;
}
