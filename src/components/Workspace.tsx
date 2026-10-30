"use client";

import { useState, useEffect } from "react";
import CodeEditor from "@/components/CodeEditor";
import ConsoleOutput from "@/components/ConsoleOutput";
import ProblemPanel from "@/components/ProblemPanel";
import SubmitResultView from "@/components/SubmitResultView";
import { ConfidenceModal } from "@/components/ConfidenceModal";
import { Timer } from "@/components/Timer";
import { useAuth } from "@/components/AuthProvider";
import { runPython, terminateWorker, initializePyodide, retryInitialization } from "@/lib/pyodideRunner";
import { fetchProblem, fetchHintStream, fetchReview, pregenerateHints } from "@/lib/api";
import type { FailingCase, Problem, TestCase } from "@/lib/api";
import { useSubmit } from "@/lib/useSubmit";
import { attemptFrom, saveAttempt } from "@/lib/userClient";
import type { AttemptPayload } from "@/lib/userClient";

type PyodideStatus = 'loading' | 'ready' | 'error';

interface Props {
  slug: string | null;
  initialCode?: string; // replaces the starter code once the problem loads
  problemSetId?: string;
  timeLimitSeconds?: number; // when set, time running out submits the editor's code
}

/** The editor, Run, Submit, hints and review for one problem. Free mode and each problem in a set both use it. */
export default function Workspace(props: Props) {
  const [pyodideStatus, setPyodideStatus] = useState<PyodideStatus>('loading');

  // One Pyodide worker outlives every problem; restarting it per problem would take seconds
  useEffect(() => {
    initializePyodide(setPyodideStatus);
    return () => terminateWorker();
  }, []);

  // A new key per problem gives each one fresh state, so nothing from the last problem carries over
  return (
    <ProblemSession
      key={`${props.slug}:${props.initialCode ? "dev" : ""}`}
      {...props}
      pyodideStatus={pyodideStatus}
      onRetryPyodide={() => retryInitialization(setPyodideStatus)}
    />
  );
}

