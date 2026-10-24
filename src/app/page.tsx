"use client";

import { useState, useEffect } from "react";
import CodeEditor from "@/components/CodeEditor";
import ConsoleOutput from "@/components/ConsoleOutput";
import ProblemPanel from "@/components/ProblemPanel";
import { runPython, terminateWorker, initializePyodide, retryInitialization } from "@/lib/pyodideRunner";
import SubmitResultView from "@/components/SubmitResultView";
import {
  fetchProblem,
  fetchProblems,
  fetchHintStream,
  fetchReview,
  pregenerateHints,
  submitCode,
  ExecutorUnavailableError,
} from "@/lib/api";
import type { Problem, ProblemListItem, TestCase, SubmitResult, ReviewResponse } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { saveSession } from "@/lib/userClient";
import type { SessionPayload } from "@/lib/userClient";
import { ConfidenceModal } from "@/components/ConfidenceModal";

export default function Home() {
  const [slugInput, setSlugInput] = useState("");
  const [catalog, setCatalog] = useState<ProblemListItem[]>([]);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [problemLoading, setProblemLoading] = useState(false);
  const [problemError, setProblemError] = useState<string | null>(null);

  const [code, setCode] = useState("# Write your solution here\n\n");
  const [consoleOutput, setConsoleOutput] = useState("");

  const [hints, setHints] = useState<string[]>([]);
  const [streamingHint, setStreamingHint] = useState("");
  const [hintLoading, setHintLoading] = useState(false);

  const [review, setReview] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<ReviewResponse | null>(null);
  const [submission, setSubmission] = useState<SubmitResult | "down" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [totalCost, setTotalCost] = useState(0);

  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [runningTests, setRunningTests] = useState(false);
  const [completedTests, setCompletedTests] = useState(0);
  const [pyodideStatus, setPyodideStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const { isSignedIn, getToken } = useAuth();
  const [showConfidence, setShowConfidence] = useState(false);
  const [sessionStart] = useState(() => new Date());

  useEffect(() => {
    fetchProblems().then(setCatalog).catch(() => setProblemError("Failed to load problem list"));
  }, []);

  useEffect(() => {
    initializePyodide((status) => {
      setPyodideStatus(status);
    });
    return () => terminateWorker();
  }, []);

  function handleRetryPyodide() {
    retryInitialization((status) => {
      setPyodideStatus(status);
    });
  }

  // Dev helper: Load Two Sum with working solution for quick testing
  async function handleLoadTwoSumTest() {
    setSlugInput("two-sum");
    setProblemLoading(true);
    setProblemError(null);
    setHints([]);
    setStreamingHint("");
    setReview(null);
    setTestCases([]);
    setConsoleOutput("");
    resetSubmit();

    const twoSumSolution = `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []
`;

    try {
      const p = await fetchProblem("two-sum");
      setProblem(p);
      setCode(twoSumSolution);

      const initialTestCases: TestCase[] = p.examples.map((ex, i) => ({
        id: `example-${i}`,
        input: ex.input || "",
        expected: ex.output || "",
        passed: null,
        status: 'pending',
        isCustom: false,
      }));
      setTestCases(initialTestCases);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setProblemError(message);
    } finally {
      setProblemLoading(false);
    }
  }

  function resetSubmit() {
    setSubmission(null);
    setSubmitError(null);
    setRevealed(false);
    setReviewData(null);
    setReview(null);
  }

  async function handleLoadProblem(slug = slugInput.trim()) {
    if (!slug) return;
    setProblemLoading(true);
    setProblemError(null);
    setHints([]);
    setStreamingHint("");
    setReview(null);
    setTestCases([]);
    setConsoleOutput("");
    resetSubmit();

    try {
      const p = await fetchProblem(slug);
      setProblem(p);
      const starterCode = p.starter_code ? p.starter_code + "\n" : code;
      setCode(starterCode);

      // Convert examples to test cases
      const initialTestCases: TestCase[] = p.examples.map((ex, i) => ({
        id: `example-${i}`,
        input: ex.input || "",
        expected: ex.output || "",
        passed: null,
        status: 'pending',
        isCustom: false,
      }));
      setTestCases(initialTestCases);

      // Pre-generate hints in the background (fire and forget)
      pregenerateHints(p.summary, p.description, starterCode);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setProblemError(message);
    } finally {
      setProblemLoading(false);
    }
  }

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

  async function handleSubmit() {
    if (!problem) return;
    setSubmitting(true);
    resetSubmit();
    try {
      const res = await submitCode(problem.slug, code);
      setSubmission(res);
      // Only the executor's verdict counts as solved
      if (!res.error && res.failed === 0 && res.passed === res.total) setShowConfidence(true);
    } catch (e: unknown) {
      if (e instanceof ExecutorUnavailableError) setSubmission("down");
      else setSubmitError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  // The model only sees the failing case once the learner has revealed it
  function revealedFailingCase() {
    if (!revealed || !submission || submission === "down") return undefined;
    const c = submission.results.find((r) => !r.passed && r.status !== "skipped");
    return c && { input: c.input, expected: c.expected, actual: c.actual, category: c.category };
  }

  async function handleGetHint(failingCase?: ReturnType<typeof revealedFailingCase>) {
    if (!problem) return;
    const level = hints.length + 1;
    setHintLoading(true);
    setStreamingHint("");

    try {
      let fullHint = "";
      await fetchHintStream(
        problem.summary,
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
        problem.leetcode_hints || [],
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
    if (!problem || !submission || submission === "down") return;
    setReviewLoading(true);

    try {
      const res = await fetchReview(problem.slug, problem.summary, code, submission);
      setReview(res.feedback);
      setReviewData(res);
      if (res.cost_usd) setTotalCost((prev) => prev + res.cost_usd!);
    } catch {
      setReview("Failed to get review. Please try again.");
    } finally {
      setReviewLoading(false);
    }
  }

  const handleConfidenceSubmit = async (rating: number) => {
    setShowConfidence(false);
    if (!isSignedIn || !problem) return;
    const token = await getToken();
    if (!token) return;
    const payload: SessionPayload = {
      slug: problem.slug,
      topic_tags: [],
      mode: "free",
      started_at: sessionStart.toISOString(),
      completed_at: new Date().toISOString(),
      time_taken_seconds: Math.floor((Date.now() - sessionStart.getTime()) / 1000),
      hints_used: hints.length,
      hint_level_reached: hints.length,
      attempts: 1,
      passed_core_tests: true, // the modal only opens on an Accepted Submit
      confidence: rating,
      solution_time_complexity: reviewData?.time_complexity,
      solution_space_complexity: reviewData?.space_complexity,
      is_optimal: reviewData?.is_optimal,
      ...(submission && submission !== "down" && {
        hidden_tests_passed: submission.passed,
        hidden_tests_failed: submission.failed,
        hidden_tests_total: submission.total,
        runtime_ms: submission.runtime_ms,
      }),
    };
    saveSession(token, payload).catch(console.error); // non-blocking — don't interrupt the user flow
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-gruvbox-gray-light px-6 py-3">
        <h1 className="font-mono text-xl font-bold text-gruvbox-orange">
          Algo Trainer
        </h1>
        <div className="flex items-center gap-2">
          <input
            type="text"
            list="problem-catalog"
            value={slugInput}
            onChange={(e) => {
              setSlugInput(e.target.value);
              // Picking a datalist option sets the value to an exact slug
              if (catalog.some((c) => c.slug === e.target.value)) handleLoadProblem(e.target.value);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleLoadProblem()}
            placeholder={`Search ${catalog.length} problems`}
            aria-label="Search problems"
            className="w-72 rounded-lg border border-gruvbox-gray bg-white px-3 py-1.5 font-mono text-sm text-gruvbox-fg placeholder-gruvbox-gray focus:border-gruvbox-orange focus:outline-none"
          />
          <datalist id="problem-catalog">
            {catalog.map((c) => (
              <option key={c.slug} value={c.slug}>{`${c.title} · ${c.difficulty}`}</option>
            ))}
          </datalist>
          <button
            onClick={() => handleLoadProblem()}
            disabled={problemLoading}
            className="rounded-lg bg-gruvbox-orange px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {problemLoading ? "Loading..." : "Load"}
          </button>
          <button
            onClick={handleLoadTwoSumTest}
            disabled={problemLoading}
            className="rounded-lg bg-gruvbox-orange px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            title="Load Two Sum with working solution for testing"
          >
            Test: Two Sum
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — Problem description */}
        <div className="w-1/2 overflow-y-auto border-r border-gruvbox-gray-light">
          <ProblemPanel
            problem={problem}
            hints={hints}
            streamingHint={streamingHint}
            review={review}
            isLoading={problemLoading}
            error={problemError}
          />
          {(submission || submitError) && (
            <div className="px-6 pb-6">
              {submitError ? (
                <div className="rounded bg-gruvbox-red/15 px-3 py-2 text-sm text-gruvbox-red">{submitError}</div>
              ) : submission && (
                <SubmitResultView
                  result={submission}
                  revealed={revealed}
                  onReveal={() => setRevealed(true)}
                  onHint={() => handleGetHint(revealedFailingCase())}
                  onReview={handleReview}
                  hintDisabled={hintLoading || hints.length >= 8}
                  reviewLoading={reviewLoading}
                />
              )}
            </div>
          )}
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
        {pyodideStatus === 'error' ? (
          <button
            onClick={handleRetryPyodide}
            className="rounded-lg bg-gruvbox-red px-4 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Python Failed — Retry
          </button>
        ) : (
          <button
            onClick={handleRunTests}
            disabled={runningTests || testCases.length === 0 || pyodideStatus !== 'ready'}
            className="rounded-lg bg-gruvbox-green px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
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
          className="rounded-lg bg-gruvbox-yellow px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {hintLoading
            ? "Thinking..."
            : hints.length >= 8
            ? "Max Hints Reached"
            : `Get Hint${problem ? ` (Level ${hints.length + 1})` : ""}`}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!problem || submitting}
          className="rounded-lg bg-gruvbox-aqua px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
        {totalCost > 0 && (
          <span className="ml-auto font-mono text-xs text-gruvbox-gray">
            AI cost: ${totalCost.toFixed(5)}
          </span>
        )}
      </footer>
      {showConfidence && <ConfidenceModal onSubmit={handleConfidenceSubmit} />}
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
