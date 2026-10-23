"use client";
// PROTOTYPE (throwaway): "What does Submit show the learner?" Wayfinder ticket.
// Three structurally different result views for POST /execute output, on stub data.
// ?variant=A|B|C   ?scenario=fail|pass|crash|timeout|down   (arrows cycle variants)
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Case = { input: string; expected: string; actual: string; passed: boolean; runtime_ms: number; category?: "normal" | "edge" | "stress" };
type Result = { passed: number; failed: number; total: number; runtime_ms: number; results: Case[]; error: string | null };

const mk = (i: number, category: Case["category"], passed: boolean, over?: Partial<Case>): Case => ({
  input: `nums = [${i}, ${i + 1}, ${i + 2}], k = ${i}`,
  expected: "true",
  actual: passed ? "true" : "false",
  passed,
  runtime_ms: 1 + i,
  category,
  ...over,
});
const cases: Case[] = [
  ...Array.from({ length: 8 }, (_, i) => mk(i, "normal", true)),
  mk(8, "edge", true),
  mk(9, "edge", false, { input: "nums = [1, 2, 2, 3, 3, 4], k = 2", expected: "true", actual: "false" }),
  mk(10, "edge", true),
  mk(11, "stress", false, { input: "nums = [1, 10, 2, 10, 3, 10, ...] (100 elements), k = 2", runtime_ms: 412 }),
  ...Array.from({ length: 4 }, (_, i) => mk(12 + i, "stress", true)),
];
const fail: Result = { passed: 15, failed: 2, total: 17, runtime_ms: 520, results: cases, error: null };
const SCENARIOS: Record<string, Result | "down"> = {
  fail,
  pass: { ...fail, passed: 17, failed: 0, results: cases.map((c) => ({ ...c, passed: true, actual: c.expected })) },
  crash: { passed: 0, failed: 0, total: 0, runtime_ms: 3, results: [], error: "NameError: name 'nums2' is not defined (line 7)" },
  timeout: { passed: 11, failed: 0, total: 17, runtime_ms: 5000, results: cases.slice(0, 11).map((c) => ({ ...c, passed: true, actual: c.expected })), error: "Time limit exceeded (5s) on case 12" },
  down: "down",
};

const Mono = ({ children }: { children: React.ReactNode }) => (
  <code className="block whitespace-pre-wrap break-all rounded bg-gruvbox-bg-dark px-2 py-1 font-mono text-xs text-gruvbox-fg-light">{children}</code>
);

function Banner({ r }: { r: Result }) {
  const ok = !r.error && r.failed === 0 && r.passed === r.total;
  return (
    <div className={`rounded px-3 py-2 text-sm font-semibold ${ok ? "bg-gruvbox-green/20 text-gruvbox-green" : "bg-gruvbox-red/15 text-gruvbox-red"}`}>
      {r.error ? "Error" : ok ? "Accepted" : "Wrong Answer"} · {r.passed}/{r.total} passed · {r.runtime_ms} ms
    </div>
  );
}

// A: LeetCode style. Verdict + only the first failing case, shown in full.
function VariantA({ r }: { r: Result }) {
  const first = r.results.find((c) => !c.passed);
  return (
    <div className="space-y-3">
      <Banner r={r} />
      {r.error && <Mono>{r.error}</Mono>}
      {first && (
        <div className="space-y-1.5 text-xs">
          <div className="text-gruvbox-gray">Input</div><Mono>{first.input}</Mono>
          <div className="text-gruvbox-gray">Expected</div><Mono>{first.expected}</Mono>
          <div className="text-gruvbox-gray">Your output</div><Mono>{first.actual}</Mono>
        </div>
      )}
    </div>
  );
}

