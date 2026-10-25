"use client";
import { useRef, useState } from "react";
import { HeaderAuth, useAuth } from "@/components/AuthProvider";
import { generateProblemSet } from "@/lib/api";
import type { ProblemSetMode } from "@/lib/api";
import { getMastery, saveProblemSet } from "@/lib/userClient";
import type { ProblemSet } from "@/lib/userClient";
import { Timer } from "@/components/Timer";
import Workspace from "@/components/Workspace";
import type { WorkspaceHandle } from "@/components/Workspace";

export default function ProblemSetPage() {
  const { isSignedIn, getToken } = useAuth();
  const [mode, setMode] = useState<ProblemSetMode>("drill");
  const [problemSet, setProblemSet] = useState<ProblemSet | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const workspace = useRef<WorkspaceHandle>(null);

  async function handleGenerate() {
    setLoading(true);
    setGenerateError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No auth token");
      // The tutor picks the problems; at-auth saves the set under the signed-in learner
      const generated = await generateProblemSet(mode, await getMastery(token));
      setProblemSet(await saveProblemSet(token, generated.mode, generated.problems));
      setCurrentIndex(0);
      setExpired(false);
    } catch (e: unknown) {
      setGenerateError(e instanceof Error ? e.message : "Failed to generate problem set");
    } finally {
      setLoading(false);
    }
  }

  // Time's up: grade whatever is in the editor now, instead of recording a made-up failure
  function handleExpire() {
    setExpired(true);
    workspace.current?.submit();
  }

  function handleNext() {
    setCurrentIndex((i) => i + 1);
    setExpired(false);
  }

  if (!isSignedIn) {
    return <div className="p-8 text-[#3c3836]">Please log in to use problem sets.</div>;
  }

  if (problemSet && currentIndex >= problemSet.problems.length) {
    return (
      <div className="p-8 text-[#3c3836]">
        <h1 className="text-2xl font-bold mb-4">Problem set complete!</h1>
        <button
          onClick={() => setProblemSet(null)}
          className="px-4 py-2 bg-[#458588] text-white rounded"
        >
          Generate another
        </button>
      </div>
    );
  }

  if (!problemSet) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6 text-[#3c3836]">AI Problem Set</h1>
        <div className="flex gap-4 mb-6">
          {(["drill", "interview_sim"] as ProblemSetMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded ${mode === m ? "bg-[#458588] text-white" : "bg-[#ebdbb2] text-[#3c3836]"}`}
            >
              {m === "drill" ? "Drill Weaknesses" : "Interview Simulation"}
            </button>
          ))}
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-6 py-3 bg-[#98971a] text-white rounded font-semibold disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Problem Set"}
        </button>
        {generateError && (
          <p className="mt-3 text-sm text-red-500">{generateError}</p>
        )}
      </div>
    );
  }

  const current = problemSet.problems[currentIndex];
  const isLast = currentIndex + 1 === problemSet.problems.length;
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-4 border-b border-gruvbox-gray-light px-6 py-3">
        <span className="text-[#7c6f64]">
          Problem {currentIndex + 1} of {problemSet.problems.length}
        </span>
        <span className="font-medium text-[#3c3836]">{current.title} · {current.difficulty}</span>
        <div className="rounded bg-[#282828] px-3 py-1">
          <Timer key={currentIndex} seconds={current.time_limit_seconds} onExpire={handleExpire} />
        </div>
        {expired && <span className="text-sm text-gruvbox-red">Time&apos;s up. Your code was submitted.</span>}
        <button onClick={handleNext} className="px-4 py-1.5 bg-[#458588] text-white text-sm rounded">
          {isLast ? "Finish" : "Next problem"}
        </button>
        <HeaderAuth />
      </header>
      <Workspace ref={workspace} slug={current.slug} problemSetId={problemSet.id} />
    </div>
  );
}