function ProblemSession({
  slug,
  initialCode,
  problemSetId,
  timeLimitSeconds,
  pyodideStatus,
  onRetryPyodide,
}: Props & { pyodideStatus: PyodideStatus; onRetryPyodide: () => void }) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [problemLoading, setProblemLoading] = useState(slug !== null);
  const [problemError, setProblemError] = useState<string | null>(null);
  const [openedAt, setOpenedAt] = useState(() => new Date());
  const [submitCount, setSubmitCount] = useState(0);
  const [expired, setExpired] = useState(false);

  const [code, setCode] = useState("# Write your solution here\n\n");
  const [consoleOutput, setConsoleOutput] = useState("");

  const [hints, setHints] = useState<string[]>([]);
  const [streamingHint, setStreamingHint] = useState("");
  const [hintLoading, setHintLoading] = useState(false);

  const sub = useSubmit();
  const done = sub.state.kind === "done" ? sub.state : null;
  const [reviewLoading, setReviewLoading] = useState(false);
  const [totalCost, setTotalCost] = useState(0);

  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [runningTests, setRunningTests] = useState(false);
  const [completedTests, setCompletedTests] = useState(0);

  const { isSignedIn, getToken } = useAuth();
  // An accepted Attempt waits here until the learner rates their confidence
  const [pendingAttempt, setPendingAttempt] = useState<AttemptPayload | null>(null);

  // Runs once: the parent remounts this component for every problem
  useEffect(() => {
    if (!slug) return;
    fetchProblem(slug)
      .then((p) => {
        setProblem(p);
        setOpenedAt(new Date());
        const starterCode = initialCode ?? (p.starter_code ? p.starter_code + "\n" : "# Write your solution here\n\n");
        setCode(starterCode);

        // Convert examples to test cases
        setTestCases(p.examples.map((ex, i) => ({
          id: `example-${i}`,
          input: ex.input || "",
          expected: ex.output || "",
          passed: null,
          status: 'pending',
          isCustom: false,
        })));

        // Pre-generate hints in the background (fire and forget)
        pregenerateHints(p.title, p.description, starterCode);
      })
      .catch((e: unknown) => setProblemError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setProblemLoading(false));
  }, [slug, initialCode]);

  async function handleRunTests() {
    if (testCases.length === 0 || pyodideStatus !== 'ready') {
      return;
    }

    setCompletedTests(0);
    setRunningTests(true);
    setConsoleOutput("");

    // Set all tests to 'running' status
    setTestCases((prev) =>
      prev.map((tc) => ({ ...tc, status: 'running' as const, passed: null, actual: undefined }))
    );

    const outputLines: string[] = [];

    // Run tests sequentially to avoid stdout race condition
    // (Pyodide's setStdout is global - parallel execution causes handlers to overwrite each other)
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const { assignments, argNames } = parseTestInput(tc.input);
      const setupCode = assignments ? `${assignments}\n` : '';
      const testCode = `${code}\n\n# Test case ${i + 1}\n${setupCode}result = Solution().${getFunctionName(code)}(${argNames.join(', ')})\nprint(result)`;

      const { stdout, error } = await runPython(testCode);
      const actual = error ? `Error: ${error}` : (stdout?.trim() || "");
      const passed = !error && normalizeOutput(actual) === normalizeOutput(tc.expected);

      // Update this specific test case immediately
      setTestCases((prev) =>
        prev.map((prevTc, idx) =>
          idx === i ? { ...prevTc, actual, passed, status: 'completed' as const } : prevTc
        )
      );
      setCompletedTests((prev) => prev + 1);

      const status = passed ? "✓" : "✗";
      outputLines[i] = `Test ${i + 1}: ${status} | Input: ${tc.input} | Expected: ${tc.expected} | Got: ${actual}`;

      // Update console with current progress
      setConsoleOutput(outputLines.filter(Boolean).join("\n"));
    }
    setRunningTests(false);
  }

  function addTestCase(input: string, expected: string) {
    const newTestCase: TestCase = {
      id: `custom-${Date.now()}`,
      input,
      expected,
      passed: null,
      status: 'pending',
      isCustom: true,
    };
    setTestCases((prev) => [...prev, newTestCase]);
  }

  function deleteTestCase(id: string) {
    setTestCases((prev) => prev.filter((tc) => tc.id !== id));
  }

  async function recordAttempt(attempt: AttemptPayload) {
    const token = await getToken();
    if (token) saveAttempt(token, attempt).catch(console.error); // not awaited, so saving never holds up the learner
  }

  async function handleSubmit() {
    if (!problem) return;
    const res = await sub.submit(problem.slug, code);
    // A Submit that never reached the executor, after a network error or a 502, is not an Attempt
    if (!res) return;
    const submitIndex = submitCount + 1;
    setSubmitCount(submitIndex);
    if (!isSignedIn) return;
    const attempt = attemptFrom(res, {
      slug: problem.slug,
      topic_tags: problem.topic_tags,
      problem_set_id: problemSetId,
      started_at: openedAt.toISOString(),
      submit_index: submitIndex,
      hints_used: hints.length,
    });
    // Only the executor's verdict counts as solved, and only a solve asks for confidence
    if (res.verdict === "accepted") setPendingAttempt(attempt);
    else recordAttempt(attempt);
  }

  // When time runs out, grade the code in the editor instead of recording a made-up failure
  function handleExpire() {
    setExpired(true);
    handleSubmit();
  }

  function handleConfidenceSubmit(rating: number) {
    if (pendingAttempt) recordAttempt({ ...pendingAttempt, confidence: rating });
    setPendingAttempt(null);
  }

  async function handleGetHint(failingCase?: FailingCase) {
    if (!problem) return;
    const level = hints.length + 1;
    setHintLoading(true);
    setStreamingHint("");

    try {
      let fullHint = "";
      await fetchHintStream(
        problem.title,
        problem.description,
        code,
        level,
        hints,
        // onChunk: update streaming text as it arrives
        (chunk) => {
          fullHint += chunk;
          setStreamingHint(fullHint);
        },
        // onDone: finalize the hint
        () => {
          setHints((prev) => [...prev, fullHint]);
          setStreamingHint("");
          setHintLoading(false);
        },
        // Pass LeetCode official hints for context
        problem.hints,
        // onCost: accumulate token cost
        (cost) => setTotalCost((prev) => prev + cost),
        failingCase
      );
    } catch {
      setHints((prev) => [...prev, "Failed to get hint. Please try again."]);
      setStreamingHint("");
      setHintLoading(false);
    }
  }

  async function handleReview() {
    if (!problem || !done) return;
    setReviewLoading(true);

    try {
      const res = await fetchReview(problem.slug, problem.title, code, done.result);
      sub.setReview(res);
      if (res.cost_usd) setTotalCost((prev) => prev + res.cost_usd!);
    } catch {
      sub.setReview({ status: "error", feedback: "Failed to get review. Please try again." });
    } finally {
      setReviewLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — Problem description */}
        <div className="w-1/2 overflow-y-auto border-r border-gruvbox-gray-light">
          {/* Above the problem text: ProblemPanel fills the column, so anything below it is off-screen */}
          {sub.state.kind !== "idle" && (
            <div className="px-6 pt-6">
              {sub.state.kind === "down" && (
                <div className="rounded bg-gruvbox-yellow/20 px-3 py-2 text-sm text-gruvbox-yellow">Executor unavailable. Nothing was run. Try again.</div>
              )}
              {sub.state.kind === "failed" && (
                <div className="rounded bg-gruvbox-red/15 px-3 py-2 text-sm text-gruvbox-red">{sub.state.message}</div>
              )}
              {done && (
                <SubmitResultView
                  result={done.result}
                  revealed={done.revealed}
                  onReveal={sub.reveal}
                  onHint={() => handleGetHint(sub.failingCase)}
                  onReview={handleReview}
                  hintDisabled={hintLoading || hints.length >= 8}
                  reviewLoading={reviewLoading}
                />
              )}
            </div>
          )}
          <ProblemPanel
            problem={problem}
            hints={hints}
            streamingHint={streamingHint}
            review={done?.review?.feedback ?? null}
            isLoading={problemLoading}
            error={problemError}
          />
        </div>

        {/* Right panel — Editor + Console */}
        <div className="flex w-1/2 flex-col">
          <div className="flex-1">
            <CodeEditor value={code} onChange={setCode} />
          </div>
          <div className="h-1/3 border-t border-gruvbox-gray-light bg-gruvbox-bg-dark-soft">
            <ConsoleOutput
              output={consoleOutput}
              isRunning={runningTests}
              testCases={testCases}
              onAddTestCase={addTestCase}
              onDeleteTestCase={deleteTestCase}
            />
          </div>
        </div>
      </div>

      {/* Bottom toolbar */}
      <footer className="flex items-center gap-3 border-t border-gruvbox-gray-light px-6 py-3">
        {timeLimitSeconds !== undefined && (
          <div className="rounded bg-gruvbox-bg-dark px-3 py-1">
            <Timer seconds={timeLimitSeconds} onExpire={handleExpire} />
          </div>
        )}
        {expired && <span className="text-sm text-gruvbox-red">Time&apos;s up. Your code was submitted.</span>}
        {pyodideStatus === 'error' ? (
          <button
            onClick={onRetryPyodide}
            className="rounded-lg bg-gruvbox-red px-4 py-1.5 text-sm font-medium text-gruvbox-bg hover:opacity-90"
          >
            Python Failed — Retry
          </button>
        ) : (
          <button
            onClick={handleRunTests}
            disabled={runningTests || testCases.length === 0 || pyodideStatus !== 'ready'}
            className="rounded-lg bg-gruvbox-green px-4 py-1.5 text-sm font-medium text-gruvbox-bg hover:opacity-90 disabled:opacity-50"
          >
            {pyodideStatus === 'loading'
              ? "Initializing Python..."
              : runningTests
              ? `Running ${completedTests}/${testCases.length}...`
              : `Run Examples (${testCases.length}) · advisory`}
          </button>
        )}
        <button
          onClick={() => handleGetHint()}
          disabled={!problem || hintLoading || hints.length >= 8}
          className="rounded-lg bg-gruvbox-yellow px-4 py-1.5 text-sm font-medium text-gruvbox-bg hover:opacity-90 disabled:opacity-50"
        >
          {hintLoading
            ? "Thinking..."
            : hints.length >= 8
            ? "Max Hints Reached"
            : `Get Hint${problem ? ` (Level ${hints.length + 1})` : ""}`}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!problem || sub.submitting}
          className="rounded-lg bg-gruvbox-aqua px-4 py-1.5 text-sm font-medium text-gruvbox-bg hover:opacity-90 disabled:opacity-50"
        >
          {sub.submitting ? "Submitting..." : "Submit"}
        </button>
        {totalCost > 0 && (
          <span className="ml-auto font-mono text-xs text-gruvbox-gray">
            AI cost: ${totalCost.toFixed(5)}
          </span>
        )}
      </footer>
      {pendingAttempt && <ConfidenceModal onSubmit={handleConfidenceSubmit} />}
    </div>
  );
}

