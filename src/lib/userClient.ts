import type { CaseCategory, PlannedProblem, SubmitResult } from "@/lib/api";

const AT_USER_URL = process.env.NEXT_PUBLIC_AT_USER_URL ?? "http://localhost:8002";

export interface MasteryEntry {
  topic: string;
  attempts_count: number;
  clean_solve_rate: number;
  // Null when the topic has no accepted Attempt yet
  avg_time_seconds: number | null;
  avg_hints: number | null;
  last_solved_at: string | null;
}

export interface ProblemSet {
  id: string;
  mode: string;
  problems: PlannedProblem[];
  generated_at: string;
}

export interface AttemptPayload {
  slug: string;
  topic_tags: string[];
  problem_set_id?: string; // at-auth derives the Attempt's mode from this
  started_at: string;
  submitted_at: string;
  submit_index: number;
  hints_used: number;
  verdict: SubmitResult["verdict"];
  passed: number;
  failed: number;
  total: number;
  runtime_ms: number;
  case_categories: Partial<Record<CaseCategory, { passed: number; total: number }>>;
  confidence?: number; // 1 to 5, accepted only
}

/** One Attempt from a Submit the executor ran. The caller adds `confidence` later, and only on an accepted Attempt. */
export function attemptFrom(
  result: SubmitResult,
  ctx: Pick<AttemptPayload, "slug" | "topic_tags" | "problem_set_id" | "started_at" | "submit_index" | "hints_used">
): AttemptPayload {
  const case_categories: AttemptPayload["case_categories"] = {};
  for (const r of result.results) {
    if (!r.category) continue; // older suites have no categories
    const count = (case_categories[r.category] ??= { passed: 0, total: 0 });
    count.total += 1;
    if (r.passed) count.passed += 1;
  }
  return {
    ...ctx,
    submitted_at: new Date().toISOString(),
    verdict: result.verdict,
    passed: result.passed,
    failed: result.failed,
    total: result.total,
    runtime_ms: result.runtime_ms,
    case_categories,
  };
}

async function authed<T>(token: string, path: string, body?: unknown): Promise<T> {
  const resp = await fetch(`${AT_USER_URL}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`${path} failed: ${resp.status}`);
  return resp.json() as Promise<T>;
}

export const saveAttempt = (token: string, attempt: AttemptPayload) =>
  authed<{ id: string }>(token, "/attempts", attempt);

export const getMastery = (token: string) => authed<MasteryEntry[]>(token, "/users/me/mastery");

export const saveProblemSet = (token: string, mode: string, problems: PlannedProblem[]) =>
  authed<ProblemSet>(token, "/problemsets", { mode, problems });

export type Attempt = AttemptPayload & { id: string; mode: "free" | "problem_set" };

/** Newest first. */
export const getAttempts = (token: string) => authed<Attempt[]>(token, "/users/me/attempts");
