"use client";

import { useState, useEffect } from "react";
import Workspace from "@/components/Workspace";
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
            className="rounded-lg bg-gruvbox-orange px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Load
          </button>
          <button
            onClick={handleLoadTwoSumTest}
            className="rounded-lg bg-gruvbox-orange px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            title="Load Two Sum with working solution for testing"
          >
            Test: Two Sum
          </button>
          {catalogError && <span className="text-sm text-gruvbox-red">{catalogError}</span>}
        </div>
        <HeaderAuth />
      </header>

      <Workspace slug={slug} initialCode={initialCode} />
    </div>
  );
}
