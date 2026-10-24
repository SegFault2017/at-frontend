"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Problem } from "@/lib/api";

interface ProblemPanelProps {
  problem: Problem | null;
  hints: string[];
  streamingHint?: string;
  review: string | null;
  isLoading: boolean;
  error: string | null;
}

const difficultyColor: Record<string, string> = {
  Easy: "bg-gruvbox-green/20 text-gruvbox-green",
  Medium: "bg-gruvbox-yellow/20 text-gruvbox-yellow",
  Hard: "bg-gruvbox-red/20 text-gruvbox-red",
};

export default function ProblemPanel({
  problem,
  hints,
  streamingHint,
  review,
  isLoading,
  error,
}: ProblemPanelProps) {
  const [activeTab, setActiveTab] = useState<"problem" | "examples">("problem");
  const [hintIndex, setHintIndex] = useState(0);

  // Clamp hintIndex to valid range inline (avoids setState-in-effect lint rule)
  const safeHintIndex = hints.length > 0 ? Math.min(hintIndex, hints.length - 1) : 0;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="flex items-center gap-2 text-gruvbox-yellow">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gruvbox-yellow border-t-transparent" />
          Loading problem...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-gruvbox-red/30 bg-gruvbox-red/10 p-4">
          <p className="text-gruvbox-red">{error}</p>
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center text-gruvbox-gray">
          <p className="text-lg">No problem loaded</p>
          <p className="mt-1 text-sm">
            Search the problem list above
          </p>
        </div>
      </div>
    );
  }

  // Extract clean description (first paragraph before examples)
  const cleanDescription = extractProblemStatement(problem.description);

  // Hint navigation
  const isStreaming = !!streamingHint;
  const totalHints = hints.length + (isStreaming ? 1 : 0);
  const displayIndex = isStreaming ? hints.length : safeHintIndex;
  const currentHint = isStreaming ? streamingHint : hints[safeHintIndex];

  const canGoPrev = !isStreaming && safeHintIndex > 0;
  const canGoNext = !isStreaming && safeHintIndex < hints.length - 1;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gruvbox-gray-light p-4">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-bold text-gruvbox-fg">{problem.title}</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${difficultyColor[problem.difficulty] || ""}`}
          >
            {problem.difficulty}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gruvbox-gray-light">
        <button
          onClick={() => setActiveTab("problem")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "problem"
              ? "border-b-2 border-gruvbox-orange text-gruvbox-orange"
              : "text-gruvbox-gray hover:text-gruvbox-fg"
          }`}
        >
          Problem
        </button>
        <button
          onClick={() => setActiveTab("examples")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "examples"
              ? "border-b-2 border-gruvbox-orange text-gruvbox-orange"
              : "text-gruvbox-gray hover:text-gruvbox-fg"
          }`}
        >
          Examples
          {problem.examples.length > 0 && (
            <span className="ml-1.5 rounded-full bg-gruvbox-gray-light px-1.5 py-0.5 text-xs">
              {problem.examples.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "problem" ? (
          <div className="space-y-4">
            {/* Description */}
            <section>
              <h3 className="mb-2 text-sm font-medium text-gruvbox-gray">
                Description
              </h3>
              <div className="prose prose-sm max-w-none rounded-lg bg-white p-4 text-gruvbox-fg shadow-sm">
                <ReactMarkdown>{cleanDescription}</ReactMarkdown>
              </div>
            </section>

            {/* Constraints */}
            {problem.constraints.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-medium text-gruvbox-gray">
                  Constraints
                </h3>
                <ul className="space-y-1 rounded-lg bg-white p-4 shadow-sm">
                  {problem.constraints.map((constraint, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-gruvbox-fg"
                    >
                      <span className="text-gruvbox-purple">•</span>
                      <code className="font-mono text-xs">{decodeHtmlEntities(constraint)}</code>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {problem.examples.length > 0 ? (
              problem.examples.map((example, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-white p-4 shadow-sm"
                >
                  <div className="mb-2 text-sm font-medium text-gruvbox-fg">
                    Example {i + 1}
                  </div>
                  <div className="space-y-2 font-mono text-xs">
                    {example.input && (
                      <div className="flex gap-2">
                        <span className="text-gruvbox-gray">Input:</span>
                        <code className="rounded bg-gruvbox-bg-soft px-1.5 py-0.5 text-gruvbox-blue">
                          {decodeHtmlEntities(example.input)}
                        </code>
                      </div>
                    )}
                    {example.output && (
                      <div className="flex gap-2">
                        <span className="text-gruvbox-gray">Output:</span>
                        <code className="rounded bg-gruvbox-bg-soft px-1.5 py-0.5 text-gruvbox-green">
                          {decodeHtmlEntities(example.output)}
                        </code>
                      </div>
                    )}
                    {example.explanation && (
                      <div className="mt-2 border-t border-gruvbox-gray-light pt-2 font-sans text-xs text-gruvbox-gray">
                        <ReactMarkdown>{decodeHtmlEntities(example.explanation)}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gruvbox-gray">No examples available</p>
            )}
          </div>
        )}
      </div>

      {/* Hint (fixed at bottom, scrollable if too long) */}
      {(currentHint || review) && (
        <div className="border-t border-gruvbox-gray-light p-4">
          {currentHint && (
            <div className="rounded-lg border border-gruvbox-yellow/30 bg-gruvbox-yellow/10">
              {/* Hint header with navigation */}
              <div className="flex items-center justify-between border-b border-gruvbox-yellow/20 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gruvbox-yellow">
                    Hint {displayIndex + 1}
                    {totalHints > 1 && (
                      <span className="text-gruvbox-yellow/60"> / {totalHints}</span>
                    )}
                  </span>
                  {isStreaming && (
                    <span className="h-2 w-2 animate-pulse rounded-full bg-gruvbox-yellow" />
                  )}
                </div>
                {/* Navigation buttons */}
                {hints.length > 1 && !isStreaming && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setHintIndex((i) => i - 1)}
                      disabled={!canGoPrev}
                      className="rounded p-1 text-gruvbox-yellow hover:bg-gruvbox-yellow/20 disabled:opacity-30 disabled:hover:bg-transparent"
                      aria-label="Previous hint"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setHintIndex((i) => i + 1)}
                      disabled={!canGoNext}
                      className="rounded p-1 text-gruvbox-yellow hover:bg-gruvbox-yellow/20 disabled:opacity-30 disabled:hover:bg-transparent"
                      aria-label="Next hint"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              {/* Hint content */}
              <div className="max-h-32 overflow-y-auto p-3">
                <div className="prose prose-sm max-w-none text-gruvbox-fg">
                  <ReactMarkdown>{currentHint}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {review && (
            <div className={`rounded-lg border border-gruvbox-aqua/30 bg-gruvbox-aqua/10 ${currentHint ? "mt-3" : ""}`}>
              <div className="border-b border-gruvbox-aqua/20 px-3 py-2">
                <span className="text-xs font-medium text-gruvbox-aqua">Review</span>
              </div>
              <div className="max-h-32 overflow-y-auto p-3">
                <div className="prose prose-sm max-w-none text-gruvbox-fg">
                  <ReactMarkdown>{review}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Extract just the problem statement from the full description.
 * Removes examples and constraints sections.
 */
function extractProblemStatement(description: string): string {
  // Split by common section markers
  const lines = description.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Stop at examples or constraints
    if (
      trimmed.toLowerCase().startsWith("example") ||
      trimmed.toLowerCase().startsWith("constraints") ||
      trimmed.match(/^example\s*\d/i)
    ) {
      break;
    }
    result.push(line);
  }

  return decodeHtmlEntities(result.join("\n").trim() || description.split("\n")[0] || description);
}

/**
 * Decode HTML entities and convert to proper unicode symbols.
 */
function decodeHtmlEntities(text: string): string {
  return text
    // HTML entities
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&le;/g, "≤")
    .replace(/&ge;/g, "≥")
    .replace(/&ne;/g, "≠")
    .replace(/&times;/g, "×")
    .replace(/&divide;/g, "÷")
    .replace(/&plusmn;/g, "±")
    .replace(/&sup2;/g, "²")
    .replace(/&sup3;/g, "³")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    // Math symbols
    .replace(/<=/g, "≤")
    .replace(/>=/g, "≥")
    .replace(/!=/g, "≠")
    .replace(/\*\*/g, "^") // ** to ^ for exponents
    // Superscript numbers (10^4 → 10⁴)
    .replace(/\^0/g, "⁰")
    .replace(/\^1/g, "¹")
    .replace(/\^2/g, "²")
    .replace(/\^3/g, "³")
    .replace(/\^4/g, "⁴")
    .replace(/\^5/g, "⁵")
    .replace(/\^6/g, "⁶")
    .replace(/\^7/g, "⁷")
    .replace(/\^8/g, "⁸")
    .replace(/\^9/g, "⁹")
    // Common patterns like 10^9, 10^4
    .replace(/10⁴/g, "10⁴")
    .replace(/10⁹/g, "10⁹")
    // Infinity
    .replace(/\binfinity\b/gi, "∞")
    // Plus minus
    .replace(/\+\/-/g, "±");
}