/**
 * Extract the main function name from the code (e.g., "twoSum" from "def twoSum(...):")
 */
function getFunctionName(code: string): string {
  const match = code.match(/def\s+(\w+)\s*\(/);
  return match ? match[1] : "solve";
}

/**
 * Parse LeetCode input format like "nums = [2,7,11,15], target = 9"
 * into separate assignment statements and argument names.
 */
function parseTestInput(input: string): { assignments: string; argNames: string[] } {
  // Split on ", " followed by a word (variable name start)
  const parts = input.split(/,\s*(?=[a-zA-Z_])/);
  const argNames: string[] = [];
  const assignments: string[] = [];

  for (const part of parts) {
    const match = part.match(/^(\w+)\s*=/);
    if (match) {
      argNames.push(match[1]);
      assignments.push(part.trim());
    }
  }

  // Fallback: if no variable assignments found, use input as-is (positional args)
  if (argNames.length === 0) {
    return { assignments: '', argNames: [input] };
  }

  return { assignments: assignments.join('\n'), argNames };
}

/**
 * Recursively sort arrays for order-insensitive comparison.
 * Handles nested arrays and mixed types.
 */
function sortForComparison(value: unknown): unknown {
  if (Array.isArray(value)) {
    // Sort array elements (recursively sort nested arrays first)
    const sorted = value.map(sortForComparison);
    // Sort by JSON string representation for consistent ordering
    return sorted.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  return value;
}

/**
 * Normalize output for comparison.
 * Handles order-insensitive array comparison (e.g., [0,1] == [1,0] for Two Sum).
 */
function normalizeOutput(output: string): string {
  const cleaned = output
    .trim()
    .replace(/\s+/g, "")
    .replace(/'/g, '"')
    .toLowerCase();

  // Try to parse as JSON and sort arrays for order-insensitive comparison
  try {
    const parsed = JSON.parse(cleaned);
    const sorted = sortForComparison(parsed);
    return JSON.stringify(sorted);
  } catch {
    // Not valid JSON, return cleaned string
    return cleaned;
  }
}
