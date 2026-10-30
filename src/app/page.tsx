"use client";

import { useState, useEffect } from "react";
import Workspace from "@/components/Workspace";
import ProblemList from "@/components/ProblemList";
import { HeaderAuth } from "@/components/AuthProvider";
import { fetchProblems } from "@/lib/api";
import type { ProblemListItem } from "@/lib/api";

const TWO_SUM_SOLUTION = `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []
`;

export default function Home() {
  const [slugInput, setSlugInput] = useState("");
  const [catalog, setCatalog] = useState<ProblemListItem[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [initialCode, setInitialCode] = useState<string | undefined>();

  useEffect(() => {
    fetchProblems().then(setCatalog).catch(() => setCatalogError("Failed to load problem list"));
  }, []);

  function handleLoadProblem(next = slugInput.trim()) {
    if (!next) return;
    setInitialCode(undefined);
    setSlug(next);
  }

  // Dev helper: Load Two Sum with working solution for quick testing
  function handleLoadTwoSumTest() {
    setSlugInput("two-sum");
    setInitialCode(TWO_SUM_SOLUTION);
    setSlug("two-sum");
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-neutral-800 bg-black px-6 py-3 text-neutral-200">
        <h1 className="text-xl font-bold tracking-tight text-white">
          <button onClick={() => setSlug(null)} title="Back to problem list">Algo Trainer</button>
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
            className="w-72 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
          />
          <datalist id="problem-catalog">
            {catalog.map((c) => (
              <option key={c.slug} value={c.slug}>{`${c.title} · ${c.difficulty}`}</option>
            ))}
          </datalist>
          <button
            onClick={() => handleLoadProblem()}
            className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
          >
            Load
          </button>
          <button
            onClick={handleLoadTwoSumTest}
            className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
            title="Load Two Sum with working solution for testing"
          >
            Test: Two Sum
          </button>
          {catalogError && <span className="text-sm text-rose-400">{catalogError}</span>}
        </div>
        <HeaderAuth />
      </header>

      {slug ? (
        <Workspace slug={slug} initialCode={initialCode} />
      ) : (
        <ProblemList catalog={catalog} onPick={handleLoadProblem} />
      )}
    </div>
  );
}
