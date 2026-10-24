"use client";
import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { generateProblemSet, saveSession } from "@/lib/userClient";
import type { ProblemEntry, ProblemSet, SessionPayload } from "@/lib/userClient";
import { Timer } from "@/components/Timer";

type Mode = "drill" | "interview_sim";

export default function ProblemSetPage() {
  const { isSignedIn, getToken, userId } = useAuth();
  const [mode, setMode] = useState<Mode>("drill");
  const [problemSet, setProblemSet] = useState<ProblemSet | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  // useRef avoids re-creating handleExpireOrSubmit on every sessionStart update
  const sessionStartRef = useRef<Date>(new Date());

  async function handleGenerate() {
    if (!isSignedIn || !userId) return;
    setLoading(true);
    setGenerateError(null);
    try {
      const token = await getToken();
      if (!token) return;
      const ps = await generateProblemSet(token, userId, mode);
      sessionStartRef.current = new Date();
      setProblemSet(ps);
      setCurrentIndex(0);
      setCompleted(false);
    } catch (e: unknown) {
      setGenerateError(e instanceof Error ? e.message : "Failed to generate problem set");
    } finally {
      setLoading(false);
    }
  }

  const handleExpireOrSubmit = useCallback(async () => {
    if (!problemSet || !isSignedIn) return;
    const token = await getToken();
    if (!token) return;
    const current: ProblemEntry = problemSet.problems[currentIndex];
    const payload: SessionPayload = {
      slug: current.slug,
      mode: "problem_set",
      topic_tags: [],
      problem_set_id: problemSet.id,
      started_at: sessionStartRef.current.toISOString(),
      completed_at: new Date().toISOString(),
      time_taken_seconds: Math.floor((Date.now() - sessionStartRef.current.getTime()) / 1000),
      hints_used: 0,
      hint_level_reached: 0,
      attempts: 1,
      passed_core_tests: false,
      confidence: 3,
    };
    saveSession(token, payload).catch(console.error);

    if (currentIndex + 1 < problemSet.problems.length) {
      sessionStartRef.current = new Date();
      setCurrentIndex((i) => i + 1);
    } else {
      setCompleted(true);
    }
  }, [problemSet, currentIndex, isSignedIn, getToken]);

  if (!isSignedIn) {
    return <div className="p-8 text-[#3c3836]">Please log in to use problem sets.</div>;
  }

  if (completed) {
    return (
      <div className="p-8 text-[#3c3836]">
        <h1 className="text-2xl font-bold mb-4">Problem set complete!</h1>
        <button
          onClick={() => { setProblemSet(null); setCompleted(false); }}
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
          {(["drill", "interview_sim"] as Mode[]).map((m) => (
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
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[#7c6f64]">
          Problem {currentIndex + 1} of {problemSet.problems.length}
        </span>
        <Timer
          key={currentIndex}
          seconds={current.time_limit_seconds}
          onExpire={handleExpireOrSubmit}
        />
      </div>
      <h2 className="text-xl font-bold text-[#3c3836] mb-4">{current.slug}</h2>
      <button
        onClick={handleExpireOrSubmit}
        className="px-4 py-2 bg-[#458588] text-white rounded"
      >
        Submit &amp; Next
      </button>
    </div>
  );
}