// B: case grid. Every case is a chip; click expands a case. Full inputs for failures only.
function VariantB({ r }: { r: Result }) {
  const params = useSearchParams();
  const sel = Number(params.get("case") ?? r.results.findIndex((c) => !c.passed));
  const router = useRouter();
  const c = r.results[sel];
  return (
    <div className="space-y-3">
      <Banner r={r} />
      {r.error && <Mono>{r.error}</Mono>}
      <div className="flex flex-wrap gap-1.5">
        {r.results.map((x, i) => (
          <button key={i} onClick={() => router.replace(`?${new URLSearchParams({ variant: "B", scenario: params.get("scenario") ?? "fail", case: String(i) })}`)}
            className={`h-7 w-9 rounded text-[11px] font-mono ${x.passed ? "bg-gruvbox-green/25 text-gruvbox-green" : "bg-gruvbox-red/25 text-gruvbox-red"} ${i === sel ? "ring-2 ring-gruvbox-orange" : ""}`}>
            {i + 1}
          </button>
        ))}
      </div>
      {c && (c.passed ? <div className="text-xs text-gruvbox-gray">Case {sel + 1} passed in {c.runtime_ms} ms. Hidden Test inputs stay hidden when they pass.</div> : (
        <div className="space-y-1.5 text-xs">
          <div className="text-gruvbox-gray">Case {sel + 1} · {c.runtime_ms} ms</div>
          <Mono>{c.input}</Mono><Mono>expected {c.expected} · got {c.actual}</Mono>
        </div>
      ))}
    </div>
  );
}

// C: coaching view. Per-category breakdown + one failing case, and a hand-off to Hints/Review.
function VariantC({ r }: { r: Result }) {
  const cats = ["normal", "edge", "stress"] as const;
  const first = r.results.find((c) => !c.passed);
  return (
    <div className="space-y-3">
      <Banner r={r} />
      {r.error && <Mono>{r.error}</Mono>}
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
      {first && (
        <div className="rounded border border-gruvbox-gray p-2 text-xs">
          <div className="mb-1 text-gruvbox-gray">Fails on an <b>{first.category}</b> case (input hidden until you ask)</div>
          <div className="flex gap-2">
            <button className="rounded bg-gruvbox-orange px-2 py-1 text-gruvbox-bg">Reveal input</button>
            <button className="rounded bg-gruvbox-yellow px-2 py-1 text-gruvbox-bg">Hint on this failure</button>
            <button className="rounded bg-gruvbox-aqua px-2 py-1 text-gruvbox-bg">Review my code</button>
          </div>
        </div>
      )}
      <div className="text-[10px] text-gruvbox-gray">Needs executor change: /execute does not return Case Category today.</div>
    </div>
  );
}

const VARIANTS: Record<string, [string, (p: { r: Result }) => React.ReactElement]> = {
  A: ["LeetCode: first failure only", VariantA], B: ["Case grid", VariantB], C: ["Coaching + categories", VariantC],
};

function Page() {
  const p = useSearchParams();
  const router = useRouter();
  const variant = p.get("variant") ?? "A";
  const scenario = p.get("scenario") ?? "fail";
  const keys = Object.keys(VARIANTS);
  const go = (v: string, s = scenario) => router.replace(`?variant=${v}&scenario=${s}`);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (/INPUT|TEXTAREA/.test((e.target as HTMLElement).tagName)) return;
      const i = keys.indexOf(variant);
      if (e.key === "ArrowRight") go(keys[(i + 1) % keys.length]);
      if (e.key === "ArrowLeft") go(keys[(i + keys.length - 1) % keys.length]);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });
  const data = SCENARIOS[scenario] ?? fail;
  const V = VARIANTS[variant]?.[1] ?? VariantA;
  return (
    <main className="mx-auto max-w-xl space-y-4 p-6 pb-24">
      <h1 className="text-sm font-bold text-gruvbox-orange">PROTOTYPE: Submit result (stub data)</h1>
      <div className="flex flex-wrap gap-1.5 text-xs">
        {Object.keys(SCENARIOS).map((s) => (
          <button key={s} onClick={() => go(variant, s)} className={`rounded px-2 py-0.5 ${s === scenario ? "bg-gruvbox-orange text-gruvbox-bg" : "bg-gruvbox-gray-light"}`}>{s}</button>
        ))}
      </div>
      {data === "down" ? (
        <div className="rounded bg-gruvbox-yellow/20 px-3 py-2 text-sm text-gruvbox-yellow">Executor unavailable (502). Nothing was run. Try again.</div>
      ) : <V r={data} />}
      <div className="fixed bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-gruvbox-bg-dark px-4 py-2 text-xs text-gruvbox-fg-light shadow-lg">
        <button onClick={() => go(keys[(keys.indexOf(variant) + keys.length - 1) % keys.length])}>←</button>
        <span>{variant} ({VARIANTS[variant]?.[0]})</span>
        <button onClick={() => go(keys[(keys.indexOf(variant) + 1) % keys.length])}>→</button>
      </div>
    </main>
  );
}

export default function Prototype() {
  return <Suspense><Page /></Suspense>;
}
