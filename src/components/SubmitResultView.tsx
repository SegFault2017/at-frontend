"use client";

import type { SubmitResult } from "@/lib/api";

// Coaching view for a Submit (variant C of the prototype on branch prototype/submit-result).
interface SubmitResultViewProps {
  result: SubmitResult;
  revealed: boolean;
  onReveal: () => void;
  onHint: () => void;
  onReview: () => void;
  hintDisabled: boolean;
  reviewLoading: boolean;
}

const Mono = ({ children }: { children: React.ReactNode }) => (
  <code className="block whitespace-pre-wrap break-all rounded bg-gruvbox-bg-dark px-2 py-1 font-mono text-xs text-gruvbox-fg-light">{children}</code>
);

const VERDICT = { accepted: "Accepted", wrong_answer: "Wrong Answer", error: "Error" };

export default function SubmitResultView({ result: r, revealed, onReveal, onHint, onReview, hintDisabled, reviewLoading }: SubmitResultViewProps) {
  const first = r.first_failure === null ? undefined : r.results[r.first_failure];
  // A per-case crash or timeout is the learner's error too; its actual holds the message, not test data
  const error = r.verdict === "error" ? r.error ?? first?.actual : null;
  const ok = r.verdict === "accepted";
  const cats = ["normal", "edge", "stress"] as const;
  return (
    <div className="space-y-3">
      <div className={`rounded px-3 py-2 text-sm font-semibold ${ok ? "bg-gruvbox-green/20 text-gruvbox-green" : "bg-gruvbox-red/15 text-gruvbox-red"}`}>
        {VERDICT[r.verdict]} · {r.passed}/{r.total} passed · {Math.round(r.runtime_ms)} ms
      </div>
      {error && <Mono>{error}</Mono>}
      <div className="space-y-1.5">
        {cats.map((k) => {
          const g = r.results.filter((c) => c.category === k);
          const p = g.filter((c) => c.passed).length;
          return (
            <div key={k} className="flex items-center gap-2 text-xs">
              <span className="w-14 text-gruvbox-gray">{k}</span>
              <div className="h-2 flex-1 rounded bg-gruvbox-gray-light"><div className="h-2 rounded bg-gruvbox-green" style={{ width: `${g.length ? (100 * p) / g.length : 0}%` }} /></div>
              <span className="w-10 text-right font-mono">{p}/{g.length}</span>
            </div>
          );
        })}
      </div>
      <div className="rounded border border-gruvbox-gray p-2 text-xs">
        {first && (
          revealed ? (
            <div className="mb-2 space-y-1.5">
              <div className="text-gruvbox-gray">Fails on a <b>{first.category ?? "hidden"}</b> case</div>
              <div className="text-gruvbox-gray">Input</div><Mono>{first.input}</Mono>
              <div className="text-gruvbox-gray">Expected</div><Mono>{first.expected}</Mono>
              <div className="text-gruvbox-gray">Your output</div><Mono>{first.actual}</Mono>
            </div>
          ) : (
            <div className="mb-1 text-gruvbox-gray">Fails on a <b>{first.category ?? "hidden"}</b> case (input hidden until you ask)</div>
          )
        )}
        <div className="flex gap-2">
          {first && !revealed && <button onClick={onReveal} className="rounded bg-gruvbox-orange px-2 py-1 text-gruvbox-bg">Reveal input</button>}
          {first && <button onClick={onHint} disabled={hintDisabled} className="rounded bg-gruvbox-yellow px-2 py-1 text-gruvbox-bg disabled:opacity-50">Hint on this failure</button>}
          <button onClick={onReview} disabled={reviewLoading} className="rounded bg-gruvbox-aqua px-2 py-1 text-gruvbox-bg disabled:opacity-50">{reviewLoading ? "Reviewing..." : "Review my code"}</button>
        </div>
      </div>
    </div>
  );
}
