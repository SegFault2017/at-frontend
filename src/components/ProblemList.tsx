"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ProblemListItem } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { getAttempts } from "@/lib/userClient";
import type { Attempt } from "@/lib/userClient";
import ActivityCalendar, { dayKey } from "@/components/ActivityCalendar";

const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "text-emerald-400 border-emerald-400/40",
  medium: "text-amber-400 border-amber-400/40",
  hard: "text-rose-400 border-rose-400/40",
};
const DIFFICULTY_RANK: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

const SORTS = ["id", "title", "difficulty"] as const;
type Sort = (typeof SORTS)[number];

const control =
  "rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none";
const card = "rounded-xl border border-neutral-800 bg-neutral-950";
const pill = (on: boolean) =>
  `rounded-full border px-3 py-1 text-xs ${
    on ? "border-white bg-white text-black" : "border-neutral-800 text-neutral-300 hover:border-neutral-600"
  }`;

/** The catalog as a filterable table, numbered in catalog order, with the learner's progress beside it. Picking a row loads that problem. */
export default function ProblemList({
  catalog,
  onPick,
}: {
  catalog: ProblemListItem[];
  onPick: (slug: string) => void;
}) {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [attemptsError, setAttemptsError] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [unsolvedOnly, setUnsolvedOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("id");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    getToken()
      .then((token) => {
        if (!token) throw new Error("No auth token");
        return getAttempts(token);
      })
      .then(setAttempts)
      .catch(() => setAttemptsError(true));
    // getToken is a Clerk utility, not a reactive value, so it stays out of the deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  const { solved, attempted, solvedByDay, continueSlug } = useMemo(() => {
    const solved = new Set(attempts.filter((a) => a.verdict === "accepted").map((a) => a.slug));
    const attempted = new Set(attempts.map((a) => a.slug));
    // Count distinct problems accepted on each local day
    const perDay = new Map<string, Set<string>>();
    for (const a of attempts) {
      if (a.verdict !== "accepted") continue;
      const key = dayKey(new Date(a.submitted_at));
      perDay.set(key, (perDay.get(key) ?? new Set()).add(a.slug));
    }
    const solvedByDay = new Map([...perDay].map(([k, v]) => [k, v.size]));
    const inCatalog = new Set(catalog.map((p) => p.slug));
    // Attempts come newest first, so this is the latest problem left unsolved
    const continueSlug = attempts.find((a) => !solved.has(a.slug) && inCatalog.has(a.slug))?.slug;
    return { solved, attempted, solvedByDay, continueSlug };
  }, [attempts, catalog]);

  const categories = useMemo(
    () => [...new Set(catalog.flatMap((p) => p.topic_tags))].sort(),
    [catalog]
  );

  // Same problem for everyone on a given day; the prime spreads consecutive days across the catalog
  const daily = useMemo(() => {
    if (!catalog.length) return undefined;
    const now = new Date();
    const day = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000;
    return catalog[(day * 7919) % catalog.length];
  }, [catalog]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = catalog
      .map((p, i) => ({ ...p, id: i + 1 }))
      .filter(
        (p) =>
          (!q || p.title.toLowerCase().includes(q) || p.slug.includes(q)) &&
          (!category || p.topic_tags.includes(category)) &&
          (!difficulty || p.difficulty.toLowerCase() === difficulty.toLowerCase()) &&
          (!unsolvedOnly || !solved.has(p.slug))
      );
    if (sort === "title") filtered.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "difficulty")
      filtered.sort(
        (a, b) => (DIFFICULTY_RANK[a.difficulty.toLowerCase()] ?? 3) - (DIFFICULTY_RANK[b.difficulty.toLowerCase()] ?? 3)
      );
    return filtered;
  }, [catalog, query, category, difficulty, unsolvedOnly, solved, sort]);

  const pickFrom = (list: { slug: string }[]) => {
    if (list.length) onPick(list[Math.floor(Math.random() * list.length)].slug);
  };

  const solvedCount = catalog.filter((p) => solved.has(p.slug)).length;
  const percent = catalog.length ? (100 * solvedCount) / catalog.length : 0;

  const features: { title: string; body: string; cta: string; href?: string; onClick?: () => void }[] = [
    { title: "Problem Sets", body: "The tutor picks problems that drill your weakest topics.", cta: "Start a set", href: "/problemset" },
    { title: "Mastery", body: "Clean-solve rate, time and hints for every topic.", cta: "View mastery", href: "/profile" },
    {
      title: "Random",
      body: "Any problem you have not solved yet.",
      cta: "Pick one",
      onClick: () => pickFrom(catalog.filter((p) => !solved.has(p.slug))),
    },
    {
      title: "Continue",
      body: continueSlug
        ? `Back to ${catalog.find((p) => p.slug === continueSlug)?.title}.`
        : "Reopen the last problem you attempted and have not solved.",
      cta: continueSlug ? "Resume" : "Start with #1",
      onClick: () => {
        const target = continueSlug ?? catalog[0]?.slug;
        if (target) onPick(target);
      },
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-950 text-neutral-100">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_20rem]">
        <main className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Problems</h1>
              <p className="mt-1 text-sm text-neutral-400">
                <span className="font-semibold text-white">{solvedCount}</span> of {catalog.length} solved ·{" "}
                {percent.toFixed(2)}% complete
              </p>
            </div>
            {daily && (
              <div className="flex items-center gap-3">
                <span aria-hidden className="border border-neutral-800 bg-neutral-900 px-2 py-1">🔥</span>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Daily challenge</div>
                  <div className="font-semibold">{daily.title}</div>
                </div>
                <button
                  onClick={() => onPick(daily.slug)}
                  className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-neutral-200"
                >
                  Solve →
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {features.map((f) => {
              const inner = (
                <>
                  <div className="font-mono font-bold">{f.title}</div>
                  <p className="mt-2 line-clamp-2 text-sm text-neutral-400">{f.body}</p>
                  <div className="mt-4 font-mono text-xs text-neutral-300">{f.cta} →</div>
                </>
              );
              const cls = `${card} block p-4 text-left hover:border-neutral-600`;
              return f.href ? (
                <Link key={f.title} href={f.href} className={cls}>{inner}</Link>
              ) : (
                <button key={f.title} onClick={f.onClick} className={cls}>{inner}</button>
              );
            })}
          </div>

          <div className={`${card} mt-6 p-3`}>
            <div className="flex flex-wrap gap-2">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search problems..."
                aria-label="Search problems"
                className={`${control} min-w-48 flex-1 placeholder-neutral-500`}
              />
              <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className={control}>
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select value={sort} onChange={(e) => setSort(SORTS.find((s) => s === e.target.value) ?? "id")} aria-label="Sort" className={control}>
                <option value="id">Sort by ID</option>
                <option value="title">Sort by Title</option>
                <option value="difficulty">Sort by Difficulty</option>
              </select>
              <button
                onClick={() => pickFrom(rows)}
                className="rounded-lg border border-neutral-800 px-3 py-2 text-sm font-medium hover:border-neutral-600"
              >
                ⤨ Random
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setDifficulty("");
                  setUnsolvedOnly(false);
                }}
                aria-pressed={!difficulty && !unsolvedOnly}
                className={pill(!difficulty && !unsolvedOnly)}
              >
                All
              </button>
              <button onClick={() => setUnsolvedOnly((u) => !u)} aria-pressed={unsolvedOnly} className={pill(unsolvedOnly)}>
                Unsolved
              </button>
              <span aria-hidden className="mx-1 h-5 w-px bg-neutral-800" />
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty((cur) => (cur === d ? "" : d))}
                  aria-pressed={difficulty === d}
                  className={pill(difficulty === d)}
                >
                  <span className={DIFFICULTY_COLOR[d.toLowerCase()].split(" ")[0]}>● </span>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className={`${card} mt-6 overflow-x-auto`}>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-neutral-400">
                <tr className="border-b border-neutral-800">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Difficulty</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr
                    key={p.slug}
                    onClick={() => onPick(p.slug)}
                    className="cursor-pointer border-b border-neutral-900 last:border-0 hover:bg-neutral-900"
                  >
                    <td className="px-4 py-3 text-neutral-400">{p.id}</td>
                    <td className="px-4 py-3 font-medium">
                      {/* A real link so rows are reachable by keyboard */}
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onPick(p.slug);
                        }}
                        className="hover:underline focus:underline focus:outline-none"
                      >
                        {p.title}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      {p.difficulty && (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs lowercase ${
                            DIFFICULTY_COLOR[p.difficulty.toLowerCase()] ?? "border-neutral-700"
                          }`}
                        >
                          ● {p.difficulty}
                        </span>
                      )}
                    </td>
                    <td className="max-w-48 truncate px-4 py-3 text-neutral-300">{p.topic_tags[0] ?? ""}</td>
                    <td className="px-4 py-3 text-xs">
                      {solved.has(p.slug) ? (
                        <span className="text-emerald-400">✓ Solved</span>
                      ) : attempted.has(p.slug) ? (
                        <span className="text-amber-400">Attempted</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">No problems match.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>

        <aside className="space-y-4">
          {isSignedIn ? (
            <>
              <section className={`${card} p-4`}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Your progress</h2>
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-bold">{solvedCount}</span>
                    <span className="text-sm text-neutral-400"> / {catalog.length}</span>
                  </div>
                  <span className="text-sm text-emerald-400">{percent.toFixed(2)}%</span>
                </div>
                <div className="mt-3 h-1.5 bg-neutral-800">
                  <div className="h-full bg-emerald-400" style={{ width: `${percent}%` }} />
                </div>
                {attemptsError && <p className="mt-2 text-xs text-rose-400">Couldn&apos;t load your attempts.</p>}
              </section>
              <section className={`${card} p-4`}>
                <ActivityCalendar solvedByDay={solvedByDay} />
              </section>
            </>
          ) : (
            <section className={`${card} p-4 text-sm text-neutral-400`}>
              <h2 className="text-xs font-semibold uppercase tracking-wider">Your progress</h2>
              <p className="mt-2">Sign in to track solved problems and daily activity.</p>
              <Link
                href="/login"
                className="mt-3 block rounded-lg bg-white px-3 py-2 text-center font-medium text-black hover:bg-neutral-200"
              >
                Sign in
              </Link>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
