"use client";
import { useState } from "react";
import { HeaderAuth, useAuth } from "@/components/AuthProvider";
import { generateProblemSet } from "@/lib/api";
import type { ProblemSetMode } from "@/lib/api";
import { getMastery, saveProblemSet } from "@/lib/userClient";
import type { ProblemSet } from "@/lib/userClient";
import Workspace from "@/components/Workspace";

export default function ProblemSetPage() {
  const { isSignedIn, getToken } = useAuth();
  const [mode, setMode] = useState<ProblemSetMode>("drill");
  const [problemSet, setProblemSet] = useState<ProblemSet | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setGenerateError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No auth token");
      // The tutor picks the problems; at-auth saves the set under the signed-in learner
      const generated = await generateProblemSet(mode, await getMastery(token));
      if (generated.problems.length === 0) {
        throw new Error("No problems matched your weakest topics. Try Interview Simulation.");
      }
      setProblemSet(await saveProblemSet(token, generated.mode, generated.problems));
      setCurrentIndex(0);
    } catch (e: unknown) {
      setGenerateError(e instanceof Error ? e.message : "Failed to generate problem set");
    } finally {
      setLoading(false);
    }
  }

  if (!isSignedIn) {
    return <div className="p-8 text-gruvbox-fg">Please log in to use problem sets.</div>;
  }

  if (problemSet && currentIndex >= problemSet.problems.length) {
    return (
      <div className="p-8 text-gruvbox-fg">
        <h1 className="text-2xl font-bold mb-4">Problem set complete!</h1>
        <button
          onClick={() => setProblemSet(null)}
          className="px-4 py-2 bg-gruvbox-orange text-gruvbox-bg rounded"
        >
          Generate another
        </button>
      </div>
    );
  }

  if (!problemSet) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6 text-gruvbox-fg">AI Problem Set</h1>
        <div className="flex gap-4 mb-6">
          {(["drill", "interview_sim"] as ProblemSetMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded ${mode === m ? "bg-gruvbox-orange text-gruvbox-bg" : "bg-gruvbox-gray-light text-gruvbox-fg"}`}
            >
              {m === "drill" ? "Drill Weaknesses" : "Interview Simulation"}
            </button>
          ))}
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-6 py-3 bg-gruvbox-green text-gruvbox-bg rounded font-semibold disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Problem Set"}
        </button>
        {generateError && (
          <p className="mt-3 text-sm text-gruvbox-red">{generateError}</p>
        )}
      </div>
    );
  }

  const current = problemSet.problems[currentIndex];
  const isLast = currentIndex + 1 === problemSet.problems.length;
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-4 border-b border-gruvbox-gray-light px-6 py-3">
        <span className="text-gruvbox-gray">
          Problem {currentIndex + 1} of {problemSet.problems.length}
        </span>
        <span className="font-medium text-gruvbox-fg">{current.title} · {current.difficulty}</span>
        <button
          onClick={() => setCurrentIndex((i) => i + 1)}
          className="px-4 py-1.5 bg-gruvbox-orange text-gruvbox-bg text-sm rounded"
        >
          {isLast ? "Finish" : "Next problem"}
        </button>
        <HeaderAuth />
      </header>
      <Workspace
        slug={current.slug}
        problemSetId={problemSet.id}
        timeLimitSeconds={current.time_limit_seconds}
      />
    </div>
  );
}
