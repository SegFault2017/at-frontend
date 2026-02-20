const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Problem {
  title: string;
  slug: string;
  difficulty: string;
  description: string;
  summary: string;
  examples: { input: string; output: string; explanation?: string }[];
  constraints: string[];
  starter_code: string;
  leetcode_hints?: string[];
}

export interface TestCase {
  id: string;
  input: string;
  expected: string;
  actual?: string;
  passed?: boolean | null; // null = not run yet
  status: 'pending' | 'running' | 'completed';
  isCustom: boolean;
}

export interface HintResponse {
  hint: string;
  hint_level: number;
  cached?: boolean;
  cost_usd?: number;
}

export interface ReviewResponse {
  status: string;
  feedback: string;
  cost_usd?: number;
}

export async function fetchProblem(
  slug: string,
  leetcodeSession?: string
): Promise<Problem> {
  const url = new URL(`${API_BASE}/api/problem/${slug}`);
  if (leetcodeSession) {
    url.searchParams.set("leetcode_session", leetcodeSession);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `Failed to fetch problem (${res.status})`);
  }
  return res.json();
}


/**
 * Fetch hint with streaming response.
 * @param onChunk - Called for each text chunk as it arrives
 * @param onDone - Called when streaming completes
 * @param onCost - Called with cost in USD when the stream ends
 */
export async function fetchHintStream(
  problemSummary: string,
  problemDescription: string,
  userCode: string,
  hintLevel: number,
  previousHints: string[],
  onChunk: (text: string) => void,
  onDone: () => void,
  leetcodeHints: string[] = [],
  onCost?: (costUsd: number) => void
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/hint/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      problem_summary: problemSummary,
      problem_description: problemDescription,
      user_code: userCode,
      hint_level: hintLevel,
      previous_hints: previousHints,
      leetcode_hints: leetcodeHints,
    }),
  });

  if (!res.ok) throw new Error("Failed to get hint stream");
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") {
          onDone();
          return;
        }
        if (data.startsWith("[COST:")) {
          const cost = parseFloat(data.slice(6, -1));
          if (!isNaN(cost)) onCost?.(cost);
          continue;
        }
        if (data.startsWith("[ERROR]")) {
          throw new Error(data.slice(8));
        }
        onChunk(data);
      }
    }
  }
  onDone();
}

/**
 * Pre-generate all 3 hint levels in the background.
 * Call this when a problem loads to warm the cache.
 */
export async function pregenerateHints(
  problemSummary: string,
  problemDescription: string,
  userCode: string
): Promise<void> {
  // Fire and forget - we don't need the result, just warming the cache
  fetch(`${API_BASE}/api/hints/pregenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      problem_summary: problemSummary,
      problem_description: problemDescription,
      user_code: userCode,
      hint_level: 1, // Required by schema but ignored for pregeneration
      previous_hints: [],
    }),
  }).catch(() => {
    // Silently ignore errors - this is just a cache warming optimization
  });
}

export async function fetchReview(
  problemSummary: string,
  userCode: string,
  testResults: {
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
  }[]
): Promise<ReviewResponse> {
  const res = await fetch(`${API_BASE}/api/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      problem_summary: problemSummary,
      user_code: userCode,
      test_results: testResults,
    }),
  });
  if (!res.ok) throw new Error("Failed to get review");
  return res.json();
}
