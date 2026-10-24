import { useState } from "react";
import { submitCode, ExecutorUnavailableError } from "@/lib/api";
import type { FailingCase, ReviewResponse, SubmitResult } from "@/lib/api";

export type SubmitState =
  | { kind: "idle" }
  | { kind: "down" }
  | { kind: "failed"; message: string }
  | { kind: "done"; result: SubmitResult; revealed: boolean; review: ReviewResponse | null };

const IDLE: SubmitState = { kind: "idle" };

export function useSubmit() {
  const [state, setState] = useState<SubmitState>(IDLE);
  const [submitting, setSubmitting] = useState(false);

  async function submit(slug: string, code: string): Promise<SubmitResult | null> {
    setSubmitting(true);
    setState(IDLE);
    try {
      const result = await submitCode(slug, code);
      setState({ kind: "done", result, revealed: false, review: null });
      return result;
    } catch (e: unknown) {
      setState(e instanceof ExecutorUnavailableError ? { kind: "down" } : { kind: "failed", message: e instanceof Error ? e.message : "Submit failed" });
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  const reveal = () => setState((s) => (s.kind === "done" ? { ...s, revealed: true } : s));
  const setReview = (review: ReviewResponse) => setState((s) => (s.kind === "done" ? { ...s, review } : s));

  // The model only sees the failing case once the learner has revealed it
  let failingCase: FailingCase | undefined;
  if (state.kind === "done" && state.revealed && state.result.first_failure !== null) {
    const { input, expected, actual, category } = state.result.results[state.result.first_failure];
    failingCase = { input, expected, actual, category };
  }

  return { state, submitting, submit, reveal, setReview, reset: () => setState(IDLE), failingCase };
}
