"use client";

import { useMemo, useState } from "react";
import type { ProblemListItem } from "@/lib/api";

const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "text-emerald-400 border-emerald-400/40",
  medium: "text-amber-400 border-amber-400/40",
  hard: "text-rose-400 border-rose-400/40",
};
const DIFFICULTY_RANK: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

type Sort = "id" | "title" | "difficulty";

const control =
  "rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none";

/** The catalog as a filterable table, numbered in catalog order. Picking a row loads that problem. */
export default function ProblemList({
  catalog,
  onPick,
}: {
  catalog: ProblemListItem[];
  onPick: (slug: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [sort, setSort] = useState<Sort>("id");

  const categories = useMemo(
    () => [...new Set(catalog.flatMap((p) => p.topic_tags))].sort(),
    [catalog]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = catalog
      .map((p, i) => ({ ...p, id: i + 1 }))
      .filter(
        (p) =>
          (!q || p.title.toLowerCase().includes(q) || p.slug.includes(q)) &&
          (!category || p.topic_tags.includes(category)) &&
          (!difficulty || p.difficulty.toLowerCase() === difficulty.toLowerCase())
      );
    if (sort === "title") filtered.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "difficulty")
      filtered.sort(
        (a, b) => (DIFFICULTY_RANK[a.difficulty.toLowerCase()] ?? 3) - (DIFFICULTY_RANK[b.difficulty.toLowerCase()] ?? 3)
      );
    return filtered;
  }, [catalog, query, category, difficulty, sort]);

  function pickRandom() {
    if (rows.length) onPick(rows[Math.floor(Math.random() * rows.length)].slug);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight">Problems</h1>
        <p className="mt-1 text-sm text-neutral-400">{catalog.length} problems</p>

        <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-950 p-3">
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
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort" className={control}>
              <option value="id">Sort by ID</option>
              <option value="title">Sort by Title</option>
              <option value="difficulty">Sort by Difficulty</option>
            </select>
            <button onClick={pickRandom} className={"rounded-lg bg-white px-3 py-2 text-sm font-medium text-black hover:bg-neutral-200"}>
              ⤨ Random
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            {["", ...DIFFICULTIES].map((d) => (
              <button
                key={d || "all"}
                onClick={() => setDifficulty(d)}
                aria-pressed={difficulty === d}
                className={`rounded-full border px-3 py-1 text-xs ${
                  difficulty === d
                    ? "border-white bg-white text-black"
                    : "border-neutral-800 text-neutral-300 hover:border-neutral-600"
                }`}
              >
                {d ? <span className={DIFFICULTY_COLOR[d.toLowerCase()]?.split(" ")[0]}>● </span> : null}
                {d || "All"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-neutral-400">
              <tr className="border-b border-neutral-800">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Difficulty</th>
                <th className="px-4 py-3 font-medium">Category</th>
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
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-neutral-500">No problems match.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
