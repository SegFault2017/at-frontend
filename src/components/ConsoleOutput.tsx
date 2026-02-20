"use client";

import { useState } from "react";
import type { TestCase } from "@/lib/api";

interface ConsoleOutputProps {
  output: string;
  isRunning: boolean;
  testCases: TestCase[];
  onAddTestCase: (input: string, expected: string) => void;
  onDeleteTestCase: (id: string) => void;
}

export default function ConsoleOutput({
  output,
  isRunning,
  testCases,
  onAddTestCase,
  onDeleteTestCase,
}: ConsoleOutputProps) {
  const [activeTab, setActiveTab] = useState<"testcases" | "output">("testcases");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newInput, setNewInput] = useState("");
  const [newExpected, setNewExpected] = useState("");

  const handleAdd = () => {
    if (newInput.trim() && newExpected.trim()) {
      onAddTestCase(newInput.trim(), newExpected.trim());
      setNewInput("");
      setNewExpected("");
      setShowAddForm(false);
    }
  };

  const hasResults = testCases.some((tc) => tc.status !== "pending");

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-gruvbox-gray">
        <button
          onClick={() => setActiveTab("testcases")}
          className={`px-4 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "testcases"
              ? "border-b-2 border-gruvbox-orange text-gruvbox-orange"
              : "text-gruvbox-gray hover:text-gruvbox-fg"
          }`}
        >
          Test Cases
          {testCases.length > 0 && (
            <span className="ml-1.5 rounded-full bg-gruvbox-gray-light px-1.5 py-0.5 text-[10px]">
              {testCases.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("output")}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "output"
              ? "border-b-2 border-gruvbox-orange text-gruvbox-orange"
              : "text-gruvbox-gray hover:text-gruvbox-fg"
          }`}
        >
          Output
          {isRunning && (
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-gruvbox-yellow" />
          )}
        </button>
      </div>

      {/* Test Cases tab */}
      {activeTab === "testcases" && (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-gruvbox-gray px-3 py-1.5">
            <span className="text-xs text-gruvbox-gray">
              {testCases.length} test case{testCases.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="rounded px-2 py-0.5 text-xs font-medium text-gruvbox-green hover:bg-gruvbox-green/20"
            >
              {showAddForm ? "Cancel" : "+ Add"}
            </button>
          </div>

          {showAddForm && (
            <div className="border-b border-gruvbox-gray bg-gruvbox-bg-dark p-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newInput}
                  onChange={(e) => setNewInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="Input: nums = [2,7], target = 9"
                  className="flex-1 rounded border border-gruvbox-gray bg-gruvbox-bg px-2 py-1 font-mono text-xs text-gruvbox-fg placeholder-gruvbox-gray focus:border-gruvbox-orange focus:outline-none"
                />
                <input
                  type="text"
                  value={newExpected}
                  onChange={(e) => setNewExpected(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="Expected: [0,1]"
                  className="w-32 rounded border border-gruvbox-gray bg-gruvbox-bg px-2 py-1 font-mono text-xs text-gruvbox-fg placeholder-gruvbox-gray focus:border-gruvbox-orange focus:outline-none"
                />
                <button
                  onClick={handleAdd}
                  disabled={!newInput.trim() || !newExpected.trim()}
                  className="rounded bg-gruvbox-green px-3 py-1 text-xs font-medium text-gruvbox-bg hover:opacity-90 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {testCases.length > 0 ? (
              <div className="divide-y divide-gruvbox-gray">
                {testCases.map((tc, i) => (
                  <div key={tc.id} className="flex items-center justify-between px-3 py-1.5">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded bg-gruvbox-gray/20 text-[10px] text-gruvbox-fg-light">
                        {i + 1}
                      </span>
                      <span className="truncate font-mono text-xs text-gruvbox-fg-light">
                        {tc.input}
                      </span>
                      <span className="flex-shrink-0 text-gruvbox-gray">→</span>
                      <span className="truncate font-mono text-xs text-gruvbox-green">
                        {tc.expected}
                      </span>
                    </div>
                    {tc.isCustom && (
                      <button
                        onClick={() => onDeleteTestCase(tc.id)}
                        className="ml-1 flex-shrink-0 rounded p-0.5 text-gruvbox-gray hover:bg-gruvbox-red/20 hover:text-gruvbox-red"
                        aria-label="Delete test case"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-3">
                <p className="text-xs text-gruvbox-gray">Load a problem to see test cases</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Output tab */}
      {activeTab === "output" && (
        <div className="flex-1 overflow-y-auto">
          {hasResults ? (
            <div className="divide-y divide-gruvbox-gray">
              {testCases.map((tc, i) => (
                <div
                  key={tc.id}
                  className={`px-3 py-1.5 ${
                    tc.status === "running"
                      ? "bg-gruvbox-yellow/10"
                      : tc.passed === true
                      ? "bg-gruvbox-green/10"
                      : tc.passed === false
                      ? "bg-gruvbox-red/10"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-xs font-medium ${
                        tc.status === "running"
                          ? "bg-gruvbox-yellow/30 text-gruvbox-yellow"
                          : tc.passed === true
                          ? "bg-gruvbox-green/30 text-gruvbox-green"
                          : tc.passed === false
                          ? "bg-gruvbox-red/30 text-gruvbox-red"
                          : "bg-gruvbox-gray/30 text-gruvbox-fg-light"
                      }`}
                    >
                      {tc.status === "running" ? (
                        <span className="animate-pulse">⏳</span>
                      ) : tc.passed === true ? (
                        "✓"
                      ) : tc.passed === false ? (
                        "✗"
                      ) : (
                        <span className="text-[10px]">{i + 1}</span>
                      )}
                    </span>
                    <span className="font-mono text-xs text-gruvbox-fg-light">
                      {tc.actual !== undefined ? tc.actual : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : output ? (
            <div className="p-3">
              <pre className="whitespace-pre-wrap font-mono text-xs text-gruvbox-fg-light">
                {output}
              </pre>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-3">
              <p className="text-xs text-gruvbox-gray">Run tests to see output</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
